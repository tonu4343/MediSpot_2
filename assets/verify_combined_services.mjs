import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const outputPath = "C:/new project/新しいフォルダー/Medi Job/assets/outputs/service_workbooks/Medi Job_サービス一覧_統合版.xlsx";
const expected = [
  ["求職者向け", 14],
  ["求人者向け", 14],
  ["運営管理者向け", 11],
  ["共通・その他", 10],
];

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const results = [];
for (let i = 0; i < expected.length; i += 1) {
  const [expectedName, expectedRows] = expected[i];
  const sheet = workbook.worksheets.getItemAt(i);
  const range = sheet.getUsedRange(true);
  const values = range.values;
  if (sheet.name !== expectedName) throw new Error(`Sheet ${i + 1}: expected ${expectedName}, got ${sheet.name}`);
  if (values.length !== expectedRows || values[0].length !== 5) {
    throw new Error(`${expectedName}: expected ${expectedRows}x5, got ${values.length}x${values[0].length}`);
  }
  if (values[0].join("|") !== "画面名|ファイル|主な機能|実装状況|備考") {
    throw new Error(`${expectedName}: header mismatch`);
  }
  results.push({ sheet: sheet.name, rows: values.length, columns: values[0].length, tables: sheet.tables.items.length });
}
console.log(JSON.stringify({ workbook: outputPath, sheetCount: results.length, results }, null, 2));
