#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const subtitlePayload = JSON.parse(fs.readFileSync(path.join(repoRoot, 'output_text/v28d_bilingual_subtitles.json'), 'utf8'));
const subtitleRows = Array.isArray(subtitlePayload) ? subtitlePayload : subtitlePayload.subtitles || subtitlePayload.rows || subtitlePayload.items || [];
const obstaclePayload = JSON.parse(fs.readFileSync(path.join(repoRoot, 'output_text/v29a_obstacles.json'), 'utf8'));
const obstacleRows = Array.isArray(obstaclePayload) ? obstaclePayload : obstaclePayload.obstacles || [];

const FIRST_TWO_MINUTES_MS = 120000;
const VIDEO_WIDTH = 1920;
const VIDEO_HEIGHT = 1080;
const LINE_Y1 = 842;
const LINE_Y2 = 890;
const MARKER_Y1 = 898;
const MARKER_Y2 = 922;
const AVG_CHAR_WIDTH = 24;
const MIN_LINE_WIDTH = 360;

function toMs(secondsString) {
  return Math.round(Number(secondsString) * 1000);
}

function makeBox(x1, y1, x2, y2) {
  return { x1: Math.round(x1), y1, x2: Math.round(x2), y2 };
}

function getLineBox(text) {
  const estimatedWidth = Math.max(MIN_LINE_WIDTH, Math.min(1540, text.length * AVG_CHAR_WIDTH));
  const x1 = (VIDEO_WIDTH - estimatedWidth) / 2;
  return makeBox(x1, LINE_Y1, x1 + estimatedWidth, LINE_Y2);
}

function getRangeBox(text, markerStart, markerEnd, lineBox) {
  const charCount = Math.max(1, text.length);
  const x1 = lineBox.x1 + ((markerStart / charCount) * (lineBox.x2 - lineBox.x1));
  const x2 = lineBox.x1 + ((markerEnd / charCount) * (lineBox.x2 - lineBox.x1));
  return makeBox(x1, LINE_Y1, x2, LINE_Y2);
}

const subtitles = subtitleRows
  .map((row, index) => ({
    id: row.id || `real-subtitle-${index + 1}`,
    text: row.en,
    startMs: toMs(row.start),
    endMs: toMs(row.end),
    index,
  }))
  .filter((row) => row.startMs < FIRST_TWO_MINUTES_MS);

const subtitleByTimeAndText = new Map(subtitles.map((row) => [`${row.startMs}|${row.text}`, row]));

const entriesBySubtitle = new Map();
obstacleRows.forEach((obstacle, obstacleIndex) => {
  const startMs = toMs(obstacle.start);
  if (startMs >= FIRST_TWO_MINUTES_MS) return;
  const subtitle = subtitleByTimeAndText.get(`${startMs}|${obstacle.source_en}`);
  if (!subtitle) return;

  const lineBox = getLineBox(subtitle.text);
  const phraseBox = getRangeBox(subtitle.text, Number(obstacle.markerStart), Number(obstacle.markerEnd), lineBox);
  const obstacleId = obstacle.id || `real-obstacle-${obstacleIndex + 1}`;
  const wordBox = {
    obstacleId,
    text: obstacle.text,
    type: obstacle.type === 'vocabulary' ? 'word' : 'phrase',
    markerStart: Number(obstacle.markerStart),
    markerEnd: Number(obstacle.markerEnd),
    box: phraseBox,
    markerBox: makeBox(phraseBox.x1, MARKER_Y1, phraseBox.x2, MARKER_Y2),
    confidence: 0.72,
    sourceMethod: 'simulated-manual-prototype',
    note: 'P0-3C first-two-minute prototype coordinates are simulated from manually bounded subtitle-line geometry and frozen markerStart/markerEnd; not production OCR.',
  };

  if (!entriesBySubtitle.has(subtitle.id)) {
    entriesBySubtitle.set(subtitle.id, {
      subtitleId: subtitle.id,
      subtitleIndex: subtitle.index,
      startMs: subtitle.startMs,
      endMs: subtitle.endMs,
      text: subtitle.text,
      englishLineBox: lineBox,
      sourceMethod: 'simulated-manual-prototype',
      confidence: 0.72,
      wordBoxes: [],
    });
  }
  entriesBySubtitle.get(subtitle.id).wordBoxes.push(wordBox);
});

const output = {
  schemaVersion: 'p0-3c.visual-mapping.v1',
  episodeId: 'TBBT_S12E01',
  video: 'assets/videos/TBBT_S12E01.mp4',
  scope: { startMs: 0, endMs: FIRST_TWO_MINUTES_MS },
  coordinateSpace: { unit: 'video-pixels', width: VIDEO_WIDTH, height: VIDEO_HEIGHT, origin: 'top-left' },
  runtimePolicy: {
    preferVisualMapping: true,
    fallbackWhenUnmapped: 'character-ratio-debug-fallback',
    realtimeOcr: false,
    realtimeAiInference: false,
  },
  sourceMethod: 'simulated-manual-prototype',
  generatedBy: 'scripts/generate_p0_3c_visual_mapping.js',
  notes: [
    'Prototype-only first-two-minute mapping for P0-3C validation.',
    'Coordinates are deliberately read-only runtime input and do not modify subtitle or obstacle JSON.',
    'Includes first-two-minute examples such as believe, bedsheets, outside, and other available obstacles.'
  ],
  subtitles: [...entriesBySubtitle.values()],
};

fs.writeFileSync(path.join(repoRoot, 'output_text/visual_mapping/TBBT_S12E01_word_boxes.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${output.subtitles.length} subtitle visual mapping entries.`);
