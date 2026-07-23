import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourceDir = "C:/new project/新しいフォルダー/Medi Job/サービス一覧";
const outDir = "C:/new project/新しいフォルダー/Medi Job/assets/outputs/service_workbooks/inspection";
const names = [
  "運営管理者向けサービス.xlsx",
  "求職者向けサービス.xlsx",
  "求人者向けサービス.xlsx",
  "共通・その他.xlsx",
];

await fs.mkdir(outDir, { recursive: true });
for (const name of names) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(sourceDir, name)));
  const summary = await workbook.inspect({
    kind: "workbook,sheet,table,region,formula,computedStyle",
    maxChars: 12000,
    tableMaxRows: 40,
    tableMaxCols: 12,
    tableMaxCellChars: 160,
    options: { maxResults: 200 },
  });
  console.log(`\n=== ${name} ===\n${summary.ndjson}`);
  const sheets = await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 3000 });
  const sheetRecords = sheets.ndjson.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  for (const record of sheetRecords) {
    const sheetName = record.name ?? record.sheetName;
    if (!sheetName) continue;
    const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1.5, format: "png" });
    const safe = `${path.parse(name).name}_${sheetName}`.replace(/[\\/:*?"<>|]/g, "_");
    await fs.writeFile(path.join(outDir, `${safe}.png`), new Uint8Array(await preview.arrayBuffer()));
  }
}
