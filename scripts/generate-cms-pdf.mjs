import puppeteer from 'puppeteer';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page { margin: 2cm 2.2cm; size: A4; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; color: #1a1a1a; line-height: 1.55; font-size: 11pt; }
  h1 { font-size: 24pt; font-weight: 700; margin: 0 0 2pt; letter-spacing: -0.02em; }
  h2 { font-size: 14pt; font-weight: 600; margin: 22pt 0 6pt; border-bottom: 2px solid #e0e0e0; padding-bottom: 3pt; }
  p { margin: 0 0 6pt; color: #444; }
  .subtitle { font-size: 11pt; color: #999; margin: 0 0 18pt; }
  table { width: 100%; border-collapse: collapse; margin: 8pt 0 14pt; font-size: 10pt; }
  th { background: #f5f5f5; text-align: left; padding: 5pt 7pt; font-weight: 600; border-bottom: 2px solid #ccc; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.03em; color: #555; }
  td { padding: 5pt 7pt; border-bottom: 1px solid #e8e8e8; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  code { background: #f0f0f0; padding: 1pt 4pt; border-radius: 3pt; font-size: 9.5pt; font-family: 'SF Mono', 'Menlo', monospace; }
  .sheet-box { border: 1px solid #e0e0e0; border-radius: 5pt; padding: 10pt 12pt; margin: 10pt 0; background: #fafafa; }
  .sheet-box strong { display: block; margin-bottom: 2pt; }
  .cols-2 { display: flex; gap: 14pt; }
  .cols-2 > * { flex: 1; }
  .footer { margin-top: 24pt; padding-top: 6pt; border-top: 1px solid #e0e0e0; font-size: 8pt; color: #bbb; text-align: center; }
</style>
</head>
<body>

<h1>Google Sheets CMS</h1>
<p class="subtitle">How to manage content on the archive</p>

<p>Edit the spreadsheet below to add tracks, update credits, or change tags. The site picks up changes automatically.</p>

<div class="sheet-box">
  <strong>Spreadsheet</strong>
  <code>docs.google.com/spreadsheets/d/1aMXXwMw9riTdR04_ykHXajCeHc9sGOzZSzPmPrFQWSc</code>
</div>

<h2>intro</h2>
<p>Controls the hero section text at the top of the page.</p>

<table>
<tr><th>Column</th><th>What to put</th></tr>
<tr><td><code>title</code></td><td>Main heading. Required.</td></tr>
<tr><td><code>description</code></td><td>Body text. Use <code>||</code> to separate paragraphs.</td></tr>
<tr><td><code>active</code></td><td><code>yes</code> = visible. <code>no</code> = hidden.</td></tr>
</table>

<h2>works</h2>
<p>Each row is one track.</p>

<table>
<tr><th>Column</th><th>What to put</th></tr>
<tr><td><code>title</code></td><td>Track title. Required.</td></tr>
<tr><td><code>description</code></td><td>Short description shown in the info panel. Optional.</td></tr>
<tr><td><code>tags</code></td><td>Comma-separated keywords. Must match tags listed in the <em>tags</em> sheet.</td></tr>
<tr><td><code>year</code></td><td>Release year (e.g. <code>2026</code>).</td></tr>
<tr><td><code>video_url</code></td><td>Link to the video file.</td></tr>
<tr><td><code>thumbnail_url</code></td><td>Link to the thumbnail image.</td></tr>
<tr><td><code>audio_url</code></td><td>Link to a separate audio file. Leave blank if audio is already in the video.</td></tr>
<tr><td><code>active</code></td><td><code>yes</code> = visible. Leave blank or write <code>no</code> to hide.</td></tr>
</table>

<h2>credits</h2>
<p>Each row links a person to a track.</p>

<table>
<tr><th>Column</th><th>What to put</th></tr>
<tr><td><code>title</code></td><td>The track title, exactly as written in <em>works</em>. Required.</td></tr>
<tr><td><code>role</code></td><td>Role name (e.g. <code>composition</code>, <code>mixing</code>, <code>mastering</code>). Required.</td></tr>
<tr><td><code>name</code></td><td>Person or group name. Optional.</td></tr>
<tr><td><code>active</code></td><td><code>yes</code> = visible. Leave blank or write <code>no</code> to hide.</td></tr>
</table>

<h2>tags</h2>
<p>Defines which tags are available. Rows here control the filter buttons on the site.</p>

<table>
<tr><th>Column</th><th>What to put</th></tr>
<tr><td><code>id</code></td><td>Tag name, lowercase (e.g. <code>ambient</code>, <code>harp</code>). Required.</td></tr>
<tr><td><code>category</code></td><td><code>mood</code> or <code>instrument</code>. Required.</td></tr>
<tr><td><code>active</code></td><td><code>yes</code> = visible. <code>no</code> = hidden.</td></tr>
</table>

<h2>Quick how-to</h2>

<div class="cols-2">
<div>
<p><strong>Add a track</strong></p>
<p>Add a row in <em>works</em> with a title and tags. Then add credits for it in <em>credits</em> using the same title. New tags need an entry in <em>tags</em> first.</p>
</div>
<div>
<p><strong>Hide a track</strong></p>
<p>Change <code>active</code> to <code>no</code>. The track disappears from the site. Change it back to <code>yes</code> to restore it.</p>
</div>
</div>

<div class="footer">CMS guide</div>

</body>
</html>`;

const outPath = resolve(import.meta.dirname, '../docs/google-sheets-cms-guide.pdf');

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.pdf({ path: outPath, format: 'A4', printBackground: true, margin: { top: '2cm', bottom: '2cm', left: '2.2cm', right: '2.2cm' } });
await browser.close();
console.log('PDF created:', outPath);
