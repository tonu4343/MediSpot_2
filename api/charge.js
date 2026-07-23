// Vercel serverless function: charges a hire_invoices row via pay.jp.
// Never trusts the client for the amount or the employer's identity —
// both are re-derived server-side on every request.
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, message: "Method not allowed" });
    return;
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, PAYJP_SECRET_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !PAYJP_SECRET_KEY) {
    res.status(500).json({ success: false, message: "サーバー設定が不足しています。管理者にお問い合わせください。" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (error) { body = {}; }
  }
  const invoiceId = body && body.invoiceId;
  const cardToken = body && body.cardToken;
  if (!invoiceId || !cardToken) {
    res.status(400).json({ success: false, message: "invoiceId と cardToken が必要です。" });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!accessToken) {
    res.status(401).json({ success: false, message: "認証情報がありません。再度ログインしてください。" });
    return;
  }

  // 1) Verify the caller's identity via their own Supabase session token.
  const userResponse = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { Authorization: "Bearer " + accessToken, apikey: SUPABASE_ANON_KEY }
  });
  if (!userResponse.ok) {
    res.status(401).json({ success: false, message: "セッションが無効です。再度ログインしてください。" });
    return;
  }
  const user = await userResponse.json();
  const employerId = user && user.id;
  if (!employerId) {
    res.status(401).json({ success: false, message: "セッションが無効です。再度ログインしてください。" });
    return;
  }

  const serviceHeaders = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
    "Content-Type": "application/json"
  };

  // 2) Fetch the invoice server-side (service role bypasses RLS) and confirm ownership.
  const invoiceResponse = await fetch(
    SUPABASE_URL + "/rest/v1/hire_invoices?id=eq." + encodeURIComponent(invoiceId) + "&select=id,employer_id,total_amount,payment_status",
    { headers: serviceHeaders }
  );
  if (!invoiceResponse.ok) {
    res.status(500).json({ success: false, message: "請求情報を取得できませんでした。" });
    return;
  }
  const invoices = await invoiceResponse.json();
  const invoice = invoices && invoices[0];
  if (!invoice) {
    res.status(404).json({ success: false, message: "請求が見つかりません。" });
    return;
  }
  if (invoice.employer_id !== employerId) {
    res.status(403).json({ success: false, message: "この請求を操作する権限がありません。" });
    return;
  }
  if (invoice.payment_status !== "未払い" && invoice.payment_status !== "決済エラー") {
    res.status(409).json({ success: false, message: "この請求はすでに処理済み、または処理中です。" });
    return;
  }

  // 3) Conditionally flip to 決済処理中 only if it is still in the status we just
  // read — the guard against two concurrent charge attempts on the same invoice.
  const lockResponse = await fetch(
    SUPABASE_URL + "/rest/v1/hire_invoices?id=eq." + encodeURIComponent(invoiceId) + "&payment_status=eq." + encodeURIComponent(invoice.payment_status),
    { method: "PATCH", headers: Object.assign({}, serviceHeaders, { Prefer: "return=representation" }), body: JSON.stringify({ payment_status: "決済処理中" }) }
  );
  const lockedRows = lockResponse.ok ? await lockResponse.json() : [];
  if (!lockedRows.length) {
    res.status(409).json({ success: false, message: "この請求はすでに処理が開始されています。" });
    return;
  }

  // 4) Charge pay.jp for exactly the amount stored on the invoice.
  // pay.jp has no documented idempotency-key support (unlike Stripe), so a
  // retry of this whole request is a brand new charge attempt as far as
  // pay.jp is concerned. The one thing standing between that and a real
  // duplicate charge is knowing FOR CERTAIN whether the first attempt's
  // charge call actually failed, versus merely never telling us the
  // answer (network drop / timeout talking to pay.jp). Only a confirmed
  // rejection from pay.jp itself is allowed to unlock the invoice
  // (payment_status back to 決済エラー) for a safe retry; anything
  // ambiguous leaves it locked at 決済処理中 from step 3.
  let chargeResult;
  let confirmedRejection = false;
  try {
    const chargeResponse = await fetch("https://api.pay.jp/v1/charges", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(PAYJP_SECRET_KEY + ":").toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        amount: String(invoice.total_amount),
        currency: "jpy",
        card: cardToken,
        description: "Medi Job 成功報酬 (invoice " + invoice.id + ")",
        "metadata[invoice_id]": String(invoice.id)
      }).toString()
    });
    chargeResult = await chargeResponse.json();
    if (!chargeResponse.ok || !chargeResult || chargeResult.paid !== true) {
      // pay.jp answered clearly: this charge did not go through.
      confirmedRejection = true;
      throw new Error((chargeResult && chargeResult.error && chargeResult.error.message) || "決済に失敗しました。");
    }
  } catch (error) {
    if (confirmedRejection) {
      await fetch(SUPABASE_URL + "/rest/v1/hire_invoices?id=eq." + encodeURIComponent(invoiceId), {
        method: "PATCH",
        headers: serviceHeaders,
        body: JSON.stringify({ payment_status: "決済エラー" })
      });
      res.status(402).json({ success: false, retryable: true, message: error.message || "決済に失敗しました。" });
      return;
    }

    // We asked pay.jp to charge the card but never got a definitive
    // answer back (network/timeout failure talking to pay.jp, or an
    // unparsable response) - the card may or may not have been charged.
    // Leave the invoice locked at 決済処理中 instead of reverting to
    // 決済エラー, so it can't be immediately retried into a real
    // duplicate charge. This needs a human to check pay.jp's dashboard
    // (metadata.invoice_id above) and reconcile manually.
    console.error(
      "Unknown pay.jp charge outcome for invoice " + invoiceId +
      " - leaving locked at 決済処理中 for manual review.",
      error
    );
    res.status(202).json({
      success: false,
      retryable: false,
      message: "決済状況を確認できませんでした。安全のため今すぐの再決済はお控えください。しばらくしてから状態をご確認いただくか、サポートまでお問い合わせください。"
    });
    return;
  }

  // 5) Mark paid and record the pay.jp charge id for admin reconciliation/refunds.
  // The pay.jp charge already succeeded at this point (the card was charged),
  // so a failure here must NOT be reported to the client as a failed payment
  // (that would invite a duplicate charge attempt) - but it also must not be
  // silently swallowed, or the invoice is stuck at 決済処理中 forever with no
  // payjp_charge_id to reconcile against. Verify the write actually applied,
  // retry once, and if it still fails, say so honestly instead of claiming a
  // clean success.
  async function markPaid() {
    const markResponse = await fetch(SUPABASE_URL + "/rest/v1/hire_invoices?id=eq." + encodeURIComponent(invoiceId), {
      method: "PATCH",
      headers: Object.assign({}, serviceHeaders, { Prefer: "return=representation" }),
      body: JSON.stringify({ payment_status: "支払い済み", paid_at: new Date().toISOString(), payjp_charge_id: chargeResult.id })
    });
    const rows = markResponse.ok ? await markResponse.json() : [];
    return rows.length > 0;
  }

  let marked = false;
  for (let attempt = 0; attempt < 2 && !marked; attempt++) {
    try {
      marked = await markPaid();
    } catch (error) {
      console.error("markPaid threw for invoice " + invoiceId + " (payjp charge " + chargeResult.id + ")", error);
    }
  }

  if (!marked) {
    console.error(
      "payjp charge " + chargeResult.id + " succeeded for invoice " + invoiceId +
      " but hire_invoices could not be updated to 支払い済み - needs manual reconciliation."
    );
    res.status(200).json({
      success: true,
      message: "お支払いは完了しましたが、記録の更新に失敗しました。お手数ですがサポートまでお問い合わせください。"
    });
    return;
  }

  res.status(200).json({ success: true, message: "お支払いが完了しました。" });
};
