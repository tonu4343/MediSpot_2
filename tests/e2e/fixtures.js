// Shared Playwright fixtures for all E2E specs.
//
// These tests must NEVER run against the production Supabase project -
// they create real accounts, applications, and (in payment tests) real
// pay.jp test-mode charges. Point them at a disposable test project
// (same schema/migrations, throwaway data) via env vars:
//
//   TEST_SUPABASE_URL              required
//   TEST_SUPABASE_ANON_KEY         required
//   TEST_SUPABASE_SERVICE_ROLE_KEY optional, enables automatic test-user cleanup
//
// Load them from a local .env.test file with: node --env-file=.env.test ...
// (see .env.test.example). .env.test itself is gitignored.
import { test as base, expect } from "@playwright/test";

const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY;
const TEST_SUPABASE_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

if (!TEST_SUPABASE_URL || !TEST_SUPABASE_ANON_KEY) {
  throw new Error(
    "TEST_SUPABASE_URL and TEST_SUPABASE_ANON_KEY must be set to a disposable " +
      "TEST Supabase project before running these specs - see .env.test.example. " +
      "Never point these at the production project."
  );
}

function uniqueEmail(tag) {
  return "e2e-" + tag + "-" + Date.now() + "-" + Math.floor(Math.random() * 100000) + "@example.com";
}

async function adminRequest(pathAndQuery, options = {}) {
  if (!TEST_SUPABASE_SERVICE_ROLE_KEY) return null;
  const res = await fetch(TEST_SUPABASE_URL + pathAndQuery, {
    ...options,
    headers: {
      apikey: TEST_SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + TEST_SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  return res;
}

/** Look up a user's id by email via the admin API (requires service role key). */
async function findUserIdByEmail(email) {
  const res = await adminRequest("/auth/v1/admin/users?email=" + encodeURIComponent(email));
  if (!res || !res.ok) return null;
  const body = await res.json();
  const user = (body.users || [])[0];
  return user ? user.id : null;
}

/** Delete a test auth user (cascades to profile rows via FK on delete cascade). */
async function deleteUser(userId) {
  if (!userId) return;
  await adminRequest("/auth/v1/admin/users/" + encodeURIComponent(userId), { method: "DELETE" });
}

/** Directly set account_status on a profile row - used to test suspension without going through the admin UI. */
async function setAccountStatus(table, userId, status) {
  await adminRequest("/rest/v1/" + table + "?user_id=eq." + encodeURIComponent(userId), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ account_status: status })
  });
}

/** Look up a job's id by its exact title (requires service role key) - avoids clicking through the job search UI, which can be flaky against a whole-card overlay link. */
async function findJobIdByTitle(title) {
  const res = await adminRequest("/rest/v1/jobs?title=eq." + encodeURIComponent(title) + "&select=id&order=created_at.desc&limit=1");
  if (!res || !res.ok) return null;
  const rows = await res.json();
  return rows[0] ? rows[0].id : null;
}

/** Look up a seeker_applications row for a given job/user pair (requires service role key). */
async function findApplication(jobId, userId) {
  const res = await adminRequest(
    "/rest/v1/seeker_applications?job_id=eq." + encodeURIComponent(jobId) + "&user_id=eq." + encodeURIComponent(userId) + "&select=*"
  );
  if (!res || !res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

export const test = base.extend({
  page: async ({ page }, use) => {
    // Every page load gets test Supabase credentials instead of the
    // production ones baked into the real supabase-config.js file on disk.
    await page.route("**/supabase-config.js", (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body:
          "window.MEDISPOT_SUPABASE = { url: " +
          JSON.stringify(TEST_SUPABASE_URL) +
          ", anonKey: " +
          JSON.stringify(TEST_SUPABASE_ANON_KEY) +
          " };"
      })
    );
    await use(page);
  }
});

export {
  expect,
  uniqueEmail,
  findUserIdByEmail,
  deleteUser,
  setAccountStatus,
  findJobIdByTitle,
  findApplication,
  TEST_SUPABASE_SERVICE_ROLE_KEY
};
