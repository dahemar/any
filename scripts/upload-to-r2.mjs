import { S3Client, PutObjectCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';

const ACCOUNT_ID = 'e6267ea7445e0a0b9e1f7c72188fe6e3';
const BUCKET = 'any-media';

const s3 = new S3Client({
  region: 'weur',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: 'bc594ae0fd239b3af407a5dbea83efb8',
    secretAccessKey: '220818aa6838f8cc5aaa23e8aefb1b182eeb8d5393117381773af9e8ea9a1745',
  },
  forcePathStyle: true,
});

const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
};

function mime(p) { return MIME[extname(p).toLowerCase()] || 'application/octet-stream'; }

const TRACK_ALIAS = {
  1: 'track-01', 2: 'track-02', 3: 'track-03', 4: 'track-04',
  5: 'track-05', 6: 'track-06', 7: 'track-07', 8: 'track-08', 9: 'track-09',
};

const POSTER_MAP = {
  'track-01-crop.jpg': 'track-01', 'track-02-crop.jpg': 'track-02',
  'track-03-crop.jpg': 'track-03', 'track-04-crop.jpg': 'track-04',
  'track-05-crop.png': 'track-05', 'track-06-crop.jpg': 'track-06',
  'track-07-crop.jpg': 'track-07', 'track-08-crop.jpg': 'track-08',
  'track-09-crop.jpg': 'track-09',
};

const RAW_AUDIO_MAP = {
  'track-1-pedal-ambient-soft.mp3': 'track-01',
  'track-2---pedal-ambient-dark-epiphany.mp3': 'track-02',
  'track-3-it-is-or-isnt-instrumental--haunting-electronic-harp.wav': 'track-03',
  'track-4---menial-job---bittersweet.wav': 'track-04',
  'track-5-birthday---sweet-minimal.mp3': 'track-05',
  'track-6-any-x-zodanos-lyra.wav': 'track-06',
  'track-7-atmanic.mp3': 'track-07',
  'track-8-formless.mp3': 'track-08',
  'track-9-higher-than-love.mp3': 'track-09',
};

async function upload(localPath, key, type) {
  const body = readFileSync(localPath);
  const cmd = new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: body,
    ContentType: type || mime(localPath),
  });
  await s3.send(cmd);
  console.log(`  ✓ ${key} (${(body.length / 1024 / 1024).toFixed(1)} MB)`);
}

async function setBucketPolicy() {
  const policy = {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: { Anonymous: ['*'] },
      Action: ['s3:GetObject'],
      Resource: [`arn:aws:s3:::${BUCKET}/*`],
    }],
  };
  try {
    await s3.send(new PutBucketPolicyCommand({
      Bucket: BUCKET,
      Policy: JSON.stringify(policy),
    }));
    console.log('  ✓ Public bucket policy set');
  } catch (err) {
    console.log(`  ⚠ Bucket policy not supported: ${err.message}`);
  }
}

async function main() {
  const base = resolve(import.meta.dirname, '..');
  const postersDir = join(base, 'public/content/posters');
  const audioDir = join(base, 'content');
  const mapping = [];

  console.log('Setting bucket policy...');
  await setBucketPolicy();

  console.log('\n=== Uploading poster images ===');
  const posterFiles = readdirSync(postersDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  for (const file of posterFiles) {
    const key = `posters/${file}`;
    await upload(join(postersDir, file), key);
    const trackId = POSTER_MAP[file];
    mapping.push({ type: 'poster', trackId, file, key });
  }

  console.log('\n=== Uploading raw audio files ===');
  const audioFiles = readdirSync(audioDir).filter(f => /\.(mp3|wav)$/i.test(f));
  for (const file of audioFiles) {
    const key = `audio/${file.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase()}`;
    await upload(join(audioDir, file), key);

    const sanitized = file.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
    const trackId = RAW_AUDIO_MAP[sanitized] || null;
    if (trackId) {
      mapping.push({ type: 'audio', trackId, file, key });
    }
  }

  console.log('\n=== Uploading raw album art images ===');
  const imageFiles = readdirSync(audioDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  for (const file of imageFiles) {
    const key = `images/${file.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase()}`;
    await upload(join(audioDir, file), key);
    mapping.push({ type: 'image', trackId: null, file, key });
  }

  const r2dev = `pub-${ACCOUNT_ID}.r2.dev`; // placeholder — real host from dashboard
  console.log('\n=== MAPPING ===');
  console.log('NOTE: Enable r2.dev in Cloudflare Dashboard → R2 → any-media → Settings → Public Development URL');
  console.log('Then the public URLs will be: https://<r2dev-host>/<key>\n');

  for (const m of mapping) {
    console.log(`  [${m.type}] Track ${m.trackId || '?'}: ${m.key}`);
  }

  writeFileSync(join(base, '.cache/r2-mapping.json'), JSON.stringify(mapping, null, 2));
  console.log('\nMapping saved to .cache/r2-mapping.json');
}

main().catch(err => { console.error(err); process.exit(1); });
