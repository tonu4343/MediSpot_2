const MEDISPOT_KEYS = {
  jobs: "medispot_mock_jobs",
  applications: "medispot_mock_applications",
  profile: "medispot_mock_seeker_profile",
  messages: "medispot_mock_messages"
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
    description: "採血、問診、健診補助を担当します。ブランクがある方も相談できます。",
    requirements: "看護師免許、採血経験、身分証確認"
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
    description: "検査補助、検体管理、結果入力をお願いします。",
    requirements: "臨床検査技師資格、健診業務経験がある方歓迎"
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
    description: "バイタル確認、服薬管理、利用者対応を行います。",
    requirements: "看護師または准看護師、介護施設経験者歓迎"
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

function getJobs() { return ensureJobs(); }
function getApplications() { return readStore(MEDISPOT_KEYS.applications, []); }
function getMessages() { return readStore(MEDISPOT_KEYS.messages, {}); }

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
  Object.values(MEDISPOT_KEYS).forEach((key) => localStorage.removeItem(key));
  window.location.reload();
}

function statusLabel(status) {
  if (status === "accepted") return "採用決定";
  if (status === "rejected") return "見送り";
  return "応募中";
}

function findJob(jobId) {
  return getJobs().find((job) => job.id === jobId);
}

function findApplication(jobId) {
  return getApplications().find((item) => item.jobId === jobId);
}

function updateStats() {
  const jobs = getJobs();
  const applications = getApplications();
  const counts = {
    seekerJobCount: jobs.length,
    seekerAppliedCount: applications.length,
    seekerMatchedCount: applications.filter((item) => item.status === "accepted").length,
    employerJobCount: jobs.length,
    employerApplicantCount: applications.length,
    employerAcceptedCount: applications.filter((item) => item.status === "accepted").length
  };
  Object.entries(counts).forEach(([id, value]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  });
}

function profilePreviewHtml() {
  const profile = getProfile();
  return `
    <strong>${profile.name}</strong>
    <span>${profile.license} ／ ${profile.experience}</span>
    <span>希望勤務地：${profile.location || "未設定"}</span>
    <p>${profile.message || "自己PRは未入力です。"}</p>
  `;
}

function renderProfilePreview() {
  document.querySelectorAll("#seekerProfilePreview").forEach((preview) => {
    preview.innerHTML = profilePreviewHtml();
  });
}

function jobCard(job, mode = "seeker", application = findApplication(job.id)) {
  const status = application ? `<span class="mock-status ${application.status}">${statusLabel(application.status)}</span>` : "";
  const detailLink = `<a class="btn btn-outline" href="job-detail.html?id=${encodeURIComponent(job.id)}">詳細を見る</a>`;
  const applyButton = mode === "seeker"
    ? `<button class="btn btn-green" type="button" data-apply="${job.id}">${application ? "応募済み" : "応募する"}</button>`
    : "";

  return `
    <article class="mock-job-card">
      <div class="mock-job-top"><span>${job.profession}</span>${status}</div>
      <h3>${job.title}</h3>
      <p>${job.description || "仕事内容を確認して応募してください。"}</p>
      <dl>
        <div><dt>勤務先</dt><dd>${job.employer || "MediSpot登録医療機関"}</dd></div>
        <div><dt>勤務地</dt><dd>${job.location}</dd></div>
        <div><dt>形態</dt><dd>${job.workStyle}</dd></div>
        <div><dt>報酬</dt><dd>${job.salary}</dd></div>
        <div><dt>勤務日</dt><dd>${job.date || "相談可能"}</dd></div>
      </dl>
      <div class="row-actions">${detailLink}${applyButton}</div>
    </article>
  `;
}

function applyToJob(jobId) {
  const applications = getApplications();
  if (applications.some((item) => item.jobId === jobId)) return;
  const job = findJob(jobId);
  if (!job) return;
  applications.push({
    id: `app-${Date.now()}`,
    jobId,
    jobTitle: job.title,
    status: "pending",
    profile: getProfile(),
    createdAt: new Date().toISOString()
  });
  writeStore(MEDISPOT_KEYS.applications, applications);
}

function applicationRow(application, job = findJob(application.jobId), mode = "seeker") {
  const profile = application.profile || getProfile();
  const chatLink = application.status === "accepted" ? `<a class="btn btn-green" href="chat.html?application=${application.id}">チャット</a>` : "";
  const employerControls = mode === "employer" ? `
    <div class="row-actions">
      <button class="btn btn-green" type="button" data-accept="${application.id}">採用する</button>
      <button class="btn btn-outline" type="button" data-reject="${application.id}">見送り</button>
    </div>
  ` : `<div class="row-actions"><a class="btn btn-outline" href="job-detail.html?id=${application.jobId}">求人詳細</a>${chatLink}</div>`;

  return `
    <article class="mock-row">
      <div>
        <span class="mock-status ${application.status}">${statusLabel(application.status)}</span>
        <h3>${job ? job.title : application.jobTitle}</h3>
        <p>${profile.name} ／ ${profile.license} ／ ${profile.experience || "経験未入力"}</p>
        <small>${job ? `${job.location}・${job.workStyle}・${job.salary}` : "求人情報なし"}</small>
      </div>
      ${employerControls}
    </article>
  `;
}

function initCommon() {
  document.querySelectorAll("[data-reset-demo]").forEach((button) => button.addEventListener("click", resetDemo));
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-apply]");
    if (!button) return;
    applyToJob(button.dataset.apply);
    renderCurrentPage();
  });
}

function initSeekerDashboard() {
  renderProfilePreview();
  const applications = getApplications().slice().reverse().slice(0, 3);
  const appList = document.getElementById("dashboardApplicationList");
  appList.innerHTML = applications.map((application) => applicationRow(application)).join("") || `<p class="empty-note">まだ応募していません。求人検索ページから応募してみましょう。</p>`;
  const jobs = getJobs().slice(0, 3);
  document.getElementById("dashboardJobList").innerHTML = jobs.map((job) => jobCard(job)).join("");
  updateStats();
}

function initSeekerProfile() {
  const form = document.getElementById("seekerProfileForm");
  const profile = getProfile();
  Object.entries(profile).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value;
  });
  renderProfilePreview();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    writeStore(MEDISPOT_KEYS.profile, Object.fromEntries(new FormData(form).entries()));
    renderProfilePreview();
  });
}

function initSeekerJobs() {
  const filters = ["filterProfession", "filterLocation", "filterWorkStyle"].map((id) => document.getElementById(id));
  function renderJobs() {
    const values = {
      profession: document.getElementById("filterProfession").value,
      location: document.getElementById("filterLocation").value,
      workStyle: document.getElementById("filterWorkStyle").value
    };
    const filtered = getJobs().filter((job) => (!values.profession || job.profession === values.profession)
      && (!values.location || job.location === values.location)
      && (!values.workStyle || job.workStyle === values.workStyle));
    document.getElementById("seekerJobList").innerHTML = filtered.map((job) => jobCard(job)).join("") || `<p class="empty-note">条件に合う求人がありません。</p>`;
    updateStats();
  }
  filters.forEach((filter) => filter.addEventListener("change", renderJobs));
  renderJobs();
}

function initJobDetail() {
  const params = new URLSearchParams(window.location.search);
  const job = findJob(params.get("id")) || getJobs()[0];
  const application = findApplication(job.id);
  document.getElementById("jobDetail").innerHTML = `
    <div class="mock-job-top"><span>${job.profession}</span>${application ? `<span class="mock-status ${application.status}">${statusLabel(application.status)}</span>` : ""}</div>
    <h2>${job.title}</h2>
    <p>${job.description}</p>
    <dl class="detail-dl">
      <div><dt>医療機関</dt><dd>${job.employer || "MediSpot登録医療機関"}</dd></div>
      <div><dt>勤務地</dt><dd>${job.location}</dd></div>
      <div><dt>雇用形態</dt><dd>${job.workStyle}</dd></div>
      <div><dt>報酬</dt><dd>${job.salary}</dd></div>
      <div><dt>勤務日</dt><dd>${job.date || "相談可能"}</dd></div>
      <div><dt>必要条件</dt><dd>${job.requirements || "資格確認・本人確認が必要です。"}</dd></div>
    </dl>
    <div class="row-actions">
      <button class="btn btn-green" type="button" data-apply="${job.id}">${application ? "応募済み" : "この求人に応募する"}</button>
      <a class="btn btn-outline" href="seeker-jobs.html">一覧へ戻る</a>
    </div>
  `;
}

function initSeekerApplications() {
  const applications = getApplications();
  const node = document.getElementById("seekerApplicationList");
  node.innerHTML = applications.map((application) => applicationRow(application)).join("") || `<p class="empty-note">まだ応募していません。求人検索ページから応募しましょう。</p>`;
  updateStats();
}

function initEmployer() {
  const form = document.getElementById("jobPostForm");
  const jobList = document.getElementById("employerJobList");
  const applicantList = document.getElementById("employerApplicantList");

  function renderEmployerJobs() {
    if (jobList) jobList.innerHTML = getJobs().map((job) => jobCard(job, "employer")).join("");
    updateStats();
  }

  function renderApplicants() {
    if (!applicantList) return;
    const applications = getApplications();
    applicantList.innerHTML = applications.map((application) => applicationRow(application, findJob(application.jobId), "employer")).join("") || `<p class="empty-note">まだ応募者はいません。求職者画面で応募するとここに表示されます。</p>`;
    updateStats();
  }

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const jobs = getJobs();
      jobs.unshift({ id: `job-${Date.now()}`, employer: "登録医療機関", ...Object.fromEntries(new FormData(form).entries()) });
      writeStore(MEDISPOT_KEYS.jobs, jobs);
      form.reset();
      renderEmployerJobs();
    });
  }

  document.addEventListener("click", (event) => {
    const accept = event.target.closest("[data-accept]");
    const reject = event.target.closest("[data-reject]");
    if (!accept && !reject) return;
    const id = accept ? accept.dataset.accept : reject.dataset.reject;
    writeStore(MEDISPOT_KEYS.applications, getApplications().map((application) => application.id === id ? { ...application, status: accept ? "accepted" : "rejected" } : application));
    renderApplicants();
  });

  renderEmployerJobs();
  renderApplicants();
}

function initChat() {
  const applications = getApplications();
  const jobs = getJobs();
  const params = new URLSearchParams(window.location.search);
  let currentId = params.get("application") || (applications.find((item) => item.status === "accepted") || applications[0] || {}).id;
  const list = document.getElementById("chatThreadList");
  const messagesNode = document.getElementById("chatMessages");
  const title = document.getElementById("chatTitle");
  const form = document.getElementById("chatForm");

  function renderThreads() {
    list.innerHTML = applications.map((application) => {
      const job = jobs.find((item) => item.id === application.jobId);
      return `<button class="chat-thread ${application.id === currentId ? "active" : ""}" type="button" data-thread="${application.id}"><strong>${job ? job.title : application.jobTitle}</strong><span>${statusLabel(application.status)}</span></button>`;
    }).join("") || `<p class="empty-note">応募済み求人がありません。先に求人へ応募してください。</p>`;
  }

  function renderMessages() {
    const application = applications.find((item) => item.id === currentId);
    const job = application ? jobs.find((item) => item.id === application.jobId) : null;
    title.textContent = job ? job.title : "チャット";
    const allMessages = getMessages();
    const messages = allMessages[currentId] || [
      { from: "clinic", text: "応募ありがとうございます。勤務可能日を確認させてください。" },
      { from: "me", text: "ありがとうございます。詳細を確認できます。" }
    ];
    messagesNode.innerHTML = messages.map((message) => `<div class="chat-message ${message.from}">${message.text}</div>`).join("");
    form.style.display = currentId ? "flex" : "none";
  }

  list.addEventListener("click", (event) => {
    const thread = event.target.closest("[data-thread]");
    if (!thread) return;
    currentId = thread.dataset.thread;
    renderThreads();
    renderMessages();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = new FormData(form).get("message").trim();
    if (!text || !currentId) return;
    const allMessages = getMessages();
    allMessages[currentId] = allMessages[currentId] || [];
    allMessages[currentId].push({ from: "me", text });
    writeStore(MEDISPOT_KEYS.messages, allMessages);
    form.reset();
    renderMessages();
  });

  renderThreads();
  renderMessages();
}

function renderCurrentPage() {
  const page = document.body.dataset.page;
  if (page === "seeker-dashboard") initSeekerDashboard();
  if (page === "seeker-jobs") initSeekerJobs();
  if (page === "job-detail") initJobDetail();
  if (page === "seeker-applications") initSeekerApplications();
}

window.addEventListener("DOMContentLoaded", () => {
  ensureJobs();
  initCommon();
  const page = document.body.dataset.page;
  if (page === "seeker-dashboard") initSeekerDashboard();
  if (page === "seeker-profile") initSeekerProfile();
  if (page === "seeker-jobs") initSeekerJobs();
  if (page === "job-detail") initJobDetail();
  if (page === "seeker-applications") initSeekerApplications();
  if (page === "chat") initChat();
  if (page === "employer") initEmployer();
});
