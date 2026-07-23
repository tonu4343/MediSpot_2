import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sourceDir = "C:/new project/新しいフォルダー/Medi Job/サービス一覧";
const outputDir = "C:/new project/新しいフォルダー/Medi Job/assets/outputs/service_workbooks";
const outputPath = path.join(outputDir, "Medi Job_サービス一覧_統合版.xlsx");
const previewDir = path.join(outputDir, "previews");

const sources = [
  { file: "求職者向けサービス.xlsx", sheet: "求職者向け", table: "SeekerServices" },
  { file: "求人者向けサービス.xlsx", sheet: "求人者向け", table: "EmployerServices" },
  { file: "運営管理者向けサービス.xlsx", sheet: "運営管理者向け", table: "AdminServices" },
  { file: "共通・その他.xlsx", sheet: "共通・その他", table: "CommonServices" },
];

const combined = Workbook.create();
for (const spec of sources) {
  const inputBook = await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(sourceDir, spec.file)));
  const inputSheet = inputBook.worksheets.getItemAt(0);
  const inputRange = inputSheet.getUsedRange(true);
  const values = inputRange.values;
  const rows = values.length;

  const sheet = combined.worksheets.add(spec.sheet);
  const target = sheet.getRange(`A1:E${rows}`);
  target.values = values;
  target.format = {
    font: { typeface: "Yu Gothic", fontSize: 10, color: "#1F2937" },
    verticalAlignment: "center",
    wrapText: true,
  };

  sheet.getRange("A1:E1").format = {
    fill: "#1565C0",
    font: { typeface: "Yu Gothic", fontSize: 10, bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    rowHeight: 28,
  };

  const body = sheet.getRange(`A2:E${rows}`);
  body.format.borders = {
    top: { style: "thin", color: "#D9E2F3" },
    bottom: { style: "thin", color: "#D9E2F3" },
    left: { style: "thin", color: "#D9E2F3" },
    right: { style: "thin", color: "#D9E2F3" },
  };
  body.format.rowHeight = 43;

  sheet.getRange(`A2:A${rows}`).format.font = { typeface: "Yu Gothic", fontSize: 10, bold: true, color: "#1F2937" };
  sheet.getRange(`B2:B${rows}`).format.font = { typeface: "Consolas", fontSize: 9, color: "#334155" };
  sheet.getRange(`D2:D${rows}`).format = {
    font: { typeface: "Yu Gothic", fontSize: 9, bold: true, color: "#1F2937" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
  };

  for (let r = 2; r <= rows; r += 1) {
    const status = String(values[r - 1][3] ?? "");
    const cell = sheet.getRange(`D${r}`);
    if (status.startsWith("実装済み")) {
      cell.format.fill = "#C6EFCE";
      cell.format.font = { typeface: "Yu Gothic", fontSize: 9, bold: true, color: "#006100" };
    } else if (status.includes("プロトタイプ") || status.includes("準備中") || status.includes("要設定")) {
      cell.format.fill = "#FFEB9C";
      cell.format.font = { typeface: "Yu Gothic", fontSize: 9, bold: true, color: "#9C6500" };
    } else if (status.includes("未実装")) {
      cell.format.fill = "#FFC7CE";
      cell.format.font = { typeface: "Yu Gothic", fontSize: 9, bold: true, color: "#9C0006" };
    }
  }

  sheet.getRange(`A1:A${rows}`).format.columnWidth = 24;
  sheet.getRange(`B1:B${rows}`).format.columnWidth = 28;
  sheet.getRange(`C1:C${rows}`).format.columnWidth = 48;
  sheet.getRange(`D1:D${rows}`).format.columnWidth = 24;
  sheet.getRange(`E1:E${rows}`).format.columnWidth = 58;
  sheet.freezePanes.freezeRows(1);
  sheet.showGridLines = false;

  const table = sheet.tables.add(`A1:E${rows}`, true, spec.table);
  table.style = "TableStyleMedium2";
  table.showBandedRows = true;
  table.showFilterButton = true;

  // Reapply the status colors after table styling so implementation state remains scannable.
  for (let r = 2; r <= rows; r += 1) {
    const status = String(values[r - 1][3] ?? "");
    const cell = sheet.getRange(`D${r}`);
    if (status.startsWith("実装済み")) {
      cell.format.fill = "#C6EFCE";
      cell.format.font = { typeface: "Yu Gothic", fontSize: 9, bold: true, color: "#006100" };
    } else if (status.includes("プロトタイプ") || status.includes("準備中") || status.includes("要設定")) {
      cell.format.fill = "#FFEB9C";
      cell.format.font = { typeface: "Yu Gothic", fontSize: 9, bold: true, color: "#9C6500" };
    } else if (status.includes("未実装")) {
      cell.format.fill = "#FFC7CE";
      cell.format.font = { typeface: "Yu Gothic", fontSize: 9, bold: true, color: "#9C0006" };
    }
  }
}

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

for (const spec of sources) {
  const preview = await combined.render({ sheetName: spec.sheet, autoCrop: "all", scale: 1.25, format: "png" });
  await fs.writeFile(path.join(previewDir, `${spec.sheet}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const check = await combined.inspect({
  kind: "workbook,sheet,table",
  maxChars: 9000,
  tableMaxRows: 16,
  tableMaxCols: 5,
  tableMaxCellChars: 140,
});
console.log(check.ndjson);

const errors = await combined.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const output = await SpreadsheetFile.exportXlsx(combined);
await output.save(outputPath);
console.log(`SAVED ${outputPath}`);
