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
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    submitBtn.disabled = false;
    submitBtn.style.opacity = "";
    submitBtn.style.cursor = "";

    if (error) {
      console.error(error);
      showNotice(loginErrorMessage(error), true);
      return;
    }

    showNotice("ログインしました。マイページへ移動します。", false);
    setTimeout(function () {
      window.location.href = roleInput.value === "seeker" ? "seeker-dashboard.html" : "index.html";
    }, 600);
  });

  setRole(params.get("role") === "employer" ? "employer" : "seeker");
  if (params.get("registered") === "1") {
    showNotice("登録が完了しました。メール認証が必要な場合は、確認メールを開いてからログインしてください。", false);
  }
})();
