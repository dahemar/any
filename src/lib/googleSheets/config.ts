import {
  DEFAULT_GOOGLE_SHEETS_API_KEY,
  DEFAULT_GOOGLE_SHEETS_SPREADSHEET_ID,
} from './defaults';

const trim = (value: string | undefined) => String(value ?? '').trim();

export const googleSheetsConfig = {
  spreadsheetId:
    trim(import.meta.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? process.env.GOOGLE_SHEETS_SPREADSHEET_ID) ||
    DEFAULT_GOOGLE_SHEETS_SPREADSHEET_ID,
  apiKey:
    trim(import.meta.env.GOOGLE_SHEETS_API_KEY ?? process.env.GOOGLE_SHEETS_API_KEY) ||
    DEFAULT_GOOGLE_SHEETS_API_KEY,
  worksRange: trim(import.meta.env.GOOGLE_SHEETS_WORKS_RANGE ?? process.env.GOOGLE_SHEETS_WORKS_RANGE) || 'works',
  creditsRange:
    trim(import.meta.env.GOOGLE_SHEETS_CREDITS_RANGE ?? process.env.GOOGLE_SHEETS_CREDITS_RANGE) || 'credits',
  tagsRange: trim(import.meta.env.GOOGLE_SHEETS_TAGS_RANGE ?? process.env.GOOGLE_SHEETS_TAGS_RANGE) || 'tags',
};

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(googleSheetsConfig.spreadsheetId && googleSheetsConfig.apiKey);
}
