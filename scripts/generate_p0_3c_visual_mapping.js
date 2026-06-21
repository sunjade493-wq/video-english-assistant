#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'output_text', 'visual_mapping', 'TBBT_S12E01_word_boxes.json');

const manualWordBoxes = [
  {
    obstacleId: 'real-obstacle-1',
    text: 'believe',
    startMs: 6000,
    endMs: 10000,
    box: { x: 642, y: 856, width: 138, height: 34 },
    confidence: 0.90,
  },
  {
    obstacleId: 'real-obstacle-4',
    text: 'bedsheets',
    startMs: 51500,
    endMs: 53000,
    box: { x: 941, y: 856, width: 190, height: 34 },
    confidence: 0.90,
  },
  {
    obstacleId: 'real-obstacle-5',
    text: 'outside',
    startMs: 51500,
    endMs: 53000,
    box: { x: 1147, y: 856, width: 138, height: 34 },
    confidence: 0.90,
  },
];

const payload = {
  schemaVersion: 'p0-3c-word-boxes-v1',
  episodeId: 'TBBT_S12E01',
  video: {
    src: 'assets/videos/TBBT_S12E01.mp4',
  },
  scope: {
    startMs: 0,
    endMs: 120000,
  },
  coordinateSpace: {
    unit: 'video-pixels',
    width: 1920,
    height: 1080,
    origin: 'top-left',
  },
  runtimePolicy: {
    realtimeOcr: false,
    realtimeAiInference: false,
    coordinateInference: false,
    readOnly: true,
    fallbackWhenUnmapped: true,
  },
  sourceMethod: 'manual-visual-prototype',
  generatedBy: 'scripts/generate_p0_3c_visual_mapping.js',
  notes: [
    'Coordinates are manually calibrated prototype measurements from the real burned subtitle frames.',
    'No OCR.',
    'No runtime inference.',
    'No character-ratio estimation.',
    'Runtime consumes the coordinates as read-only input.',
  ],
  subtitles: [
    {
      startMs: 6000,
      endMs: 10000,
      text: 'Can you believe our little lamb is finally getting married?',
      wordBoxes: manualWordBoxes.filter((box) => box.obstacleId === 'real-obstacle-1'),
    },
    {
      startMs: 51500,
      endMs: 53000,
      text: 'we should hang the bedsheets outside',
      wordBoxes: manualWordBoxes.filter((box) => box.startMs === 51500),
    },
  ],
  wordBoxes: manualWordBoxes,
};

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${OUTPUT_PATH}`);
