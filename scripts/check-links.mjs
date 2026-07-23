// Scans every *.html file at the repo root for references to other
// .html pages - both plain <a href="x.html"> links and JS string
// literals used in dynamically-built markup (e.g. '<a href="' + ... +
// 'x.html">') - and fails if any target doesn't exist. This is exactly
// how the seeker-home.html links to nonexistent seeker-apply-complete.html
// / seeker-job-detail.html were found.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const files = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
const existing = new Set(files);
const missing = new Map();

for (const file of files) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  const re = /['"]([a-zA-Z0-9_-]+\.html)(?:\?[^"'?]*)?['"]/g;
  let m;
  while ((m = re.exec(html))) {
    const target = m[1];
    if (!existing.has(target)) {
      if (!missing.has(target)) missing.set(target, new Set());
      missing.get(target).add(file);
    }
  }
}

if (missing.size) {
  console.error("Links to missing pages found:");
  for (const [target, sources] of missing) {
    console.error("  " + target + " <- " + [...sources].join(", "));
  }
  process.exit(1);
}
console.log("OK - all .html references across " + files.length + " files resolve to real files.");
