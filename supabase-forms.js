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

  function value(id) {
    return document.getElementById(id)?.value?.trim() || null;
  }

  function selectedCheckText(container) {
    if (!container) return [];

    return Array.from(container.querySelectorAll(".check-pill input:checked"))
      .map((input) => input.nextElementSibling?.textContent?.trim())
      .filter(Boolean);
  }

  function showMessage(id, text, isError) {
    const message = document.getElementById(id);
    if (!message) return;

    message.textContent = text;
    message.style.display = "inline";
    message.style.color = isError ? "#b42318" : "";
  }

  function setBusy(form, busy) {
    const button = form.querySelector("button[type='submit']");
    if (!button) return;

    button.disabled = busy;
    button.style.opacity = busy ? "0.7" : "";
    button.style.cursor = busy ? "wait" : "";
  }

  function requireClient() {
    if (supabaseClient) return true;
    showMessage("formMessage", "Supabase URL \u3068 anon key \u3092\u8a2d\u5b9a\u3057\u3066\u304f\u3060\u3055\u3044\u3002", true);
    return false;
  }

  async function saveSeeker(event) {
    event.preventDefault();

    if (!requireClient()) return;

    const password = value("password") || "";
    const passwordConfirm = value("passwordConfirm") || "";

    if (password.length < 8) {
      showMessage("formMessage", "\u30d1\u30b9\u30ef\u30fc\u30c9\u306f8\u6587\u5b57\u4ee5\u4e0a\u3067\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002", true);
      return;
    }

    if (password !== passwordConfirm) {
      showMessage("formMessage", "\u30d1\u30b9\u30ef\u30fc\u30c9\u3068\u78ba\u8a8d\u7528\u30d1\u30b9\u30ef\u30fc\u30c9\u304c\u4e00\u81f4\u3057\u307e\u305b\u3093\u3002", true);
      return;
    }

    const form = event.currentTarget;
    setBusy(form, true);

    const email = value("email");
    const name = [value("lastName"), value("firstName")].filter(Boolean).join(" ") || value("name");

    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: "seeker",
          name
        }
      }
    });

    if (authError) {
      setBusy(form, false);
      console.error(authError);
      showMessage("formMessage", authError.message || "\u30a2\u30ab\u30a6\u30f3\u30c8\u767b\u9332\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002", true);
      return;
    }

    const payload = {
      user_id: authData.user?.id || null,
      name,
      email,
      birth_date: value("birth"),
      phone: value("phone"),
      license: value("license"),
      experience_years: value("years"),
      preferred_area: value("area"),
      preferred_style: value("style"),
      skills: selectedCheckText(document.getElementById("skillGrid")),
      pr: value("pr"),
      source_path: window.location.pathname
    };

    const { error: profileError } = await supabaseClient.from("seeker_profiles").insert(payload);
    setBusy(form, false);

    if (profileError) {
      console.error(profileError);
      showMessage("formMessage", "\u30a2\u30ab\u30a6\u30f3\u30c8\u306f\u4f5c\u6210\u3055\u308c\u307e\u3057\u305f\u304c\u3001\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb\u4fdd\u5b58\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002", true);
      return;
    }

    showMessage("formMessage", "\u767b\u9332\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002\u30ed\u30b0\u30a4\u30f3\u753b\u9762\u3078\u79fb\u52d5\u3057\u307e\u3059\u3002", false);
    setTimeout(function () {
      window.location.href = "login.html?role=seeker&registered=1";
    }, 900);
  }

  async function saveEmployer(event) {
    event.preventDefault();

    if (!requireClient()) return;

    const form = event.currentTarget;
    setBusy(form, true);

    const payload = {
      contact_name: value("name"),
      position: value("position"),
      facility_name: value("facilityName"),
      facility_type: value("facilityType"),
      staff_need: value("staffNeed"),
      phone: value("phone"),
      email: value("email"),
      address: value("address"),
      recruit_styles: selectedCheckText(form),
      note: value("note"),
      source_path: window.location.pathname
    };

    const { error } = await supabaseClient.from("employer_profiles").insert(payload);
    setBusy(form, false);

    if (error) {
      console.error(error);
      showMessage("formMessage", "\u767b\u9332\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f\u3002Supabase\u8a2d\u5b9a\u3068\u30c6\u30fc\u30d6\u30eb\u3092\u78ba\u8a8d\u3057\u3066\u304f\u3060\u3055\u3044\u3002", true);
      return;
    }

    showMessage("formMessage", "\u767b\u9332\u5185\u5bb9\u3092Supabase\u306b\u4fdd\u5b58\u3057\u307e\u3057\u305f\u3002", false);
    form.reset();
  }

  async function saveSearch(form) {
    if (!supabaseClient || !form) return;

    const payload = {
      profession: Array.from(form.querySelectorAll('input[name="jobType"]:checked')).map((input) => input.value),
      location: Array.from(form.querySelectorAll('input[name="location"]:checked')).map((input) => input.value),
      work_date: form.querySelector("select")?.value || null,
      source_path: window.location.pathname
    };

    await supabaseClient.from("job_searches").insert(payload);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const seekerForm = document.getElementById("profileForm");
    const employerForm = document.getElementById("employerForm");
    const searchButton = document.querySelector(".search-panel .btn-search");

    if (seekerForm) seekerForm.addEventListener("submit", saveSeeker);
    if (employerForm) employerForm.addEventListener("submit", saveEmployer);
    if (searchButton) {
      searchButton.addEventListener("click", function (event) {
        saveSearch(event.currentTarget.closest(".search-panel"));
      });
    }
  });
})();
