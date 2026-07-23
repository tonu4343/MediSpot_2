// Replays supabase/migrations/*.sql in filename order and checks that no
// trigger ever calls a function before some earlier-or-current migration
// has defined it. This is exactly the bug that let
// 20260722150000_hire_invoices.sql reference public.set_updated_at()
// with no migration ever defining it - a fresh database built only from
// this folder would have failed outright partway through. Does not run
// any SQL; it's a static reference check, not a real database replay.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const migrationsDir = path.join(root, "supabase", "migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const defined = new Set();
const problems = [];
// One combined pass in document order (both within a file and across
// files, since files are read in sorted order) so a function defined
// earlier in the SAME file counts as already defined for a use later in
// that same file.
const statementRe = /create (?:or replace )?function (public\.[a-z_]+)\(|execute function (public\.[a-z_]+)\(/g;

for (const file of files) {
  const raw = fs.readFileSync(path.join(migrationsDir, file), "utf8");
  // Strip line comments before scanning, so illustrative SQL quoted
  // inside a -- comment (e.g. explaining what a past bug looked like)
  // isn't mistaken for a real statement. Matches up to (but not
  // including) the next newline directly, rather than relying on $,
  // since these files use CRLF line endings and a trailing \r would
  // otherwise stop $ from anchoring correctly.
  const sql = raw.replace(/--[^\r\n]*/g, "");
  let m;
  while ((m = statementRe.exec(sql))) {
    const definedName = m[1];
    const usedName = m[2];
    if (definedName) {
      defined.add(definedName);
    } else if (usedName && !defined.has(usedName)) {
      problems.push(file + " references " + usedName + "() via a trigger, but it is not yet defined by that point.");
    }
  }
}

if (problems.length) {
  console.error("A fresh sequential replay of supabase/migrations/ would fail:");
  problems.forEach((p) => console.error("  " + p));
  process.exit(1);
}
console.log("OK - sequential replay of " + files.length + " migration files never references a trigger function before it's defined.");
