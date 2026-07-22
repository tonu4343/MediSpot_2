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
  let chargeResult;
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
        description: "Medi Job 成功報酬 (invoice " + invoice.id + ")"
      }).toString()
    });
    chargeResult = await chargeResponse.json();
    if (!chargeResponse.ok || !chargeResult || chargeResult.paid !== true) {
      throw new Error((chargeResult && chargeResult.error && chargeResult.error.message) || "決済に失敗しました。");
    }
  } catch (error) {
    await fetch(SUPABASE_URL + "/rest/v1/hire_invoices?id=eq." + encodeURIComponent(invoiceId), {
      method: "PATCH",
      headers: serviceHeaders,
      body: JSON.stringify({ payment_status: "決済エラー" })
    });
    res.status(402).json({ success: false, message: error.message || "決済に失敗しました。" });
    return;
  }

  // 5) Mark paid and record the pay.jp charge id for admin reconciliation/refunds.
  await fetch(SUPABASE_URL + "/rest/v1/hire_invoices?id=eq." + encodeURIComponent(invoiceId), {
    method: "PATCH",
    headers: serviceHeaders,
    body: JSON.stringify({ payment_status: "支払い済み", paid_at: new Date().toISOString(), payjp_charge_id: chargeResult.id })
  });

  res.status(200).json({ success: true, message: "お支払いが完了しました。" });
};
