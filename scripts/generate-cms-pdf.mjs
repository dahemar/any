import puppeteer from 'puppeteer';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 2cm 2.2cm; size: A4; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #1a1a1a; line-height: 1.6; font-size: 12pt; max-width: 100%; }
  h1 { font-size: 26pt; font-weight: 700; margin: 0 0 4pt; letter-spacing: -0.02em; }
  h2 { font-size: 16pt; font-weight: 600; margin: 28pt 0 8pt; border-bottom: 2px solid #e0e0e0; padding-bottom: 4pt; }
  h3 { font-size: 12pt; font-weight: 600; margin: 16pt 0 4pt; color: #333; }
  p { margin: 0 0 8pt; color: #444; }
  .subtitle { font-size: 12pt; color: #888; margin: 0 0 24pt; }
  table { width: 100%; border-collapse: collapse; margin: 10pt 0 18pt; font-size: 10.5pt; }
  th { background: #f5f5f5; text-align: left; padding: 6pt 8pt; font-weight: 600; border-bottom: 2px solid #ccc; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.03em; color: #555; }
  td { padding: 6pt 8pt; border-bottom: 1px solid #e8e8e8; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  code { background: #f0f0f0; padding: 1pt 5pt; border-radius: 3pt; font-size: 9.5pt; font-family: 'SF Mono', 'Menlo', 'Monaco', monospace; }
  .sheet-box { border: 1px solid #e0e0e0; border-radius: 6pt; padding: 12pt 14pt; margin: 14pt 0; background: #fafafa; }
  .sheet-box h3 { margin-top: 0; }
  .emoji { font-size: 14pt; }
  .note { background: #fff8e1; border-left: 3px solid #f0c040; padding: 8pt 12pt; margin: 12pt 0; border-radius: 0 4pt 4pt 0; font-size: 10.5pt; }
  .note strong { color: #b8860b; }
  .footer { margin-top: 32pt; padding-top: 8pt; border-top: 1px solid #e0e0e0; font-size: 9pt; color: #999; text-align: center; }
  .cols-2 { display: flex; gap: 16pt; }
  .cols-2 > * { flex: 1; }
  .tag { display: inline-block; background: #f0f0f0; padding: 2pt 7pt; border-radius: 10pt; font-size: 9pt; margin: 1pt 2pt; }
  ul { margin: 4pt 0 8pt; padding-left: 18pt; }
  li { margin-bottom: 3pt; font-size: 10.5pt; color: #444; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<h1>Google Sheets CMS</h1>
<p class="subtitle">Content management guide for the archive</p>

<p>This archive uses a Google Sheets spreadsheet as its CMS. Edit the spreadsheet to update titles, descriptions, tags, credits, and media URLs. Changes appear on the site automatically.</p>

<div class="sheet-box">
  <strong>Spreadsheet URL:</strong><br>
  <code>docs.google.com/spreadsheets/d/1aMXXwMw9riTdR04_ykHXajCeHc9sGOzZSzPmPrFQWSc</code>
</div>

<h2>Sheet 1: works</h2>
<p>The main content sheet. Each row is one track.</p>

<table>
<tr><th>Column</th><th>Required</th><th>What it does</th></tr>
<tr><td><code>title</code></td><td>Yes</td><td>Track title. Also auto-generates the internal ID (slug).</td></tr>
<tr><td><code>description</code></td><td>No</td><td>Description shown in the credits panel. Leave empty for no description.</td></tr>
<tr><td><code>tags</code></td><td>No</td><td>Comma-separated tags. Must match tags defined in the <em>tags</em> sheet. Examples: <span class="tag">ambient</span> <span class="tag">harp</span> <span class="tag">soft</span></td></tr>
<tr><td><code>year</code></td><td>No</td><td>Release year (e.g. <code>2026</code>). Display only.</td></tr>
<tr><td><code>video_url</code></td><td>No</td><td>URL to the video file. Can be a local path (<code>/content/videos/track-01-final.mp4</code>) or a full URL.</td></tr>
<tr><td><code>thumbnail_url</code></td><td>No</td><td>URL to the thumbnail image. Same format as video_url.</td></tr>
<tr><td><code>audio_url</code></td><td>No</td><td>URL to a separate audio file. Leave empty if audio is embedded in the video.</td></tr>
<tr><td><code>active</code></td><td>No</td><td>Visibility toggle. <code>yes</code> = visible (default). Any other value = hidden.</td></tr>
</table>

<div class="note">
  <strong>Note:</strong> There is no <code>id</code> or <code>order</code> column. The ID is auto-generated from the title, and the order follows the row position in the sheet.
</div>

<h3>Example row</h3>
<table>
<tr><th>title</th><th>description</th><th>tags</th><th>year</th><th>video_url</th><th>thumbnail_url</th><th>audio_url</th><th>active</th></tr>
<tr>
  <td>pedal ambient, soft</td>
  <td>A quiet, harp-driven ambient piece.</td>
  <td>ambient, soft, harp, pedal</td>
  <td>2026</td>
  <td>/content/videos/track-01-final.mp4</td>
  <td>https://r2.dev/posters/track-01-crop.jpg</td>
  <td>https://r2.dev/audio/track-01.mp3</td>
  <td>yes</td>
</tr>
</table>

<div class="page-break"></div>

<h2>Sheet 2: credits</h2>
<p>Links contributors to tracks. One row per credit entry.</p>

<table>
<tr><th>Column</th><th>Required</th><th>What it does</th></tr>
<tr><td><code>title</code></td><td>Yes</td><td>The title of the track this credit belongs to (exact match). Example: <code>pedal ambient, soft</code></td></tr>
<tr><td><code>role</code></td><td>Yes</td><td>Credit role. Examples: <code>composition</code>, <code>production</code>, <code>mixing</code>, <code>mastering</code>.</td></tr>
<tr><td><code>name</code></td><td>No</td><td>Person or entity name. Leave empty if the role itself is self-explanatory.</td></tr>
<tr><td><code>active</code></td><td>No</td><td>Same as works: <code>yes</code> = visible, anything else = hidden.</td></tr>
</table>

<div class="note">
  <strong>How linking works:</strong> Write the full track title exactly as it appears in the <em>works</em> sheet. The system matches by title automatically. Order follows row position.
</div>

<h3>Example rows</h3>
<table>
<tr><th>title</th><th>role</th><th>name</th><th>active</th></tr>
<tr><td>pedal ambient, soft</td><td>composition</td><td>any</td><td>yes</td></tr>
<tr><td>pedal ambient, soft</td><td>production</td><td></td><td>yes</td></tr>
<tr><td>dark mystical epiphany</td><td>composition</td><td>any</td><td>yes</td></tr>
</table>

<div class="page-break"></div>

<h2>Sheet 3: tags</h2>
<p>Defines the available tags. Tags not listed here won't appear in the filter UI.</p>

<table>
<tr><th>Column</th><th>Required</th><th>What it does</th></tr>
<tr><td><code>id</code></td><td>Yes</td><td>Tag identifier (lowercase). Used in the <em>works</em> sheet and filter buttons.</td></tr>
<tr><td><code>category</code></td><td>Yes</td><td>Either <code>mood</code> or <code>instrument</code>. Controls which filter group the tag appears in.</td></tr>
<tr><td><code>active</code></td><td>No</td><td><code>yes</code> = visible. Anything else = hidden from the UI.</td></tr>
</table>

<h3>Example rows</h3>
<table>
<tr><th>id</th><th>category</th><th>active</th></tr>
<tr><td>ambient</td><td>mood</td><td>yes</td></tr>
<tr><td>dark</td><td>mood</td><td>yes</td></tr>
<tr><td>soft</td><td>mood</td><td>yes</td></tr>
<tr><td>harp</td><td>instrument</td><td>yes</td></tr>
<tr><td>pedal</td><td>instrument</td><td>yes</td></tr>
<tr><td>synth</td><td>instrument</td><td>no</td></tr>
</table>

<h2>Quick Reference</h2>

<div class="cols-2">
<div>
<h3>Adding a new track</h3>
<ol>
  <li>Add a row to the <strong>works</strong> sheet.</li>
  <li>Fill in <code>title</code>, <code>tags</code>, and media URLs.</li>
  <li>Add credits in the <strong>credits</strong> sheet using the track title as reference.</li>
  <li>New tags need an entry in the <strong>tags</strong> sheet first.</li>
</ol>
</div>
<div>
<h3>Hiding a track</h3>
<ol>
  <li>Set the <code>active</code> column to <code>no</code> (or anything other than <code>yes</code>).</li>
  <li>The track disappears from the site on next load.</li>
  <li>To restore, set <code>active</code> back to <code>yes</code>.</li>
</ol>
</div>
</div>

<div class="note">
  <strong>Changes are not instant.</strong> The site caches data for performance. Changes appear within a few minutes, or immediately after a redeploy.
</div>

<div class="footer">
  Generated &bull; CMS guide &bull; Page 1
</div>

</body>
</html>`;

const outPath = resolve(import.meta.dirname, '../docs/google-sheets-cms-guide.pdf');

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.pdf({ path: outPath, format: 'A4', printBackground: true, margin: { top: '2cm', bottom: '2cm', left: '2.2cm', right: '2.2cm' } });
await browser.close();
console.log('PDF created:', outPath);
