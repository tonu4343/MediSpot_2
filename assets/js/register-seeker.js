(function () {
  var config = window.MEDISPOT_SUPABASE || {};
  var configured = config.url && config.anonKey &&
    config.url.indexOf("YOUR_PROJECT_ID") === -1 &&
    config.anonKey.indexOf("YOUR_SUPABASE_ANON_KEY") === -1;
  var supabaseClient = configured && window.supabase
    ? window.supabase.createClient(config.url, config.anonKey)
    : null;

  var form = document.getElementById("profileForm");
  if (!form) return;

  var submitBtn = form.querySelector("button[type='submit']");
  var messageEl = document.getElementById("formMessage");

  function showMessage(text, isError) {
    messageEl.textContent = text;
    messageEl.style.display = "inline";
    messageEl.style.color = isError ? "#c0392b" : "";
  }

  function resetBtn() {
    submitBtn.disabled = false;
    submitBtn.textContent = "無料で登録する";
  }

  function friendlyError(message) {
    if (!message) return "登録中にエラーが発生しました。";
    if (message.indexOf("already registered") !== -1 || message.indexOf("already been registered") !== -1) {
      return "このメールアドレスはすでに登録されています。ログインしてください。";
    }
    if (message.toLowerCase().indexOf("password") !== -1) {
      return "パスワードは8文字以上で入力してください。";
    }
    if (message.toLowerCase().indexOf("email") !== -1) {
      return "正しいメールアドレスを入力してください。";
    }
    return message;
  }

  function selectedSkills() {
    return Array.prototype.map.call(
      document.querySelectorAll("#skillGrid .check-pill input:checked"),
      function (input) {
        return input.nextElementSibling ? input.nextElementSibling.textContent.trim() : "";
      }
    ).filter(Boolean);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!supabaseClient) {
      showMessage("Supabase の設定を確認してください。", true);
      return;
    }

    var name = document.getElementById("name").value.trim();
    var email = document.getElementById("email").value.trim();
    var password = document.getElementById("password").value;
    var passwordConfirm = document.getElementById("passwordConfirm").value;
    var birth = document.getElementById("birth").value || null;
    var phone = document.getElementById("phone").value.trim() || null;
    var jobType = document.getElementById("license").value;
    var experience = document.getElementById("years").value;
    var location = document.getElementById("area").value.trim() || null;
    var workType = document.getElementById("style").value;
    var skills = selectedSkills().join("、") || null;
    var prText = document.getElementById("pr").value.trim() || null;

    if (!name || !email || !password) {
      showMessage("お名前・メールアドレス・パスワードを入力してください。", true);
      return;
    }
    if (password.length < 8) {
      showMessage("パスワードは8文字以上で入力してください。", true);
      return;
    }
    if (password !== passwordConfirm) {
      showMessage("パスワードと確認用パスワードが一致しません。", true);
      return;
    }
    if (!jobType) {
      showMessage("保有資格を選択してください。", true);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "登録中...";

    supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: { data: { full_name: name, role: "seeker" } }
    }).then(function (signUpResult) {
      if (signUpResult.error) throw signUpResult.error;

      var userId = signUpResult.data.user ? signUpResult.data.user.id : null;

      return supabaseClient.from("seekers").insert({
        user_id: userId,
        full_name: name,
        email: email,
        phone: phone,
        birthdate: birth,
        job_type: jobType,
        experience: experience,
        location: location,
        work_type: workType,
        skills: skills,
        pr_text: prText,
        role: "seeker"
      }).then(function (insertResult) {
        if (insertResult.error) throw insertResult.error;

        try {
          localStorage.setItem("medispot_user", JSON.stringify({
            id: userId,
            email: email,
            fullName: name,
            jobType: jobType,
            workType: workType,
            location: location,
            role: "seeker"
          }));
        } catch (e) {}

        showMessage("登録完了！あなたにマッチした求人を表示しています...", false);
        setTimeout(function () {
          window.location.href = "seeker-home.html?new=1";
        }, 1200);
      });
    }).catch(function (err) {
      showMessage(friendlyError(err && err.message), true);
      resetBtn();
    });
  });
})();
