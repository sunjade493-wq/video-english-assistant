#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const MODEL = 'qwen-vl-plus';
const VIDEO = 'assets/videos/TBBT_S12E01.mp4';
const OUTPUT = 'output_text/visual_mapping/TBBT_S12E01_word_boxes.json';
const DEBUG_DIR = 'tmp/qwen_vl_subtitle_debug';
const EPISODE_ID = 'TBBT_S12E01';
const MAX_QWEN_CALLS = 4;

const FRAME_TARGETS = [
  {
    id: 'believe_006500',
    timestamp: '00:00:06.500',
    timeMs: 6500,
    subtitleStartMs: 6000,
    subtitleEndMs: 10000,
    expectedSubtitle: 'Can you believe our little lamb is finally getting married?',
    targets: [{ text: 'believe', obstacleId: 'real-obstacle-1', required: true }],
  },
  {
    id: 'bedsheets_outside_051800',
    timestamp: '00:00:51.800',
    timeMs: 51800,
    subtitleStartMs: 51500,
    subtitleEndMs: 53000,
    expectedSubtitle: 'we should hang the bedsheets outside',
    targets: [
      { text: 'bedsheets', obstacleId: 'real-obstacle-4', required: true },
      { text: 'outside', obstacleId: 'real-obstacle-5', required: true },
    ],
  },
  {
    id: 'according_tradition_049800',
    timestamp: '00:00:49.800',
    timeMs: 49800,
    subtitleStartMs: 49500,
    subtitleEndMs: 51500,
    expectedSubtitle: "It's official. According to tradition,",
    targets: [
      { text: 'According to tradition', obstacleId: 'real-obstacle-3', required: false, phrase: true },
      { text: 'tradition', obstacleId: 'real-obstacle-3', required: false },
    ],
  },
  {
    id: 'honeymoon_058500',
    timestamp: '00:00:58.500',
    timeMs: 58500,
    subtitleStartMs: 58000,
    subtitleEndMs: 60500,
    expectedSubtitle: "considering where we're starting our honeymoon.",
    targets: [{ text: "where we're starting our honeymoon", obstacleId: 'real-obstacle-8', required: false, phrase: true }],
  },
];

function maskApiKey(apiKey) {
  if (!apiKey) return '(missing)';
  return `${apiKey.slice(0, 3)}****${apiKey.slice(-4)}`;
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function commandExists(command) {
  const result = spawnSync('bash', ['-lc', `command -v ${command}`], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function extractFrame(target, framePath) {
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', target.timestamp, '-i', VIDEO, '-frames:v', '1', framePath]);
  if (!fs.existsSync(framePath) || fs.statSync(framePath).size === 0) {
    throw new Error(`ffmpeg did not create frame: ${framePath}`);
  }
}

function imageSizeFromPng(buffer) {
  if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  throw new Error('Extracted frame is not a readable PNG.');
}

function extractJson(text) {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (__) {
      return null;
    }
  }
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, '').replace(/\s+/g, ' ').trim();
}

function toRuntimeBox(rawBox) {
  const x1 = Number(rawBox?.x1);
  const y1 = Number(rawBox?.y1);
  const x2 = Number(rawBox?.x2);
  const y2 = Number(rawBox?.y2);
  if (![x1, y1, x2, y2].every(Number.isFinite) || x2 <= x1 || y2 <= y1) return null;
  return { x: Math.round(x1), y: Math.round(y1), width: Math.round(x2 - x1), height: Math.round(y2 - y1) };
}

function buildPrompt(target) {
  const targetList = target.targets.map((item) => item.text).join(', ');
  return [
    'You are inspecting a video frame that contains burned-in bilingual subtitles.',
    'Find the burned English subtitle line only. Ignore Chinese subtitles and all other on-screen text.',
    `Expected English subtitle context: ${target.expectedSubtitle}`,
    `Return bounding boxes for these exact target words or phrases if visible: ${targetList}`,
    'Coordinates must be pixel coordinates in the provided image, origin top-left.',
    'Do not estimate from character counts. Use only the visible subtitle glyph positions in the image.',
    'Return strict JSON only, with no markdown, comments, or extra text, in this shape:',
    '{"subtitleText":"...","englishLineBox":{"x1":0,"y1":0,"x2":0,"y2":0},"wordBoxes":[{"text":"believe","x1":0,"y1":0,"x2":0,"y2":0,"confidence":0.0}]}',
  ].join('\n');
}

async function callQwen(apiKey, target, framePath) {
  const imageBase64 = fs.readFileSync(framePath).toString('base64');
  const body = {
    model: MODEL,
    messages: [{ role: 'user', content: [
      { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
      { type: 'text', text: buildPrompt(target) },
    ] }],
    temperature: 0,
  };
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const responseText = await response.text();
  fs.writeFileSync(path.join(DEBUG_DIR, `${target.id}.raw.json`), responseText);
  if (!response.ok) throw new Error(`DashScope request for ${target.id} failed with HTTP ${response.status} ${response.statusText}. Raw response saved.`);
  const payload = JSON.parse(responseText);
  const modelText = payload?.choices?.[0]?.message?.content ?? '';
  fs.writeFileSync(path.join(DEBUG_DIR, `${target.id}.model.txt`), String(modelText));
  const parsed = extractJson(modelText);
  if (!parsed) throw new Error(`Qwen-VL response for ${target.id} was not parseable JSON. Raw response saved; no coordinates invented.`);
  fs.writeFileSync(path.join(DEBUG_DIR, `${target.id}.parsed.json`), JSON.stringify(parsed, null, 2));
  return parsed;
}

function collectBoxes(results) {
  const subtitles = [];
  const wordBoxes = [];
  for (const result of results) {
    const subtitleWordBoxes = [];
    for (const target of result.target.targets) {
      const wanted = normalizeText(target.text);
      const raw = (result.parsed.wordBoxes || []).find((box) => normalizeText(box?.text) === wanted);
      if (!raw) {
        if (target.required) throw new Error(`Required target ${target.text} missing from Qwen-VL output for ${result.target.id}.`);
        continue;
      }
      const box = toRuntimeBox(raw);
      if (!box) throw new Error(`Invalid x1/y1/x2/y2 box for ${target.text} in ${result.target.id}.`);
      const entry = {
        obstacleId: target.obstacleId,
        text: target.text,
        startMs: result.target.subtitleStartMs,
        endMs: result.target.subtitleEndMs,
        frameTimeMs: result.target.timeMs,
        box,
        confidence: Number.isFinite(Number(raw.confidence)) ? Number(raw.confidence) : null,
      };
      subtitleWordBoxes.push(entry);
      wordBoxes.push(entry);
    }
    if (subtitleWordBoxes.length > 0) {
      subtitles.push({
        startMs: result.target.subtitleStartMs,
        endMs: result.target.subtitleEndMs,
        frameTimeMs: result.target.timeMs,
        text: result.parsed.subtitleText || result.target.expectedSubtitle,
        englishLineBox: result.parsed.englishLineBox || null,
        wordBoxes: subtitleWordBoxes,
      });
    }
  }
  return { subtitles, wordBoxes };
}

async function main() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  console.log(`model: ${MODEL}`);
  console.log(`endpoint: ${ENDPOINT}`);
  console.log(`api key detected: ${apiKey ? 'yes' : 'no'}`);
  console.log(`api key masked: ${maskApiKey(apiKey)}`);
  console.log(`max qwen-vl calls: ${MAX_QWEN_CALLS}`);

  if (!apiKey) return fail('DASHSCOPE_API_KEY is missing. Set process.env.DASHSCOPE_API_KEY before running extraction.');
  if (!fs.existsSync(VIDEO)) return fail(`Video not found: ${VIDEO}`);
  if (!commandExists('ffmpeg')) return fail('ffmpeg is required to extract frames but was not found on PATH. Install ffmpeg and rerun this offline preprocessing script.');

  fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const selectedTargets = FRAME_TARGETS.slice(0, MAX_QWEN_CALLS);
  const results = [];
  let coordinateSpace = null;

  for (const target of selectedTargets) {
    const framePath = path.join(DEBUG_DIR, `${target.id}.png`);
    console.log(`extracting frame ${target.timestamp} -> ${framePath}`);
    extractFrame(target, framePath);
    const frameSize = imageSizeFromPng(fs.readFileSync(framePath));
    coordinateSpace = coordinateSpace || { unit: 'video-pixels', width: frameSize.width, height: frameSize.height, origin: 'top-left' };
    if (coordinateSpace.width !== frameSize.width || coordinateSpace.height !== frameSize.height) {
      throw new Error(`Mixed coordinate spaces detected: expected ${coordinateSpace.width}x${coordinateSpace.height}, got ${frameSize.width}x${frameSize.height}.`);
    }
    console.log(`calling ${MODEL} for ${target.id}`);
    const parsed = await callQwen(apiKey, target, framePath);
    results.push({ target, parsed });
  }

  const { subtitles, wordBoxes } = collectBoxes(results);
  const output = {
    schemaVersion: 'p0-3d-b-qwen-vl-word-boxes-v1',
    episodeId: EPISODE_ID,
    video: { src: VIDEO },
    scope: { startMs: 0, endMs: 120000 },
    coordinateSpace,
    runtimePolicy: { realtimeOcr: false, realtimeAiInference: false, coordinateInference: false, readOnly: true, fallbackWhenUnmapped: true },
    sourceMethod: 'qwen-vl-offline-prototype',
    generatedBy: 'scripts/extract_qwen_vl_subtitle_coordinates.js',
    notes: [
      'Coordinates are generated by qwen-vl-plus from offline extracted key frames only.',
      'No runtime OCR or runtime AI inference is used.',
      'No character-ratio positioning, markerStart/markerEnd coordinate calculation, average character width, or handwritten coordinate fallback is used.',
      `Raw Qwen-VL responses are saved under ${DEBUG_DIR}/ and are intentionally not committed.`,
    ],
    subtitles,
    wordBoxes,
  };
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`wrote ${OUTPUT}`);
  console.log(`word boxes: ${wordBoxes.map((box) => `${box.text}:${box.obstacleId}`).join(', ')}`);
}

main().catch((error) => {
  console.error(error && error.message ? error.message : String(error));
  process.exitCode = 1;
});
