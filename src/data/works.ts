import type { TagDefinition, Work } from '../lib/types';

export const works: Work[] = [
  {
    id: 'track-01',
    title: 'pedal ambient, soft',
    description: 'A gentle harp-led ambient piece with soft pedal textures and a calm, open atmosphere.',
    tags: ['ambient', 'soft', 'harp', 'pedal'],
    scenes: [
      {
        id: 'scene-01',
        videoUrl: '/content/videos/track-01-final.mp4?v=5',
        thumbnail: '/content/posters/track-01-crop.jpg?v=2',
      },
    ],
    meta: { year: '2026', location: 'local', format: 'hardcoded video' },
  },
  {
    id: 'track-02',
    title: 'dark mystical epiphany',
    description: 'Slow-building ambient darkness that opens into a luminous, mystical turn.',
    tags: ['dark', 'mystical', 'ambient', 'pedal'],
    scenes: [
      {
        id: 'scene-01',
        videoUrl: '/content/videos/track-02-final.mp4?v=5',
        thumbnail: '/content/posters/track-02-crop.jpg?v=2',
      },
    ],
    meta: { year: '2026', location: 'local', format: 'hardcoded video' },
  },
  {
    id: 'track-03',
    title: "it is or isn't",
    description: 'Haunting electronic layers woven with harp — suspended, questioning, and cinematic.',
    tags: ['haunting', 'electronic', 'harp', 'cinematic'],
    scenes: [
      {
        id: 'scene-01',
        videoUrl: '/content/videos/track-03-final.mp4?v=5',
        thumbnail: '/content/posters/track-03-crop.jpg?v=2',
      },
    ],
    meta: { year: '2026', location: 'local', format: 'hardcoded video' },
  },
  {
    id: 'track-04',
    title: 'menial job',
    description: 'Bittersweet melody with a restrained pulse — everyday weight rendered in warm tones.',
    tags: ['bittersweet', 'melodic', 'warm', 'minimal'],
    scenes: [
      {
        id: 'scene-01',
        videoUrl: '/content/videos/track-04-final.mp4?v=5',
        thumbnail: '/content/posters/track-04-crop.jpg?v=2',
      },
    ],
    meta: { year: '2026', location: 'local', format: 'hardcoded video' },
  },
  {
    id: 'track-05',
    title: 'birthday',
    description: 'Sweet and minimal — a light, celebratory sketch with airy space and soft harmony.',
    tags: ['sweet', 'minimal', 'light', 'celebratory'],
    scenes: [
      {
        id: 'scene-01',
        videoUrl: '/content/videos/track-05-final.mp4?v=5',
        thumbnail: '/content/posters/track-05-crop.png?v=2',
      },
    ],
    meta: { year: '2026', location: 'local', format: 'hardcoded video' },
  },
  {
    id: 'track-06',
    title: 'any x zodanos lyra',
    description: 'A collaborative lyra piece — spacious, resonant, and gently unfolding.',
    tags: ['ambient', 'mystical', 'soft', 'harp'],
    scenes: [
      {
        id: 'scene-01',
        videoUrl: '/content/videos/track-06-final.mp4?v=1',
        thumbnail: '/content/posters/track-06-crop.jpg?v=1',
      },
    ],
    meta: { year: '2026', location: 'local', format: 'hardcoded video' },
  },
  {
    id: 'track-07',
    title: 'atmanic',
    description: 'Meditative layers that drift between stillness and a slow, inward glow.',
    tags: ['mystical', 'ambient', 'cinematic', 'soft'],
    scenes: [
      {
        id: 'scene-01',
        videoUrl: '/content/videos/track-07-final.mp4?v=1',
        thumbnail: '/content/posters/track-07-crop.jpg?v=1',
      },
    ],
    meta: { year: '2026', location: 'local', format: 'hardcoded video' },
  },
  {
    id: 'track-08',
    title: 'formless',
    description: 'Open, weightless textures — shapeless harmony in pale, minimal light.',
    tags: ['minimal', 'ambient', 'light', 'soft'],
    scenes: [
      {
        id: 'scene-01',
        videoUrl: '/content/videos/track-08-final.mp4?v=1',
        thumbnail: '/content/posters/track-08-crop.jpg?v=1',
      },
    ],
    meta: { year: '2026', location: 'local', format: 'hardcoded video' },
  },
  {
    id: 'track-09',
    title: 'higher than love',
    description: 'Warm melodic lines lifted above sentiment — tender, expansive, and bittersweet.',
    tags: ['bittersweet', 'warm', 'melodic', 'sweet'],
    scenes: [
      {
        id: 'scene-01',
        videoUrl: '/content/videos/track-09-final.mp4?v=1',
        thumbnail: '/content/posters/track-09-crop.jpg?v=1',
      },
    ],
    meta: { year: '2026', location: 'local', format: 'hardcoded video' },
  },
];

export const moodTags: TagDefinition[] = [
  { id: 'ambient', label: 'ambient', category: 'mood' },
  { id: 'soft', label: 'soft', category: 'mood' },
  { id: 'dark', label: 'dark', category: 'mood' },
  { id: 'mystical', label: 'mystical', category: 'mood' },
  { id: 'haunting', label: 'haunting', category: 'mood' },
  { id: 'cinematic', label: 'cinematic', category: 'mood' },
  { id: 'bittersweet', label: 'bittersweet', category: 'mood' },
  { id: 'warm', label: 'warm', category: 'mood' },
  { id: 'minimal', label: 'minimal', category: 'mood' },
  { id: 'sweet', label: 'sweet', category: 'mood' },
  { id: 'light', label: 'light', category: 'mood' },
  { id: 'celebratory', label: 'celebratory', category: 'mood' },
  { id: 'melodic', label: 'melodic', category: 'mood' },
  { id: 'electronic', label: 'electronic', category: 'mood' },
];

export const instrumentTags: TagDefinition[] = [
  { id: 'harp', label: 'harp', category: 'instrument' },
  { id: 'pedal', label: 'pedal', category: 'instrument' },
  { id: 'piano', label: 'piano', category: 'instrument' },
  { id: 'synth', label: 'synth', category: 'instrument' },
  { id: 'strings', label: 'strings', category: 'instrument' },
  { id: 'voice', label: 'voice', category: 'instrument' },
  { id: 'field-recording', label: 'field recording', category: 'instrument' },
];

export const allSearchTags: TagDefinition[] = [...moodTags, ...instrumentTags];

export function getWorksForTag(tagId: string): Work[] {
  return works.filter((work) => work.tags?.includes(tagId));
}
