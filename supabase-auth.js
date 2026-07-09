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

  function setRole(role) {
    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.role === role);
    });
    roleInput.value = role;
    submitBtn.classList.toggle("employer", role === "employer");
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => setRole(tab.dataset.role)));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!supabaseClient) {
      showNotice("Supabase URL \u3068 anon key \u3092\u8a2d\u5b9a\u3057\u3066\u304f\u3060\u3055\u3044\u3002", true);
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
      showNotice("\u30ed\u30b0\u30a4\u30f3\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9\u3068\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002", true);
      return;
    }

    showNotice("\u30ed\u30b0\u30a4\u30f3\u3057\u307e\u3057\u305f\u3002\u30e1\u30a4\u30f3\u30da\u30fc\u30b8\u3078\u79fb\u52d5\u3057\u307e\u3059\u3002", false);
    setTimeout(function () {
      window.location.href = "index.html";
    }, 600);
  });

  setRole(params.get("role") === "employer" ? "employer" : "seeker");
  if (params.get("registered") === "1") {
    showNotice("\u767b\u9332\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002\u30ed\u30b0\u30a4\u30f3\u3057\u3066\u304f\u3060\u3055\u3044\u3002", false);
  }
})();
