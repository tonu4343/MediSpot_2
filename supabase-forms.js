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

  async function saveSeeker(event) {
    event.preventDefault();

    if (!supabaseClient) {
      showMessage("formMessage", "Supabase URL と anon key を設定してください。", true);
      return;
    }

    const form = event.currentTarget;
    setBusy(form, true);

    const payload = {
      name: value("name"),
      email: value("email"),
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

    const { error } = await supabaseClient.from("seeker_profiles").insert(payload);
    setBusy(form, false);

    if (error) {
      console.error(error);
      showMessage("formMessage", "登録できませんでした。Supabase設定とテーブルを確認してください。", true);
      return;
    }

    showMessage("formMessage", "登録内容をSupabaseに保存しました。", false);
    form.reset();
  }

  async function saveEmployer(event) {
    event.preventDefault();

    if (!supabaseClient) {
      showMessage("formMessage", "Supabase URL と anon key を設定してください。", true);
      return;
    }

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
      showMessage("formMessage", "登録できませんでした。Supabase設定とテーブルを確認してください。", true);
      return;
    }

    showMessage("formMessage", "登録内容をSupabaseに保存しました。", false);
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
