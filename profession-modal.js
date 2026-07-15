(function () {
  var professionData = {
    nurse: {
      title: "看護師",
      desc: "病院・クリニックでの看護業務",
      salary: "¥320,000〜",
      jobs: "1,245件",
      tags: ["日勤のみ", "高時給", "週1日OK"],
      duties: ["診療補助", "健康管理", "バイタルチェック", "服薬管理"],
      cta: "看護師の求人を見る"
    },
    lab: {
      title: "臨床検査技師",
      desc: "検体検査・生理検査・検査業務全般",
      salary: "¥300,000〜",
      jobs: "612件",
      tags: ["日勤のみ", "土日休み", "未経験OK"],
      duties: ["検体採取", "臨床検査", "データ管理", "機器メンテナンス"],
      cta: "臨床検査技師の求人を見る"
    },
    radiology: {
      title: "放射線技師",
      desc: "X線撮影・CT・MRIなど画像診断業務",
      salary: "¥340,000〜",
      jobs: "489件",
      tags: ["高時給", "夜勤あり", "資格手当"],
      duties: ["X線撮影", "CT/MRI操作", "画像管理", "患者対応"],
      cta: "放射線技師の求人を見る"
    },
    pt: {
      title: "理学療法士",
      desc: "リハビリテーション・機能訓練業務",
      salary: "¥310,000〜",
      jobs: "738件",
      tags: ["日勤のみ", "週1日OK", "経験者優遇"],
      duties: ["運動機能訓練", "リハビリ計画作成", "患者評価", "記録管理"],
      cta: "理学療法士の求人を見る"
    },
    ot: {
      title: "作業療法士",
      desc: "日常生活動作の訓練・作業療法業務",
      salary: "¥305,000〜",
      jobs: "412件",
      tags: ["日勤のみ", "高時給", "週1日OK"],
      duties: ["生活動作訓練", "作業療法計画", "認知機能訓練", "家族サポート"],
      cta: "作業療法士の求人を見る"
    },
    speech: {
      title: "言語聴覚士",
      desc: "言語訓練・嚥下訓練・リハビリ業務",
      salary: "¥315,000〜",
      jobs: "356件",
      tags: ["週1日OK", "高時給", "経験者優遇"],
      duties: ["言語訓練", "嚥下機能評価", "摂食指導", "記録作成"],
      cta: "言語聴覚士の求人を見る"
    },
    helper: {
      title: "ヘルパー",
      desc: "身体介護・生活援助・サポート業務",
      salary: "¥280,000〜",
      jobs: "1,032件",
      tags: ["日勤のみ", "未経験OK", "週1日OK"],
      duties: ["身体介護", "生活援助", "外出付き添い", "記録記入"],
      cta: "ヘルパーの求人を見る"
    }
  };

  var overlay = document.getElementById("professionModalOverlay");
  if (!overlay) return;

  var closeBtn = document.getElementById("professionModalClose");
  var titleEl = document.getElementById("professionModalTitle");
  var descEl = document.getElementById("professionModalDesc");
  var salaryEl = document.getElementById("professionModalSalary");
  var jobsEl = document.getElementById("professionModalJobs");
  var tagsEl = document.getElementById("professionModalTags");
  var dutiesEl = document.getElementById("professionModalDuties");
  var ctaEl = document.getElementById("professionModalCta");
  var ctaTextEl = document.getElementById("professionModalCtaText");

  var lastFocused = null;

  function openModal(key) {
    var data = professionData[key];
    if (!data) return;

    titleEl.textContent = data.title;
    descEl.textContent = data.desc;
    salaryEl.textContent = data.salary;
    jobsEl.textContent = data.jobs;

    tagsEl.innerHTML = "";
    data.tags.forEach(function (tag) {
      var span = document.createElement("span");
      span.className = "profession-modal-tag";
      span.textContent = tag;
      tagsEl.appendChild(span);
    });

    dutiesEl.innerHTML = "";
    data.duties.forEach(function (duty) {
      var li = document.createElement("li");
      li.textContent = duty;
      dutiesEl.appendChild(li);
    });

    ctaTextEl.textContent = data.cta;
    ctaEl.setAttribute("aria-label", data.cta);

    lastFocused = document.activeElement;
    overlay.classList.add("is-open");
    document.body.classList.add("profession-modal-open");
    closeBtn.focus();
  }

  function closeModal() {
    overlay.classList.remove("is-open");
    document.body.classList.remove("profession-modal-open");
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  document.querySelectorAll(".profession-grid article[data-profession]").forEach(function (article) {
    article.addEventListener("click", function (e) {
      e.preventDefault();
      openModal(article.getAttribute("data-profession"));
    });
  });

  closeBtn.addEventListener("click", closeModal);

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) {
      closeModal();
    }
  });
})();
