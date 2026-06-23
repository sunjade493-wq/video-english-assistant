#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DRAFT_DIR = path.join(REPO_ROOT, 'output_text', 'drafts');
const ANALYZE_INPUT_PATH = path.join(DRAFT_DIR, 'p0_4a_analyze_input_pilot.json');
const SMOKE_OUTPUT_PATH = path.join(DRAFT_DIR, 'p0_4a_obstacles_pilot_draft_smoke.json');
const DEBUG_DIR = path.join(REPO_ROOT, 'tmp', 'p0_4a_analyze_debug', 'smoke');

const EPISODE_ID = 'tbbt-s12e01';
const DEFAULT_SMOKE_START_INDEX = 12;
const DEFAULT_SMOKE_END_INDEX = 16;
const PROMPT_CONTRACT_VERSION = 'p0-analyze-prompt-contract-v1';
const SCHEMA_VERSION = 'p0-4a-obstacles-draft-smoke-v1';
const ANALYZER_VERSION = 'p0-4a-2b-real-ai-draft-generation-v1';
const SOURCE_ANALYZE_INPUT_PATH = 'output_text/drafts/p0_4a_analyze_input_pilot.json';
const TYPE_ORDER = { vocabulary: 0, comprehension: 1 };
const ALLOWED_TYPES = new Set(['vocabulary', 'comprehension']);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function parseSmokeRange(argv) {
  const range = {
    start: DEFAULT_SMOKE_START_INDEX,
    end: DEFAULT_SMOKE_END_INDEX,
  };

  for (const arg of argv) {
    const match = arg.match(/^--(start|end)=(\d+)$/);
    if (!match) {
      throw new Error(`Unsupported argument: ${arg}. Use --start=12 --end=16.`);
    }
    range[match[1]] = Number(match[2]);
  }

  if (!Number.isInteger(range.start) || !Number.isInteger(range.end)) {
    throw new Error('Smoke range must use integer subtitle indexes.');
  }

  if (range.start > range.end) {
    throw new Error(`Invalid smoke range: --start=${range.start} is greater than --end=${range.end}.`);
  }

  return range;
}

function getAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || process.env.P0_4A_ANALYZE_MODEL;
  if (!apiKey || !model) return null;
  return { apiKey, model };
}

function getSmokeItems(analyzeInput, range) {
  if (!Array.isArray(analyzeInput.items)) {
    throw new Error('Analyze input must contain an items array.');
  }

  const items = analyzeInput.items.filter((item) => (
    Number(item.subtitleIndex) >= range.start
    && Number(item.subtitleIndex) <= range.end
  ));

  const expected = [];
  for (let index = range.start; index <= range.end; index += 1) expected.push(index);
  const actual = items.map((item) => Number(item.subtitleIndex));

  if (actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new Error(`Smoke slice must contain subtitleIndex ${expected.join(', ')}; found ${actual.join(', ')}.`);
  }

  return items;
}

function buildSmokeAnalyzeInput(analyzeInput, range) {
  return {
    schemaVersion: analyzeInput.schemaVersion,
    episodeId: EPISODE_ID,
    learnerLevel: analyzeInput.learnerLevel,
    analyzerVersion: ANALYZER_VERSION,
    smokeTest: true,
    runtimeMayConsume: false,
    smokeScope: {
      sourceAnalyzeInputPath: SOURCE_ANALYZE_INPUT_PATH,
      subtitleIndexStart: range.start,
      subtitleIndexEnd: range.end,
      note: 'Smoke test slice only. Runtime must not consume this output.',
    },
    items: getSmokeItems(analyzeInput, range).map((item) => ({
      subtitleIndex: Number(item.subtitleIndex),
      startTime: item.startTime,
      endTime: item.endTime,
      source_en: item.source_en,
      source_zh: item.source_zh,
      learnerLevel: item.learnerLevel || analyzeInput.learnerLevel,
      contextBefore: item.contextBefore || [],
      contextAfter: item.contextAfter || [],
    })),
  };
}

function buildPrompt(smokeAnalyzeInput, model, range) {
  return {
    role: 'P0-4A-2B real AI Analyze Engine smoke-test draft generator',
    instruction: [
      'Return exactly one valid JSON object and no markdown, prose, comments, or code fences.',
      `Analyze only subtitleIndex ${range.start} through ${range.end} from the provided analyzeInput.items array.`,
      'Generate draft vocabulary and comprehension obstacles only when they are real learner bottlenecks for the stated learnerLevel.',
      'Use minimal meaningful text spans copied from source_en whenever possible.',
      'Do not generate coordinates, marker visuals, OCR results, Qwen-VL output, Runtime data, frozen output, production obstacle JSON, or subtitle JSON.',
      'Do not process any subtitles outside the selected smoke range.',
      'If no obstacles are warranted, return an empty obstacles array.',
    ],
    requiredJsonShape: {
      obstacles: [
        {
          type: 'vocabulary or comprehension',
          subtitleIndex: 'integer from selected range only',
          text: 'non-empty English span from source_en when possible',
          markerStart: 'optional integer character start in source_en',
          markerEnd: 'optional integer character end in source_en',
          reason: 'brief draft rationale',
          vocabularyFields: 'optional fields such as word, lemma, partOfSpeech, sentenceMeaning, translation, difficultyLevel, difficultyEvidence',
          comprehensionFields: 'optional fields such as phrase, literal, actual, grammar, explanationWhy, transferableUsage, comprehensionCategory',
        },
      ],
    },
    normalizationOwnedByScript: {
      schemaVersion: SCHEMA_VERSION,
      smokeTest: true,
      runtimeMayConsume: false,
      promptContractVersion: PROMPT_CONTRACT_VERSION,
      reviewStatus: 'draft',
      episodeId: EPISODE_ID,
      learnerLevel: smokeAnalyzeInput.learnerLevel,
      model,
      analyzerVersion: ANALYZER_VERSION,
      generatedAt: 'script-owned',
      sourceAnalyzeInputPath: SOURCE_ANALYZE_INPUT_PATH,
      smokeScope: 'script-owned',
      deterministicOrdering: 'script-owned',
      deterministicObstacleIds: 'script-owned',
      reviewDecision: 'pending',
    },
    analyzeInput: smokeAnalyzeInput,
  };
}

async function callAi(prompt, config) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a deterministic JSON-only subtitle analysis engine. Return valid JSON only.',
        },
        { role: 'user', content: JSON.stringify(prompt, null, 2) },
      ],
    }),
  });

  const rawEnvelope = await response.text();
  let envelope;
  try {
    envelope = JSON.parse(rawEnvelope);
  } catch (_) {
    envelope = { nonJsonEnvelope: rawEnvelope };
  }

  if (!response.ok) {
    const error = new Error(`OpenAI API error ${response.status}: ${rawEnvelope}`);
    error.responseEnvelope = envelope;
    throw error;
  }

  return {
    envelope,
    content: envelope.choices?.[0]?.message?.content || '',
  };
}

function parseAiJson(rawResponse) {
  return JSON.parse(rawResponse);
}

function isValidInteger(value) {
  return Number.isInteger(value) || (typeof value === 'string' && /^-?\d+$/.test(value));
}

function safeText(obstacle) {
  return String(obstacle.text || obstacle.word || obstacle.phrase || '').trim();
}

function normalizeMarkers(obstacle, sourceEn, text) {
  const sourceLength = sourceEn.length;
  const aiStart = isValidInteger(obstacle.markerStart) ? Number(obstacle.markerStart) : null;
  const aiEnd = isValidInteger(obstacle.markerEnd) ? Number(obstacle.markerEnd) : null;

  if (
    aiStart !== null
    && aiEnd !== null
    && aiStart >= 0
    && aiEnd >= aiStart
    && aiEnd <= sourceLength
  ) {
    return { markerStart: aiStart, markerEnd: aiEnd };
  }

  const derivedStart = sourceEn.indexOf(text);
  if (derivedStart >= 0) {
    return { markerStart: derivedStart, markerEnd: derivedStart + text.length };
  }

  return { markerStart: 0, markerEnd: Math.min(text.length, sourceLength) };
}

function normalizeObstacleDraft(parsed, smokeAnalyzeInput, model, range) {
  const smokeItemsByIndex = new Map(smokeAnalyzeInput.items.map((item) => [Number(item.subtitleIndex), item]));
  const aiObstacles = Array.isArray(parsed.obstacles) ? parsed.obstacles : [];

  const obstacles = aiObstacles
    .filter((obstacle) => ALLOWED_TYPES.has(obstacle.type))
    .filter((obstacle) => smokeItemsByIndex.has(Number(obstacle.subtitleIndex)))
    .map((obstacle) => {
      const subtitleIndex = Number(obstacle.subtitleIndex);
      const subtitle = smokeItemsByIndex.get(subtitleIndex);
      const text = safeText(obstacle);
      if (!text) return null;

      const sourceEn = String(subtitle.source_en || '');
      const markers = normalizeMarkers(obstacle, sourceEn, text);

      return {
        ...obstacle,
        obstacleId: undefined,
        type: obstacle.type,
        subtitleIndex,
        startTime: subtitle.startTime,
        endTime: subtitle.endTime,
        source_en: subtitle.source_en,
        source_zh: subtitle.source_zh,
        text,
        markerStart: markers.markerStart,
        markerEnd: markers.markerEnd,
        reviewDecision: 'pending',
      };
    })
    .filter(Boolean)
    .sort((a, b) => (
      a.subtitleIndex - b.subtitleIndex
      || a.markerStart - b.markerStart
      || TYPE_ORDER[a.type] - TYPE_ORDER[b.type]
      || a.text.localeCompare(b.text, 'en')
    ))
    .map((obstacle, index) => ({
      ...obstacle,
      obstacleId: `${EPISODE_ID}-obstacle-${String(index + 1).padStart(6, '0')}`,
      reviewDecision: 'pending',
    }));

  return {
    schemaVersion: SCHEMA_VERSION,
    smokeTest: true,
    runtimeMayConsume: false,
    promptContractVersion: PROMPT_CONTRACT_VERSION,
    reviewStatus: 'draft',
    episodeId: EPISODE_ID,
    learnerLevel: smokeAnalyzeInput.learnerLevel,
    model,
    analyzerVersion: ANALYZER_VERSION,
    generatedAt: new Date().toISOString(),
    sourceAnalyzeInputPath: SOURCE_ANALYZE_INPUT_PATH,
    smokeScope: {
      subtitleIndexStart: range.start,
      subtitleIndexEnd: range.end,
    },
    obstacles,
  };
}

async function main() {
  const range = parseSmokeRange(process.argv.slice(2));
  const config = getAiConfig();

  if (!config) {
    console.log('P0-4A-2B smoke test skipped: missing AI config. Set OPENAI_API_KEY and OPENAI_MODEL (or P0_4A_ANALYZE_MODEL) to call the real OpenAI API. No fake obstacles generated; no draft output written.');
    return;
  }

  ensureDir(DEBUG_DIR);

  const analyzeInput = readJson(ANALYZE_INPUT_PATH);
  const smokeAnalyzeInput = buildSmokeAnalyzeInput(analyzeInput, range);
  const prompt = buildPrompt(smokeAnalyzeInput, config.model, range);

  let rawResponse = '';
  try {
    const aiResponse = await callAi(prompt, config);
    rawResponse = aiResponse.content;

    writeJson(path.join(DEBUG_DIR, 'response_envelope.json'), aiResponse.envelope);
    fs.writeFileSync(path.join(DEBUG_DIR, 'raw_response.txt'), rawResponse, 'utf8');

    const parsed = parseAiJson(rawResponse);
    const normalized = normalizeObstacleDraft(parsed, smokeAnalyzeInput, config.model, range);
    writeJson(SMOKE_OUTPUT_PATH, normalized);

    console.log(`Wrote real AI smoke draft obstacles: ${path.relative(REPO_ROOT, SMOKE_OUTPUT_PATH)} (${normalized.obstacles.length} obstacles).`);
  } catch (error) {
    if (error.responseEnvelope) writeJson(path.join(DEBUG_DIR, 'response_envelope.json'), error.responseEnvelope);
    if (rawResponse) fs.writeFileSync(path.join(DEBUG_DIR, 'raw_response.txt'), rawResponse, 'utf8');
    fs.writeFileSync(path.join(DEBUG_DIR, 'parse_error.txt'), `${error.stack || error.message}\n`, 'utf8');
    console.error('P0-4A-2B smoke test failed. Debug artifacts were preserved; no partial obstacle output was written.');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
