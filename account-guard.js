window.MEDISPOT_ACCOUNT_GUARD = (function () {
  async function check(supabaseClient, user, role) {
    if (!supabaseClient || !user) return true;
    const table = role === "employer" ? "employer_profiles" : "seeker_profiles";
    const result = await supabaseClient
      .from(table)
      .select("account_status")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const status = result.data && result.data.account_status;
    if (status && status !== "active") {
      await supabaseClient.auth.signOut();
      window.location.href =
        "login.html?role=" + role + "&accountStatus=" + (status === "withdrawn" ? "withdrawn" : "suspended");
      return false;
    }
    return true;
  }
  return { check: check };
})();
