// @ts-check
import { defineConfig, devices } from "@playwright/test";

// Load TEST_SUPABASE_* credentials from .env.test if present (see
// .env.test.example), so `npm run test:e2e` works without needing the
// caller to export them manually. Never touches the real .env files.
try {
  process.loadEnvFile(new URL("./.env.test", import.meta.url));
} catch {
  // .env.test doesn't exist yet - fall through and let fixtures.js raise
  // a clear error if TEST_SUPABASE_URL/ANON_KEY are still missing.
}

const PORT = 4173;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // specs create/mutate real rows in the test Supabase project
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:" + PORT,
    trace: "retain-on-failure"
  },
  webServer: {
    command: "node scripts/static-server.mjs",
    url: "http://localhost:" + PORT + "/index.html",
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(PORT) }
  },
  projects: [
    {
      name: "edge",
      use: { ...devices["Desktop Edge"], channel: "msedge" }
    }
  ]
});
