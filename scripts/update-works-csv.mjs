import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const R2_HOST = 'pub-ab92f061862e4c32b9117317c7b77334.r2.dev';
const R2 = `https://${R2_HOST}`;

const tracks = [
  ['pedal ambient, soft',       'ambient, soft, harp, pedal',            '/content/videos/track-01-final.mp4?v=5',  `${R2}/posters/track-01-crop.jpg`, `${R2}/audio/track-1-pedal-ambient-soft.mp3`],
  ['dark mystical epiphany',    'dark, mystical, ambient, pedal',         '/content/videos/track-02-final.mp4?v=5',  `${R2}/posters/track-02-crop.jpg`, `${R2}/audio/track-2---pedal-ambient-dark-epiphany.mp3`],
  ["it is or isn't",            'haunting, electronic, harp, cinematic',  '/content/videos/track-03-final.mp4?v=5',  `${R2}/posters/track-03-crop.jpg`, `${R2}/audio/track-3-it-is-or-isnt-instrumental--haunting-electronic-harp.wav`],
  ['menial job',                'bittersweet, melodic, warm, minimal',     '/content/videos/track-04-final.mp4?v=5',  `${R2}/posters/track-04-crop.jpg`, `${R2}/audio/track-4---menial-job---bittersweet.wav`],
  ['birthday',                  'sweet, minimal, light, celebratory',      '/content/videos/track-05-final.mp4?v=1',  `${R2}/posters/track-05-crop.png`, `${R2}/audio/track-5-birthday---sweet-minimal-.mp3`],
  ['any x zodanos lyra',        'ambient, mystical, soft, harp',           '/content/videos/track-06-final.mp4?v=1',  `${R2}/posters/track-06-crop.jpg`, `${R2}/audio/track-6-any-x-zodanos-lyra.wav`],
  ['atmanic',                   'mystical, ambient, cinematic, soft',      '/content/videos/track-07-final.mp4?v=1',  `${R2}/posters/track-07-crop.jpg`, `${R2}/audio/track-7-atmanic.mp3`],
  ['formless',                  'minimal, ambient, light, soft',           '/content/videos/track-08-final.mp4?v=1',  `${R2}/posters/track-08-crop.jpg`, `${R2}/audio/track-8-formless.mp3`],
  ['higher than love',          'bittersweet, warm, melodic, sweet',       '/content/videos/track-09-final.mp4?v=1',  `${R2}/posters/track-09-crop.jpg`, `${R2}/audio/track-9-higher-than-love.mp3`],
];

const desc = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

function csvEscape(val) {
  if (!val) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const header = 'title,description,tags,year,video_url,thumbnail_url,audio_url,active';
const rows = tracks.map(t => [
  csvEscape(t[0]),
  csvEscape(desc),
  csvEscape(t[1]),
  '2026',
  t[2],
  t[3],
  t[4],
  'yes',
].join(','));

const csv = [header, ...rows].join('\n') + '\n';
writeFileSync(resolve(import.meta.dirname, '../data/sheets-import/works.csv'), csv);
console.log(csv);
