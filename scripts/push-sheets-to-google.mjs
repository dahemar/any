/**
 * Sube works / credits / tags a una hoja compartida con el service account.
 *
 * Comparte la hoja con sheets-writer@web-cora.iam.gserviceaccount.com (Editor)
 * y como enlace público (Lector) para la API key.
 *
 * node scripts/push-sheets-to-google.mjs
 * node scripts/push-sheets-to-google.mjs 1aMXXwMw9riTdR04_ykHXajCeHc9sGOzZSzPmPrFQWSc
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const importDir = path.resolve(__dirname, '../data/sheets-import');

const DEFAULT_SPREADSHEET_ID = '1aMXXwMw9riTdR04_ykHXajCeHc9sGOzZSzPmPrFQWSc';
const spreadsheetId = (process.argv[2] || DEFAULT_SPREADSHEET_ID).trim();
const TAB_NAMES = ['works', 'credits', 'tags'];

const CREDENTIAL_CANDIDATES = [
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
  path.resolve(__dirname, '../../web-cora-ac37b5dec5b1.json'),
].filter(Boolean);

function parseCsv(text) {
  const rows = [];
  for (const line of text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')) {
    if (!line.trim()) continue;
    const row = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) {
        row.push(cur);
        cur = '';
        continue;
      }
      cur += ch;
    }
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function loadSheetCsv(name) {
  return parseCsv(fs.readFileSync(path.join(importDir, `${name}.csv`), 'utf8'));
}

async function main() {
  const credPath = CREDENTIAL_CANDIDATES.find((p) => fs.existsSync(p));
  if (!credPath) {
    console.error('No service account. Importa manualmente los CSV de data/sheets-import/');
    process.exit(1);
  }

  const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

  let meta;
  try {
    meta = await sheets.spreadsheets.get({ spreadsheetId });
  } catch {
    console.error(
      'Sin acceso. Comparte la hoja con sheets-writer@web-cora.iam.gserviceaccount.com (Editor).'
    );
    process.exit(1);
  }

  const existing = new Set((meta.data.sheets || []).map((s) => s.properties?.title));
  const requests = [];

  for (const tab of TAB_NAMES) {
    if (!existing.has(tab)) {
      requests.push({ addSheet: { properties: { title: tab } } });
    }
  }

  const staleTabs = ['scenes', 'any_works', 'any_scenes', 'any_credits', 'any_tags'];
  for (const sheet of meta.data.sheets || []) {
    const title = sheet.properties?.title;
    if (staleTabs.includes(title)) {
      requests.push({ deleteSheet: { sheetId: sheet.properties.sheetId } });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  }

  for (const tab of TAB_NAMES) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: loadSheetCsv(tab) },
    });
    console.log('Updated', tab);
  }

  console.log(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
  console.log('Comparte la hoja: Cualquier persona con el enlace → Lector (para la API key).');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
