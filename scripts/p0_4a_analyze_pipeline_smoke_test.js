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
const SMOKE_START_INDEX = 12;
const SMOKE_END_INDEX = 16;
const ANALYZER_VERSION = 'p0-4a-2a-ai-draft-smoke-v1';
const TYPE_ORDER = { vocabulary: 0, comprehension: 1 };
const ALLOWED_TYPES = new Set(['vocabulary', 'comprehension']);
const ALLOWED_DECISION_SOURCES = new Set([
  'frozen_vocabulary_list',
  'expression_knowledge_base',
  'frequency_dictionary',
  'ai_assisted',
  'ai_comprehension',
]);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function getAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || process.env.P0_4A_ANALYZE_MODEL;
  if (!apiKey || !model) return null;
  return { apiKey, model };
}

function getSmokeItems(analyzeInput) {
  if (!Array.isArray(analyzeInput.items)) {
    throw new Error('Analyze input must contain an items array.');
  }

  const items = analyzeInput.items.filter((item) => (
    Number(item.subtitleIndex) >= SMOKE_START_INDEX
    && Number(item.subtitleIndex) <= SMOKE_END_INDEX
  ));

  const indexes = items.map((item) => Number(item.subtitleIndex));
  const expected = [12, 13, 14, 15, 16];
  if (indexes.length !== expected.length || indexes.some((value, index) => value !== expected[index])) {
    throw new Error(`Smoke slice must contain subtitleIndex ${expected.join(', ')}; found ${indexes.join(', ')}.`);
  }

  return items;
}

function buildSmokeAnalyzeInput(analyzeInput) {
  const items = getSmokeItems(analyzeInput);
  return {
    ...analyzeInput,
    analyzerVersion: ANALYZER_VERSION,
    smokeTest: true,
    runtimeMayConsume: false,
    smokeScope: {
      sourceAnalyzeInputPath: 'output_text/drafts/p0_4a_analyze_input_pilot.json',
      subtitleIndexStart: SMOKE_START_INDEX,
      subtitleIndexEnd: SMOKE_END_INDEX,
      note: 'P0-4A-2A smoke test slice only. Runtime must not consume this output.',
    },
    items: items.map((item) => ({
      ...item,
      analyzerVersion: ANALYZER_VERSION,
    })),
  };
}

function buildPrompt(smokeAnalyzeInput, model) {
  return {
    role: 'P0-4A-2A offline Analyze Engine smoke-test draft generator',
    instruction: [
      'Return valid JSON only. Do not use markdown fences.',
      'Generate draft Vocabulary Obstacles and Comprehension Obstacles for the provided five subtitle items only: subtitleIndex 12 through 16.',
      'This is a smoke test of the draft generation path, not final pilot generation and not quality tuning.',
      'Follow the frozen contracts: P0 Product Positioning & Learning Philosophy Freeze; P0 Vocabulary Level Determination Contract Freeze; P0 Comprehension Obstacle Determination Contract Freeze; P0 Analyze Prompt Contract Freeze; P0-4A Pilot Asset Contract Freeze.',
      'Respect the P0 philosophy: exam labels are entry points; real-world comprehension and usage difficulty decide obstacles.',
      'Vocabulary authority order: frozen vocabulary lists, expression knowledge base, frequency dictionaries, AI assistance. AI recommendations remain draft and reviewable.',
      'Comprehension obstacles are meaning-level bottlenecks where known words may still not produce immediate real meaning. Usefulness alone is not enough.',
      'Choose minimal meaningful text boundaries from source_en whenever possible and deduplicate equivalent obstacles.',
      'Forbidden: coordinates, visual markers, Qwen-VL calls, OCR, Runtime integration, subtitle JSON changes, existing obstacle JSON changes, frozen output generation, full-episode processing, non-JSON explanations.',
    ],
    requiredOutput: {
      schemaVersion: 'p0-4a-obstacles-draft-smoke-v1',
      smokeTest: true,
      runtimeMayConsume: false,
      reviewStatus: 'draft',
      reviewDecisionForEveryObstacle: 'pending',
      episodeId: EPISODE_ID,
      model,
      analyzerVersion: ANALYZER_VERSION,
      generatedAt: 'ISO-8601 timestamp',
      obstacles: 'array for subtitleIndex 12-16 only, sorted by subtitleIndex, markerStart, type with vocabulary before comprehension, text alphabetical order',
      obstacleIdFormat: 'tbbt-s12e01-obstacle-NNNNNN',
    },
    obstacleContract: {
      allowedTypes: ['vocabulary', 'comprehension'],
      requiredCommonFields: ['type', 'subtitleIndex', 'startTime', 'endTime', 'source_en', 'source_zh', 'text', 'decisionSource', 'confidence'],
      optionalTextOffsets: ['markerStart', 'markerEnd'],
      vocabularyFields: ['word', 'lemma', 'phonetic', 'partOfSpeech', 'sentenceMeaning', 'translation', 'difficultyLevel', 'difficultyEvidence'],
      comprehensionFields: ['phrase', 'literal', 'actual', 'grammar', 'explanationWhy', 'transferableUsage', 'comprehensionCategory'],
    },
    analyzeInput: smokeAnalyzeInput,
  };
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response did not contain a JSON object.');
    return JSON.parse(match[0]);
  }
}

function deriveTextOffset(obstacle, field, fallback) {
  if (Number.isFinite(Number(obstacle[field]))) return Number(obstacle[field]);
  const source = String(obstacle.source_en || '');
  const text = String(obstacle.text || obstacle.word || obstacle.phrase || '');
  const start = source.indexOf(text);
  if (start === -1) return fallback;
  return field === 'markerEnd' ? start + text.length : start;
}

function normalizeObstacleDraft(parsed, smokeAnalyzeInput, model) {
  const smokeItemsByIndex = new Map(smokeAnalyzeInput.items.map((item) => [Number(item.subtitleIndex), item]));
  const obstacles = Array.isArray(parsed.obstacles) ? parsed.obstacles : [];

  const output = {
    schemaVersion: parsed.schemaVersion || 'p0-4a-obstacles-draft-smoke-v1',
    smokeTest: true,
    runtimeMayConsume: false,
    reviewStatus: 'draft',
    episodeId: EPISODE_ID,
    learnerLevel: smokeAnalyzeInput.learnerLevel,
    model,
    analyzerVersion: ANALYZER_VERSION,
    generatedAt: new Date().toISOString(),
    sourceAnalyzeInputPath: 'output_text/drafts/p0_4a_analyze_input_pilot.json',
    smokeScope: {
      subtitleIndexStart: SMOKE_START_INDEX,
      subtitleIndexEnd: SMOKE_END_INDEX,
    },
    obstacles: [],
  };

  output.obstacles = obstacles
    .filter((obstacle) => ALLOWED_TYPES.has(obstacle.type))
    .filter((obstacle) => smokeItemsByIndex.has(Number(obstacle.subtitleIndex)))
    .map((obstacle) => {
      const subtitle = smokeItemsByIndex.get(Number(obstacle.subtitleIndex));
      const withSubtitle = {
        ...obstacle,
        subtitleIndex: Number(obstacle.subtitleIndex),
        startTime: subtitle.startTime,
        endTime: subtitle.endTime,
        source_en: subtitle.source_en,
        source_zh: subtitle.source_zh,
        text: String(obstacle.text || obstacle.word || obstacle.phrase || '').trim(),
        reviewDecision: 'pending',
      };
      const markerStart = deriveTextOffset(withSubtitle, 'markerStart', 0);
      const markerEnd = deriveTextOffset(withSubtitle, 'markerEnd', markerStart + withSubtitle.text.length);
      return {
        ...withSubtitle,
        markerStart,
        markerEnd,
      };
    })
    .filter((obstacle) => obstacle.text.length > 0)
    .sort((a, b) => (
      a.subtitleIndex - b.subtitleIndex
      || Number(a.markerStart) - Number(b.markerStart)
      || TYPE_ORDER[a.type] - TYPE_ORDER[b.type]
      || String(a.text).localeCompare(String(b.text), 'en')
    ))
    .map((obstacle, index) => ({
      ...obstacle,
      obstacleId: `${EPISODE_ID}-obstacle-${String(index + 1).padStart(6, '0')}`,
      decisionSource: ALLOWED_DECISION_SOURCES.has(obstacle.decisionSource)
        ? obstacle.decisionSource
        : (obstacle.type === 'comprehension' ? 'ai_comprehension' : 'ai_assisted'),
      reviewDecision: 'pending',
    }));

  return output;
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
      messages: [
        { role: 'system', content: 'You are a deterministic JSON-only Analyze Engine smoke-test draft generator.' },
        { role: 'user', content: JSON.stringify(prompt, null, 2) },
      ],
    }),
  });

  const raw = await response.text();
  if (!response.ok) throw new Error(`OpenAI API error ${response.status}: ${raw}`);
  const envelope = JSON.parse(raw);
  return envelope.choices?.[0]?.message?.content || '';
}

async function main() {
  const config = getAiConfig();
  if (!config) {
    console.log('P0-4A-2A smoke test skipped: set OPENAI_API_KEY and OPENAI_MODEL (or P0_4A_ANALYZE_MODEL) to call AI. No draft obstacles were generated.');
    return;
  }

  console.log('API key detected.');
  console.log(`Using model: ${config.model}`);

  ensureDir(DEBUG_DIR);

  const analyzeInput = readJson(ANALYZE_INPUT_PATH);
  const smokeAnalyzeInput = buildSmokeAnalyzeInput(analyzeInput);
  const prompt = buildPrompt(smokeAnalyzeInput, config.model);
  writeJson(path.join(DEBUG_DIR, 'prompt.json'), prompt);

  let rawResponse = '';
  try {
    rawResponse = await callAi(prompt, config);
    fs.writeFileSync(path.join(DEBUG_DIR, 'raw_response.txt'), rawResponse, 'utf8');
    const parsed = extractJson(rawResponse);
    writeJson(path.join(DEBUG_DIR, 'parsed_response.json'), parsed);
    const normalized = normalizeObstacleDraft(parsed, smokeAnalyzeInput, config.model);
    writeJson(SMOKE_OUTPUT_PATH, normalized);
    console.log(`Wrote smoke draft obstacles: ${path.relative(REPO_ROOT, SMOKE_OUTPUT_PATH)} (${normalized.obstacles.length} obstacles)`);
  } catch (error) {
    if (rawResponse) fs.writeFileSync(path.join(DEBUG_DIR, 'raw_response.txt'), rawResponse, 'utf8');
    fs.writeFileSync(path.join(DEBUG_DIR, 'parse_error.txt'), `${error.stack || error.message}\n`, 'utf8');
    console.error('P0-4A-2A smoke test failed. Raw response and parse_error.txt were preserved; no partial smoke draft should be used.');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
