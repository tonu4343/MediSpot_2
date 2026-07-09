(function () {
  const config = window.MEDISPOT_SUPABASE || {};
  const configured =
    config.url &&
    config.anonKey &&
    !config.url.includes("YOUR_PROJECT_ID") &&
    !config.anonKey.includes("YOUR_SUPABASE_ANON_KEY");

  const supabaseClient =
    configured && window.supabase
      ? window.supabase.createClient(config.url, config.anonKey)
      : null;

  const tabs = document.querySelectorAll(".role-tab");
  const roleInput = document.querySelector("#roleInput");
  const submitBtn = document.querySelector(".submit-btn");
  const notice = document.querySelector("#notice");
  const form = document.querySelector("#loginForm");
  const params = new URLSearchParams(window.location.search);

  function showNotice(text, isError) {
    if (!notice) return;
    notice.textContent = text;
    notice.classList.add("show");
    notice.style.color = isError ? "#7c2d12" : "#007a52";
    notice.style.background = isError ? "#fff7ed" : "#ecfdf3";
    notice.style.borderColor = isError ? "#fed7aa" : "#bbf7d0";
  }

  function loginErrorMessage(error) {
    const rawMessage = error?.message || "";
    const message = rawMessage.toLowerCase();

    if (message.includes("email not confirmed") || message.includes("not confirmed")) {
      return "メール認証がまだ完了していません。Supabaseから届いた確認メールを開いてから、もう一度ログインしてください。";
    }

    if (message.includes("invalid login credentials") || message.includes("invalid credentials")) {
      return "メールアドレスまたはパスワードが違います。Supabase Authentication > Users にこのメールが登録されているか確認してください。";
    }

    return rawMessage
      ? "ログインできませんでした。（" + rawMessage + "）"
      : "ログインできませんでした。メールアドレスとパスワードを確認してください。";
  }

  function setRole(role) {
    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.role === role);
    });
    if (roleInput) roleInput.value = role;
    if (submitBtn) submitBtn.classList.toggle("employer", role === "employer");
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => setRole(tab.dataset.role)));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!supabaseClient) {
      showNotice("Supabase URL と anon key を設定してください。", true);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.7";
    submitBtn.style.cursor = "wait";

    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;
    const selectedRole = roleInput.value === "employer" ? "employer" : "seeker";
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = "";
      submitBtn.style.cursor = "";
      console.error(error);
      showNotice(loginErrorMessage(error), true);
      return;
    }

    const profileTable = selectedRole === "employer" ? "employer_profiles" : "seeker_profiles";
    const profileResult = await supabaseClient
      .from(profileTable)
      .select("id")
      .eq("user_id", data.user.id)
      .limit(1)
      .maybeSingle();

    submitBtn.disabled = false;
    submitBtn.style.opacity = "";
    submitBtn.style.cursor = "";

    if (profileResult.error || !profileResult.data) {
      await supabaseClient.auth.signOut();
      showNotice(
        selectedRole === "employer"
          ? "\u3053\u306e\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9\u306f\u6c42\u4eba\u8005\u30a2\u30ab\u30a6\u30f3\u30c8\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002\u6c42\u8077\u8005\u3068\u3057\u3066\u30ed\u30b0\u30a4\u30f3\u3057\u3066\u304f\u3060\u3055\u3044\u3002"
          : "\u3053\u306e\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9\u306f\u6c42\u8077\u8005\u30a2\u30ab\u30a6\u30f3\u30c8\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002\u6c42\u4eba\u8005\u3068\u3057\u3066\u30ed\u30b0\u30a4\u30f3\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
        true
      );
      return;
    }

    showNotice("\u30ed\u30b0\u30a4\u30f3\u3057\u307e\u3057\u305f\u3002\u30de\u30a4\u30da\u30fc\u30b8\u3078\u79fb\u52d5\u3057\u307e\u3059\u3002", false);
    setTimeout(function () {
      window.location.href = selectedRole === "seeker" ? "seeker-dashboard.html" : "employer-dashboard.html";
    }, 600);
  });

  setRole(params.get("role") === "employer" ? "employer" : "seeker");
  if (params.get("roleError") === "1") {
    showNotice("\u30a2\u30ab\u30a6\u30f3\u30c8\u7a2e\u5225\u304c\u9055\u3044\u307e\u3059\u3002\u6b63\u3057\u3044\u30ed\u30b0\u30a4\u30f3\u7a2e\u5225\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044\u3002", true);
  } else if (params.get("registered") === "1") {
    showNotice("\u767b\u9332\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002\u30e1\u30fc\u30eb\u8a8d\u8a3c\u304c\u5fc5\u8981\u306a\u5834\u5408\u306f\u3001\u78ba\u8a8d\u30e1\u30fc\u30eb\u3092\u958b\u3044\u3066\u304b\u3089\u30ed\u30b0\u30a4\u30f3\u3057\u3066\u304f\u3060\u3055\u3044\u3002", false);
  }
})();
