#!/usr/bin/env node

/**
 * P8-A Offline Visual Mapping Engine Pilot
 * P8-B Real AI Visual Mapping Probe (--real-ai mode)
 *
 * Default mode: P8-A placeholder skeleton (no AI call, no coordinate generation).
 * Real AI mode: P8-B probe — calls Qwen-VL via DashScope to produce real dot
 *   coordinates for Batch1 vocabulary markers.
 *
 * P8-A IT DOES NOT:
 *   - call AI or Qwen-VL
 *   - perform OCR or inspect video pixels
 *   - estimate or infer coordinates
 *   - use measureText or any canvas/DOM measurement
 *   - generate comprehension lines
 *   - integrate with Runtime
 *   - modify any existing JSON artifacts
 *
 * P8-B (--real-ai) requires:
 *   DASHSCOPE_API_KEY  — DashScope API key (required)
 *
 * P8-B (--real-ai) optional:
 *   DASHSCOPE_BASE_URL — override API base URL
 *   P8_VISUAL_MODEL    — override vision model id (default: qwen-vl-plus)
 *
 * Real dot coordinates (centerX, baselineY, radius) must come from the
 * Offline Visual Mapping Engine (Qwen-VL or equivalent vision AI).
 * Runtime must never generate, estimate, or correct these coordinates.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const STAGE_A = 'P8-A';
const STAGE_B = 'P8-B';
const EPISODE_ID = 'tbbt-s12e01';
const LEARNER_LEVEL = 'CET-4';
const BATCH = 1;

const REAL_AI_MODE = process.argv.includes('--real-ai');

// ---------------------------------------------------------------------------
// Input paths (consumed read-only; not written by this script)
// ---------------------------------------------------------------------------

// Video asset — frames are extracted from this file by ffmpeg
const VIDEO_ASSET_PATH = 'assets/videos/TBBT_S12E01.mp4';

// Output directory for extracted frame images
const FRAMES_DIR = path.join('tmp', 'p8_b_frames');

// Subtitle source used for Batch1 marker binding
const SUBTITLE_SOURCE_PATH = 'output_text/p1_a/subtitle_artifact.json';

// Batch1 display/marker binding — frozen output from P6-C
const MARKER_BINDING_SOURCE_PATH = 'output_text/p1_a/p6_c_batch1_display_marker_binding.json';

// ---------------------------------------------------------------------------
// Output paths
// ---------------------------------------------------------------------------

const OUTPUT_DIR = 'output_text/p1_a';
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'p8_a_offline_visual_mapping_pilot_placeholder.json');
const OUTPUT_PATH_B = path.join(OUTPUT_DIR, 'p8_b_real_ai_visual_mapping_probe.json');

// ---------------------------------------------------------------------------
// Pilot target list — Batch1 vocabulary markers only
// ---------------------------------------------------------------------------

const PILOT_TARGETS = [
  'lamb',
  'believe',
  'neither',
];

// ---------------------------------------------------------------------------
// generateVocabularyDotVisualMarker
//
// Returns a placeholder dot visual marker object.
// Real coordinates must come from Offline Visual Mapping / vision AI later.
// Runtime must not generate or correct coordinates.
// ---------------------------------------------------------------------------

function generateVocabularyDotVisualMarker(target) {
  return {
    kind: 'dot',
    // Real pixel coordinates must be produced by Offline Visual Mapping Engine.
    // Do NOT estimate, infer, or fallback these values in Runtime.
    centerX: null,
    baselineY: null,
    radius: null,
    confidence: null,
    _placeholder: true,
    _note: `Real coordinates for "${target}" must come from vision AI (Qwen-VL) in a later P8 stage.`,
  };
}

// ---------------------------------------------------------------------------
// runP8AOfflineVisualMappingPilot
// ---------------------------------------------------------------------------

function runP8AOfflineVisualMappingPilot() {
  const STAGE = STAGE_A;
  console.log(`[${STAGE}] Offline Visual Mapping Engine Pilot — starting`);
  console.log(`[${STAGE}] Episode: ${EPISODE_ID}  Learner level: ${LEARNER_LEVEL}  Batch: ${BATCH}`);
  console.log(`[${STAGE}] Pilot scope: placeholder skeleton only — no AI call, no coordinate generation`);
  console.log('');

  console.log(`[${STAGE}] Pilot target words (${PILOT_TARGETS.length}):`);
  PILOT_TARGETS.forEach((word, i) => {
    console.log(`  ${i + 1}. ${word}`);
  });
  console.log('');

  // Build placeholder visualMarker objects for each target
  const pilotEntries = PILOT_TARGETS.map((word) => {
    const visualMarker = generateVocabularyDotVisualMarker(word);
    console.log(`[${STAGE}] Generated placeholder visualMarker for "${word}":`, JSON.stringify(visualMarker));
    return {
      word,
      visualMarker,
    };
  });

  console.log('');

  // Assemble output artifact
  const output = {
    schemaVersion: 'p8-a-offline-visual-mapping-pilot-placeholder.v1',
    stage: STAGE,
    episodeId: EPISODE_ID,
    learnerLevel: LEARNER_LEVEL,
    batch: BATCH,
    generatedAt: new Date().toISOString(),
    // This artifact is NOT production-ready and must NOT be consumed by Runtime.
    placeholder: true,
    productionReady: false,
    _warning: 'All visualMarker coordinates are null placeholders. Real coordinates must be produced by Offline Visual Mapping Engine (Qwen-VL) in a later P8 stage. Runtime must never generate, estimate, or correct these values.',
    inputPaths: {
      videoAsset: VIDEO_ASSET_PATH,
      subtitleSource: SUBTITLE_SOURCE_PATH,
      markerBindingSource: MARKER_BINDING_SOURCE_PATH,
    },
    pilotTargets: PILOT_TARGETS,
    pilotEntries,
  };

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

  console.log(`[${STAGE}] Pilot output written to: ${OUTPUT_PATH}`);
  console.log(`[${STAGE}] Pilot complete — skeleton only, no real coordinates produced`);
}

// ---------------------------------------------------------------------------
// DashScope vision API call
// ---------------------------------------------------------------------------

function dashscopeVisionRequest(apiKey, baseUrl, model, imageBase64, prompt) {
  const endpoint = `${baseUrl}/compatible-mode/v1/chat/completions`;
  const body = JSON.stringify({
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });

  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body,
  }).then(async (res) => {
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch (_) { parsed = text; }
    return { statusCode: res.status, body: parsed };
  });
}

// ---------------------------------------------------------------------------
// Build prompt for a single target word
// ---------------------------------------------------------------------------

function buildDotPrompt(word) {
  return (
    `Locate the word "${word}" displayed in the video subtitle or on-screen text in this frame. ` +
    `Return ONLY a JSON object with these exact fields — no explanation, no markdown, no extra keys:\n` +
    `{\n` +
    `  "kind": "dot",\n` +
    `  "centerX": <number — horizontal center pixel of the word>,\n` +
    `  "baselineY": <number — baseline pixel Y of the word>,\n` +
    `  "radius": <number — suggested dot radius in pixels>,\n` +
    `  "confidence": <number between 0 and 1>\n` +
    `}`
  );
}

// ---------------------------------------------------------------------------
// verifyFfmpeg — fail fast if ffmpeg is not on PATH
// ---------------------------------------------------------------------------

function verifyFfmpeg(stage) {
  const result = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (result.error) {
    console.error(`[${stage}] FATAL: ffmpeg not found on PATH.`);
    console.error(`[${stage}] ffmpeg is required to extract frames from the video.`);
    console.error(`[${stage}] Install ffmpeg and ensure it is available in PATH.`);
    console.error(`[${stage}] Do not provide manual screenshots as a workaround.`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// loadSubtitleFrameTimings — reads p6_c_batch1_display_marker_binding.json
// and returns a map of { word -> frameTime } where
// frameTime = (startTime + endTime) / 2.
// Fails fast if the binding file is missing or a target has no binding.
// ---------------------------------------------------------------------------

function loadSubtitleFrameTimings(stage) {
  if (!fs.existsSync(MARKER_BINDING_SOURCE_PATH)) {
    console.error(`[${stage}] FATAL: Marker binding file not found: ${MARKER_BINDING_SOURCE_PATH}`);
    process.exit(1);
  }

  let bindingArtifact;
  try {
    bindingArtifact = JSON.parse(fs.readFileSync(MARKER_BINDING_SOURCE_PATH, 'utf8'));
  } catch (e) {
    console.error(`[${stage}] FATAL: Failed to parse marker binding file: ${e.message}`);
    process.exit(1);
  }

  const bindings = bindingArtifact.markerBindings;
  if (!Array.isArray(bindings)) {
    console.error(`[${stage}] FATAL: markerBindings array missing in ${MARKER_BINDING_SOURCE_PATH}`);
    process.exit(1);
  }

  const timingMap = {};
  for (const entry of bindings) {
    const startTime = parseFloat(entry.startTime);
    const endTime = parseFloat(entry.endTime);
    if (isNaN(startTime) || isNaN(endTime)) {
      console.error(`[${stage}] FATAL: Invalid startTime/endTime for binding entry: ${JSON.stringify(entry)}`);
      process.exit(1);
    }
    const frameTime = (startTime + endTime) / 2;
    timingMap[entry.word] = { frameTime, startTime, endTime };
  }

  return timingMap;
}

// ---------------------------------------------------------------------------
// extractFrame — uses ffmpeg to extract a single frame at the given timestamp.
// Writes to FRAMES_DIR/frame_<word>.jpg and returns the output path.
// Fails fast on any error — no fallbacks.
// ---------------------------------------------------------------------------

function extractFrame(stage, word, timeSec) {
  if (timeSec === undefined || timeSec === null) {
    console.error(`[${stage}] FATAL: No timing provided for target word "${word}".`);
    process.exit(1);
  }

  if (!fs.existsSync(VIDEO_ASSET_PATH)) {
    console.error(`[${stage}] FATAL: Video asset not found: ${VIDEO_ASSET_PATH}`);
    console.error(`[${stage}] Place the video file at the expected path and retry.`);
    process.exit(1);
  }

  if (!fs.existsSync(FRAMES_DIR)) {
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
  }

  const outputPath = path.join(FRAMES_DIR, `frame_${word}.jpg`);

  console.log(`[${stage}]   Extracting frame for "${word}" at t=${timeSec}s → ${outputPath}`);

  const result = spawnSync('ffmpeg', [
    '-y',
    '-ss', String(timeSec),
    '-i', VIDEO_ASSET_PATH,
    '-frames:v', '1',
    '-q:v', '2',
    outputPath,
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    console.error(`[${stage}] FATAL: ffmpeg failed for "${word}".`);
    console.error(result.stderr || result.stdout || '(no output)');
    process.exit(1);
  }

  if (!fs.existsSync(outputPath)) {
    console.error(`[${stage}] FATAL: ffmpeg exited 0 but output file not found: ${outputPath}`);
    process.exit(1);
  }

  return outputPath;
}

// ---------------------------------------------------------------------------
// loadFrameBase64 — extracts the frame via ffmpeg and returns base64 + path.
// ---------------------------------------------------------------------------

function loadFrameBase64(stage, word, timeSec) {
  const outputPath = extractFrame(stage, word, timeSec);
  const base64 = fs.readFileSync(outputPath).toString('base64');
  return { base64, usedPath: outputPath };
}

// ---------------------------------------------------------------------------
// runP8BRealAIProbe
// ---------------------------------------------------------------------------

async function runP8BRealAIProbe() {
  const STAGE = STAGE_B;
  console.log(`[${STAGE}] Real AI Visual Mapping Probe — starting`);

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    console.error(`[${STAGE}] FATAL: DASHSCOPE_API_KEY environment variable is not set.`);
    console.error(`[${STAGE}] Real AI mode requires a valid DashScope API key.`);
    console.error(`[${STAGE}] Do not run real AI mode without this variable — fake coordinates must not be written.`);
    process.exit(1);
  }

  const baseUrl = process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com';
  const model = process.env.P8_VISUAL_MODEL || 'qwen-vl-plus';

  console.log(`[${STAGE}] Model: ${model}`);
  console.log(`[${STAGE}] Base URL: ${baseUrl}`);
  console.log(`[${STAGE}] Targets: ${PILOT_TARGETS.join(', ')}`);
  console.log(`[${STAGE}] Video: ${VIDEO_ASSET_PATH}`);
  console.log(`[${STAGE}] Frames dir: ${FRAMES_DIR}`);
  console.log('');

  verifyFfmpeg(STAGE);

  const frameTimings = loadSubtitleFrameTimings(STAGE);
  console.log(`[${STAGE}] Loaded subtitle-driven frame timings:`);
  for (const word of PILOT_TARGETS) {
    if (!frameTimings[word]) {
      console.error(`[${STAGE}] FATAL: No subtitle binding found for target word "${word}" in ${MARKER_BINDING_SOURCE_PATH}`);
      process.exit(1);
    }
    const { frameTime, startTime, endTime } = frameTimings[word];
    console.log(`[${STAGE}]   "${word}": startTime=${startTime}s endTime=${endTime}s frameTime=${frameTime}s`);
  }
  console.log('');

  const targets = [];

  for (const word of PILOT_TARGETS) {
    console.log(`[${STAGE}] Processing target: "${word}"`);

    const { frameTime } = frameTimings[word];
    const frame = loadFrameBase64(STAGE, word, frameTime);
    console.log(`[${STAGE}]   Using frame: ${frame.usedPath} (t=${frameTime}s)`);
    const prompt = buildDotPrompt(word);

    let rawModelResponse = null;
    let visualMarker = null;
    let parseError = null;

    try {
      const result = await dashscopeVisionRequest(apiKey, baseUrl, model, frame.base64, prompt);
      console.log(`[${STAGE}]   API status: ${result.statusCode}`);

      if (result.statusCode !== 200) {
        parseError = `API returned status ${result.statusCode}: ${JSON.stringify(result.body)}`;
      } else {
        // Extract text content from OpenAI-compatible response
        const text = result.body?.choices?.[0]?.message?.content;
        rawModelResponse = typeof text === 'string' ? text : JSON.stringify(text);

        console.log(`[${STAGE}]   Raw model response: ${rawModelResponse}`);

        // Strip markdown code fences if present
        const cleaned = (rawModelResponse || '')
          .replace(/^```[^\n]*\n?/, '')
          .replace(/\n?```$/, '')
          .trim();

        try {
          const parsed = JSON.parse(cleaned);
          if (
            parsed.kind === 'dot' &&
            typeof parsed.centerX === 'number' &&
            typeof parsed.baselineY === 'number' &&
            typeof parsed.radius === 'number' &&
            typeof parsed.confidence === 'number'
          ) {
            visualMarker = parsed;
          } else {
            parseError = `Model response parsed but missing required fields: ${cleaned}`;
          }
        } catch (e) {
          parseError = `Failed to parse model JSON: ${e.message} — raw: ${rawModelResponse}`;
        }
      }
    } catch (e) {
      parseError = `API request error: ${e.message}`;
    }

    targets.push({
      word,
      frameTime,
      visualMarker,
      ...(rawModelResponse !== null ? { rawModelResponse } : {}),
      ...(parseError !== null ? { parseError } : {}),
    });
  }

  // Assemble output artifact
  const output = {
    schemaVersion: 'p8-b-real-ai-visual-mapping-probe.v1',
    stage: STAGE,
    status: 'real-ai-probe',
    episodeId: EPISODE_ID,
    learnerLevel: LEARNER_LEVEL,
    batch: BATCH,
    generatedAt: new Date().toISOString(),
    model,
    inputPaths: {
      videoAsset: VIDEO_ASSET_PATH,
      subtitleSource: SUBTITLE_SOURCE_PATH,
      markerBindingSource: MARKER_BINDING_SOURCE_PATH,
    },
    pilotTargets: PILOT_TARGETS,
    targets,
  };

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH_B, JSON.stringify(output, null, 2), 'utf8');

  console.log('');
  console.log(`[${STAGE}] Real AI probe output written to: ${OUTPUT_PATH_B}`);

  const succeeded = targets.filter((t) => t.visualMarker !== null).length;
  const failed = targets.filter((t) => t.visualMarker === null).length;
  console.log(`[${STAGE}] Results: ${succeeded} succeeded, ${failed} failed`);
  console.log(`[${STAGE}] P8-B probe complete.`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

if (REAL_AI_MODE) {
  runP8BRealAIProbe().catch((e) => {
    console.error('[P8-B] Unhandled error:', e);
    process.exit(1);
  });
} else {
  runP8AOfflineVisualMappingPilot();
}
