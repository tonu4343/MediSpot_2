const MEDISPOT_KEYS = {
  jobs: "medispot_mock_jobs",
  applications: "medispot_mock_applications",
  profile: "medispot_mock_seeker_profile"
};

const seedJobs = [
  {
    id: "job-1",
    title: "健診スポット看護師",
    profession: "看護師",
    location: "東京都",
    workStyle: "スポット",
    salary: "日給 20,000円",
    date: "7月10日 9:00〜17:00",
    employer: "新宿メディカルクリニック",
    description: "採血、問診、健診補助を担当します。ブランクがある方も相談できます。"
  },
  {
    id: "job-2",
    title: "臨床検査技師 エコー補助",
    profession: "臨床検査技師",
    location: "神奈川県",
    workStyle: "業務委託",
    salary: "時給 2,600円",
    date: "毎週土曜 8:30〜13:00",
    employer: "横浜健診センター",
    description: "検査補助、検体管理、結果入力をお願いします。"
  },
  {
    id: "job-3",
    title: "デイサービス看護業務",
    profession: "看護師",
    location: "大阪府",
    workStyle: "非常勤",
    salary: "時給 1,900円",
    date: "平日 10:00〜16:00",
    employer: "梅田ケアステーション",
    description: "バイタル確認、服薬管理、利用者対応を行います。"
  }
];

function readStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (error) {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureJobs() {
  const jobs = readStore(MEDISPOT_KEYS.jobs, []);
  if (!jobs.length) {
    writeStore(MEDISPOT_KEYS.jobs, seedJobs);
    return seedJobs;
  }
  return jobs;
}

function getJobs() {
  return ensureJobs();
}

function getApplications() {
  return readStore(MEDISPOT_KEYS.applications, []);
}

function getProfile() {
  return readStore(MEDISPOT_KEYS.profile, {
    name: "田中 さゆり",
    license: "看護師",
    location: "東京都",
    experience: "3〜5年",
    message: "健診、採血、外来補助の経験があります。週1〜2日のスポット勤務を希望します。"
  });
}

function resetDemo() {
  localStorage.removeItem(MEDISPOT_KEYS.jobs);
  localStorage.removeItem(MEDISPOT_KEYS.applications);
  localStorage.removeItem(MEDISPOT_KEYS.profile);
  window.location.reload();
}

function jobCard(job, mode, application) {
  const status = application ? `<span class="mock-status ${application.status}">${statusLabel(application.status)}</span>` : "";
  const applyButton = mode === "seeker"
    ? `<button class="btn btn-green" type="button" data-apply="${job.id}">${application ? "応募済み" : "応募する"}</button>`
    : "";

  return `
    <article class="mock-job-card">
      <div class="mock-job-top">
        <span>${job.profession}</span>
        ${status}
      </div>
      <h3>${job.title}</h3>
      <p>${job.description || "仕事内容を確認して応募してください。"}</p>
      <dl>
        <div><dt>勤務先</dt><dd>${job.employer || "MediSpot登録医療機関"}</dd></div>
        <div><dt>勤務地</dt><dd>${job.location}</dd></div>
        <div><dt>形態</dt><dd>${job.workStyle}</dd></div>
        <div><dt>報酬</dt><dd>${job.salary}</dd></div>
        <div><dt>勤務日</dt><dd>${job.date || "相談可能"}</dd></div>
      </dl>
      ${applyButton}
    </article>
  `;
}

function statusLabel(status) {
  if (status === "accepted") return "採用決定";
  if (status === "rejected") return "見送り";
  return "応募中";
}

function applicationRow(application, job, mode) {
  const profile = application.profile || getProfile();
  const controls = mode === "employer" ? `
    <div class="row-actions">
      <button class="btn btn-green" type="button" data-accept="${application.id}">採用する</button>
      <button class="btn btn-outline" type="button" data-reject="${application.id}">見送り</button>
    </div>
  ` : "";

  return `
    <article class="mock-row">
      <div>
        <span class="mock-status ${application.status}">${statusLabel(application.status)}</span>
        <h3>${job ? job.title : application.jobTitle}</h3>
        <p>${profile.name} ／ ${profile.license} ／ ${profile.experience || "経験未入力"}</p>
        <small>${job ? `${job.location}・${job.workStyle}・${job.salary}` : "求人情報なし"}</small>
      </div>
      ${controls}
    </article>
  `;
}

function initCommon() {
  document.querySelectorAll("[data-reset-demo]").forEach((button) => {
    button.addEventListener("click", resetDemo);
  });
}

function initSeeker() {
  const form = document.getElementById("seekerProfileForm");
  const preview = document.getElementById("seekerProfilePreview");
  const filters = ["filterProfession", "filterLocation", "filterWorkStyle"].map((id) => document.getElementById(id));

  function fillProfileForm() {
    const profile = getProfile();
    Object.entries(profile).forEach(([key, value]) => {
      if (form.elements[key]) form.elements[key].value = value;
    });
  }

  function renderProfile() {
    const profile = getProfile();
    preview.innerHTML = `
      <strong>${profile.name}</strong>
      <span>${profile.license} ／ ${profile.experience}</span>
      <span>希望勤務地：${profile.location || "未設定"}</span>
      <p>${profile.message || "自己PRは未入力です。"}</p>
    `;
  }

  function renderJobs() {
    const jobs = getJobs();
    const applications = getApplications();
    const values = {
      profession: document.getElementById("filterProfession").value,
      location: document.getElementById("filterLocation").value,
      workStyle: document.getElementById("filterWorkStyle").value
    };
    const filtered = jobs.filter((job) => {
      return (!values.profession || job.profession === values.profession)
        && (!values.location || job.location === values.location)
        && (!values.workStyle || job.workStyle === values.workStyle);
    });
    document.getElementById("seekerJobList").innerHTML = filtered.map((job) => {
      const application = applications.find((item) => item.jobId === job.id);
      return jobCard(job, "seeker", application);
    }).join("") || `<p class="empty-note">条件に合う求人がありません。</p>`;
  }

  function renderApplications() {
    const jobs = getJobs();
    const applications = getApplications();
    document.getElementById("seekerApplicationList").innerHTML = applications.map((application) => {
      const job = jobs.find((item) => item.id === application.jobId);
      return applicationRow(application, job, "seeker");
    }).join("") || `<p class="empty-note">まだ応募していません。求人一覧から応募してみましょう。</p>`;
    document.getElementById("seekerJobCount").textContent = jobs.length;
    document.getElementById("seekerAppliedCount").textContent = applications.length;
    document.getElementById("seekerMatchedCount").textContent = applications.filter((item) => item.status === "accepted").length;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    writeStore(MEDISPOT_KEYS.profile, data);
    renderProfile();
    renderApplications();
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-apply]");
    if (!button) return;
    const jobId = button.dataset.apply;
    const applications = getApplications();
    if (applications.some((item) => item.jobId === jobId)) return;
    const job = getJobs().find((item) => item.id === jobId);
    applications.push({
      id: `app-${Date.now()}`,
      jobId,
      jobTitle: job.title,
      status: "pending",
      profile: getProfile(),
      createdAt: new Date().toISOString()
    });
    writeStore(MEDISPOT_KEYS.applications, applications);
    renderJobs();
    renderApplications();
  });

  filters.forEach((filter) => filter.addEventListener("change", renderJobs));
  fillProfileForm();
  renderProfile();
  renderJobs();
  renderApplications();
}

function initEmployer() {
  const form = document.getElementById("jobPostForm");

  function renderEmployerJobs() {
    const jobs = getJobs();
    document.getElementById("employerJobList").innerHTML = jobs.map((job) => jobCard(job, "employer")).join("");
    document.getElementById("employerJobCount").textContent = jobs.length;
  }

  function renderApplicants() {
    const jobs = getJobs();
    const applications = getApplications();
    document.getElementById("employerApplicantList").innerHTML = applications.map((application) => {
      const job = jobs.find((item) => item.id === application.jobId);
      return applicationRow(application, job, "employer");
    }).join("") || `<p class="empty-note">まだ応募者はいません。求職者画面で応募するとここに表示されます。</p>`;
    document.getElementById("employerApplicantCount").textContent = applications.length;
    document.getElementById("employerAcceptedCount").textContent = applications.filter((item) => item.status === "accepted").length;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const jobs = getJobs();
    jobs.unshift({
      id: `job-${Date.now()}`,
      employer: "登録医療機関",
      ...data
    });
    writeStore(MEDISPOT_KEYS.jobs, jobs);
    form.reset();
    renderEmployerJobs();
  });

  document.addEventListener("click", (event) => {
    const accept = event.target.closest("[data-accept]");
    const reject = event.target.closest("[data-reject]");
    if (!accept && !reject) return;
    const id = accept ? accept.dataset.accept : reject.dataset.reject;
    const applications = getApplications().map((application) => {
      if (application.id !== id) return application;
      return { ...application, status: accept ? "accepted" : "rejected" };
    });
    writeStore(MEDISPOT_KEYS.applications, applications);
    renderApplicants();
  });

  renderEmployerJobs();
  renderApplicants();
}

window.addEventListener("DOMContentLoaded", () => {
  ensureJobs();
  initCommon();
  const page = document.body.dataset.page;
  if (page === "seeker") initSeeker();
  if (page === "employer") initEmployer();
});

