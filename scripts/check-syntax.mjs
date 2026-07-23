// Validates every inline <script> block in every *.html file at the repo
// root by parsing it with `new Function(...)`. Catches the class of typo
// that HTML's own file format can't - unlike a plain .js file, a broken
// inline script never gets caught by `node --check` on its own.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const files = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
const failures = [];

for (const file of files) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  const re = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    const tagStart = html.slice(m.index, m.index + m[0].indexOf(">") + 1);
    if (/\bsrc=/.test(tagStart)) continue;
    const code = m[1];
    if (!code.trim()) continue;
    try {
      new Function(code);
    } catch (error) {
      failures.push(file + ": " + error.message);
    }
  }
}

if (failures.length) {
  console.error("Inline <script> syntax errors found:\n" + failures.join("\n"));
  process.exit(1);
}
console.log("OK - inline scripts in " + files.length + " HTML files parse cleanly.");
