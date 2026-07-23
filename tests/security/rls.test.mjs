// Security/RLS boundary tests - these exercise Supabase policies and
// functions directly via @supabase/supabase-js, with no browser involved
// (the UI never offers a "tamper with someone else's data" button, so
// these have to be asserted at the client/DB level instead of through
// Playwright). Run with: node --test tests/security
//
// Requires a disposable TEST Supabase project (never production):
//   TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, TEST_SUPABASE_SERVICE_ROLE_KEY
// Load from .env.test with: node --env-file=.env.test --test tests/security
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.TEST_SUPABASE_URL;
const ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON_KEY || !SERVICE_KEY) {
  throw new Error(
    "TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY, and TEST_SUPABASE_SERVICE_ROLE_KEY " +
      "must all be set to a disposable TEST Supabase project - see .env.test.example. " +
      "Never point these at the production project."
  );
}

const admin = createClient(URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

function uniqueEmail(tag) {
  return "rls-" + tag + "-" + Date.now() + "-" + Math.floor(Math.random() * 100000) + "@example.com";
}

async function createConfirmedUser(email, password, role, extra = {}) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, ...extra }
  });
  if (error) throw error;
  return data.user;
}

function clientFor() {
  return createClient(URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function signIn(email, password) {
  const client = clientFor();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

const password = "testpass123!";
const createdUserIds = [];

after(async () => {
  for (const id of createdUserIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
});

test("a suspended seeker cannot insert a new application", async () => {
  const email = uniqueEmail("suspended-seeker");
  const user = await createConfirmedUser(email, password, "seeker", { name: "RLSテスト太郎" });
  createdUserIds.push(user.id);

  // handle_new_profile() should have created the seeker_profiles row already.
  const { error: suspendError } = await admin
    .from("seeker_profiles")
    .update({ account_status: "suspended" })
    .eq("user_id", user.id);
  assert.equal(suspendError, null, "test setup: suspending the profile via service role should not fail");

  const { data: job } = await admin
    .from("jobs")
    .insert({
      employer_id: user.id, // any uuid satisfies the FK-less text column here; only used for the FK match in the insert policy
      title: "RLS test job",
      status: "open"
    })
    .select("id,employer_id")
    .single();

  const seekerClient = await signIn(email, password);
  const { error: insertError } = await seekerClient.from("seeker_applications").insert({
    user_id: user.id,
    job_id: job.id,
    employer_id: job.employer_id,
    job_title: "RLS test job",
    status: "applied"
  });

  assert.ok(insertError, "a suspended seeker's application insert must be rejected by RLS, but it succeeded");

  await admin.from("jobs").delete().eq("id", job.id);
});

test("application_messages: a participant cannot rewrite a message's body directly, only mark_messages_read() may touch a message", async () => {
  const employerEmail = uniqueEmail("msg-employer");
  const seekerEmail = uniqueEmail("msg-seeker");
  const employer = await createConfirmedUser(employerEmail, password, "employer", { contact_name: "RLS雇用主" });
  const seeker = await createConfirmedUser(seekerEmail, password, "seeker", { name: "RLS求職者" });
  createdUserIds.push(employer.id, seeker.id);

  const { data: job } = await admin
    .from("jobs")
    .insert({ employer_id: employer.id, title: "RLS msg job", status: "open" })
    .select("id")
    .single();

  const { data: application } = await admin
    .from("seeker_applications")
    .insert({
      user_id: seeker.id,
      employer_id: employer.id,
      job_id: job.id,
      job_title: "RLS msg job",
      status: "screening" // chat must be open for the insert policy to allow a message
    })
    .select("id")
    .single();

  const { data: message } = await admin
    .from("application_messages")
    .insert({ application_id: application.id, sender_id: seeker.id, body: "元のメッセージ" })
    .select("id")
    .single();

  const employerClient = await signIn(employerEmail, password);

  const { error: rawUpdateError } = await employerClient
    .from("application_messages")
    .update({ body: "改ざんされたメッセージ" })
    .eq("id", message.id);
  assert.ok(rawUpdateError, "a raw UPDATE on application_messages must be rejected by RLS now that only mark_messages_read() may touch a row, but it succeeded");

  const { data: unchanged } = await admin.from("application_messages").select("body").eq("id", message.id).single();
  assert.equal(unchanged.body, "元のメッセージ", "the message body must be unchanged after the rejected raw update attempt");

  const { error: rpcError } = await employerClient.rpc("mark_messages_read", { p_application_id: application.id });
  assert.equal(rpcError, null, "mark_messages_read() should succeed for a genuine participant");

  const { data: afterRpc } = await admin.from("application_messages").select("read_at").eq("id", message.id).single();
  assert.ok(afterRpc.read_at, "read_at should now be set after mark_messages_read()");
});

test("seeker_applications: an employer cannot rewrite applicant-authored fields directly, only employer_update_application_status() may change status", async () => {
  const employerEmail = uniqueEmail("app-employer");
  const seekerEmail = uniqueEmail("app-seeker");
  const employer = await createConfirmedUser(employerEmail, password, "employer", { contact_name: "RLS雇用主2" });
  const seeker = await createConfirmedUser(seekerEmail, password, "seeker", { name: "RLS求職者2" });
  createdUserIds.push(employer.id, seeker.id);

  const { data: job } = await admin
    .from("jobs")
    .insert({ employer_id: employer.id, title: "RLS app job", status: "open" })
    .select("id")
    .single();

  const { data: application } = await admin
    .from("seeker_applications")
    .insert({
      user_id: seeker.id,
      employer_id: employer.id,
      job_id: job.id,
      job_title: "RLS app job",
      seeker_name: "本物の応募者名",
      status: "applied"
    })
    .select("id")
    .single();

  const employerClient = await signIn(employerEmail, password);

  const { error: rawUpdateError } = await employerClient
    .from("seeker_applications")
    .update({ seeker_name: "なりすまし名義" })
    .eq("id", application.id);
  assert.ok(rawUpdateError, "a raw UPDATE on seeker_applications must be rejected by RLS now that only employer_update_application_status() may change it, but it succeeded");

  const { data: unchanged } = await admin.from("seeker_applications").select("seeker_name,status").eq("id", application.id).single();
  assert.equal(unchanged.seeker_name, "本物の応募者名", "seeker_name must be unchanged after the rejected raw update attempt");

  const { error: rpcError } = await employerClient.rpc("employer_update_application_status", {
    p_application_id: application.id,
    p_status: "screening"
  });
  assert.equal(rpcError, null, "employer_update_application_status() should succeed for a genuine status change");

  const { data: afterRpc } = await admin.from("seeker_applications").select("status,seeker_name").eq("id", application.id).single();
  assert.equal(afterRpc.status, "screening", "status should be updated via the RPC");
  assert.equal(afterRpc.seeker_name, "本物の応募者名", "seeker_name must still be untouched - the RPC only ever writes status/interview_at/work_start_at");
});
