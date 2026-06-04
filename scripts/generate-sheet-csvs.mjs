/**
 * Genera CSV para las pestañas works, credits, tags.
 * Run: node scripts/generate-sheet-csvs.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../data/sheets-import');

const works = [
  {
    id: 'track-01',
    title: 'pedal ambient, soft',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    tags: 'ambient, soft, harp, pedal',
    order: 1,
    year: 2026,
    video_url: '/content/videos/track-01-final.mp4?v=5',
    thumbnail_url: '/content/posters/track-01-crop.jpg?v=2',
    audio_url: '',
    active: 'yes',
  },
  {
    id: 'track-02',
    title: 'dark mystical epiphany',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    tags: 'dark, mystical, ambient, pedal',
    order: 2,
    year: 2026,
    video_url: '/content/videos/track-02-final.mp4?v=5',
    thumbnail_url: '/content/posters/track-02-crop.jpg?v=2',
    audio_url: '',
    active: 'yes',
  },
  {
    id: 'track-03',
    title: "it is or isn't",
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    tags: 'haunting, electronic, harp, cinematic',
    order: 3,
    year: 2026,
    video_url: '/content/videos/track-03-final.mp4?v=5',
    thumbnail_url: '/content/posters/track-03-crop.jpg?v=2',
    audio_url: '',
    active: 'yes',
  },
  {
    id: 'track-04',
    title: 'menial job',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    tags: 'bittersweet, melodic, warm, minimal',
    order: 4,
    year: 2026,
    video_url: '/content/videos/track-04-final.mp4?v=5',
    thumbnail_url: '/content/posters/track-04-crop.jpg?v=2',
    audio_url: '',
    active: 'yes',
  },
  {
    id: 'track-05',
    title: 'birthday',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    tags: 'sweet, minimal, light, celebratory',
    order: 5,
    year: 2026,
    video_url: '/content/videos/track-05-final.mp4?v=5',
    thumbnail_url: '/content/posters/track-05-crop.png?v=2',
    audio_url: '',
    active: 'yes',
  },
  {
    id: 'track-06',
    title: 'any x zodanos lyra',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    tags: 'ambient, mystical, soft, harp',
    order: 6,
    year: 2026,
    video_url: '/content/videos/track-06-final.mp4?v=1',
    thumbnail_url: '/content/posters/track-06-crop.jpg?v=1',
    audio_url: '',
    active: 'yes',
  },
  {
    id: 'track-07',
    title: 'atmanic',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    tags: 'mystical, ambient, cinematic, soft',
    order: 7,
    year: 2026,
    video_url: '/content/videos/track-07-final.mp4?v=1',
    thumbnail_url: '/content/posters/track-07-crop.jpg?v=1',
    audio_url: '',
    active: 'yes',
  },
  {
    id: 'track-08',
    title: 'formless',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    tags: 'minimal, ambient, light, soft',
    order: 8,
    year: 2026,
    video_url: '/content/videos/track-08-final.mp4?v=1',
    thumbnail_url: '/content/posters/track-08-crop.jpg?v=1',
    audio_url: '',
    active: 'yes',
  },
  {
    id: 'track-09',
    title: 'higher than love',
    description:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    tags: 'bittersweet, warm, melodic, sweet',
    order: 9,
    year: 2026,
    video_url: '/content/videos/track-09-final.mp4?v=1',
    thumbnail_url: '/content/posters/track-09-crop.jpg?v=1',
    audio_url: '',
    active: 'yes',
  },
];

const credits = [
  { work_id: 'track-01', role: 'composition', name: 'any', order: 1, active: 'yes' },
  { work_id: 'track-01', role: 'production', name: '', order: 2, active: 'yes' },
];

const moodTags = [
  'ambient', 'soft', 'dark', 'mystical', 'haunting', 'cinematic', 'bittersweet', 'warm',
  'minimal', 'sweet', 'light', 'celebratory', 'melodic', 'electronic',
];
const instrumentTags = ['harp', 'pedal', 'piano', 'synth', 'strings', 'voice', 'field-recording'];

function escapeCsv(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers, rows) {
  const lines = [headers.map(escapeCsv).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

const worksHeaders = [
  'id',
  'title',
  'description',
  'tags',
  'order',
  'year',
  'video_url',
  'thumbnail_url',
  'audio_url',
  'active',
];
const creditsHeaders = ['work_id', 'role', 'name', 'order', 'active'];
const tagsHeaders = ['id', 'category', 'active'];

const tagRows = [
  ...moodTags.map((id) => ({ id, category: 'mood', active: 'yes' })),
  ...instrumentTags.map((id) => ({
    id,
    category: 'instrument',
    active: 'yes',
  })),
];

await fs.mkdir(outDir, { recursive: true });

const files = {
  works: toCsv(worksHeaders, works),
  credits: toCsv(creditsHeaders, credits),
  tags: toCsv(tagsHeaders, tagRows),
};

for (const [name, content] of Object.entries(files)) {
  await fs.writeFile(path.join(outDir, `${name}.csv`), content);
}

// Eliminar CSV antiguos con prefijo any_
const oldNames = ['any_works', 'any_scenes', 'any_credits', 'any_tags'];
for (const old of oldNames) {
  try {
    await fs.unlink(path.join(outDir, `${old}.csv`));
  } catch {
    // ignore
  }
}

console.log('Wrote', Object.keys(files).map((n) => `${n}.csv`).join(', '), '→', outDir);
