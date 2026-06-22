#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DRAFT_DIR = path.join(REPO_ROOT, 'output_text', 'drafts');
const DEBUG_DIR = path.join(REPO_ROOT, 'tmp', 'p0_4a_analyze_debug');
const ANALYZE_INPUT_PATH = path.join(DRAFT_DIR, 'p0_4a_analyze_input_pilot.json');
const OBSTACLE_DRAFT_PATH = path.join(DRAFT_DIR, 'p0_4a_obstacles_pilot_draft_smoke.json');

const EPISODE_ID = 'tbbt-s12e01';
const DEFAULT_START = 12;
const DEFAULT_END = 16;
const PROMPT_CONTRACT_VERSION = 'p0-analyze-prompt-contract-v1';
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

function parseRange(argv) {
  const range = { start: DEFAULT_START, end: DEFAULT_END };
  for (const arg of argv) {
    const match = arg.match(/^--(start|end)=(\d+)$/);
    if (!match) throw new Error(`Unsupported argument: ${arg}. Use --start=NN --end=NN.`);
    range[match[1]] = Number(match[2]);
  }
  if (!Number.isInteger(range.start) || !Number.isInteger(range.end)) {
    throw new Error('Smoke range must use integer subtitle indexes.');
  }
  if (range.start > range.end) {
    throw new Error(`Invalid smoke range: --start=${range.start} must be less than or equal to --end=${range.end}.`);
  }
  return range;
}

function selectSmokeItems(analyzeInput, range) {
  const items = analyzeInput.items.filter((item) => item.subtitleIndex >= range.start && item.subtitleIndex <= range.end);
  if (items.length === 0) {
    throw new Error(`No analyze input items found for subtitleIndex ${range.start} through ${range.end}.`);
  }
  return {
    ...analyzeInput,
    smokeTest: true,
    runtimeMayConsume: false,
    smokeRange: { startSubtitleIndex: range.start, endSubtitleIndex: range.end },
    items,
  };
}

function buildPrompt(analyzeInput) {
  return {
    promptContractVersion: PROMPT_CONTRACT_VERSION,
    smokeTest: true,
    runtimeMayConsume: false,
    role: 'P0-4A offline Analyze Engine smoke test',
    instruction: [
      'Return valid JSON only. Do not use markdown fences.',
      'Generate draft Vocabulary Obstacles and Comprehension Obstacles for the provided structured subtitle input only.',
      'Follow the P0 Product Philosophy: exam labels are entry points, but real-world comprehension and usage difficulty decide obstacles.',
      'Vocabulary order of authority: frozen vocabulary lists, expression knowledge base, frequency dictionaries, AI assistance. AI recommendations remain draft and reviewable.',
      'Comprehension obstacles are meaning-level bottlenecks where known words may still not produce immediate real meaning. Usefulness alone is not enough.',
      'Choose minimal meaningful boundaries from source_en whenever possible and deduplicate equivalent obstacles.',
      'Forbidden: coordinate generation, marker generation, subtitle visual mapping, Qwen-VL calls, OCR, Runtime modification, changing subtitle JSON, changing existing output_text data files, non-JSON explanations, claiming draft output is frozen.',
    ],
    requiredOutput: {
      schemaVersion: 'p0-4a-obstacles-draft-v1',
      reviewStatus: 'draft',
      episodeId: EPISODE_ID,
      learnerLevel: analyzeInput.learnerLevel,
      analyzerVersion: analyzeInput.analyzerVersion,
      generatedAt: 'ISO-8601 timestamp',
      smokeTest: true,
      runtimeMayConsume: false,
      obstacles: 'array sorted by subtitleIndex, markerStart, type (vocabulary before comprehension), text',
    },
    obstacleContract: {
      obstacleIdFormat: 'tbbt-s12e01-obstacle-NNNNNN',
      allowedTypes: ['vocabulary', 'comprehension'],
      initialReviewDecision: 'pending',
      requiredCommonFields: ['obstacleId', 'type', 'subtitleIndex', 'startTime', 'endTime', 'source_en', 'source_zh', 'text', 'markerStart', 'markerEnd', 'decisionSource', 'confidence', 'reviewDecision'],
      vocabularyFields: ['word', 'lemma', 'phonetic', 'partOfSpeech', 'sentenceMeaning', 'translation', 'difficultyLevel', 'difficultyEvidence'],
      comprehensionFields: ['phrase', 'literal', 'actual', 'grammar', 'explanationWhy', 'transferableUsage', 'comprehensionCategory'],
    },
    analyzeInput,
  };
}

function getAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || process.env.P0_4A_ANALYZE_MODEL;
  if (!apiKey || !model) return null;
  return { apiKey, model };
}

function extractJson(text) {
  try { return JSON.parse(text); } catch (_) {}
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI response did not contain a JSON object.');
  return JSON.parse(match[0]);
}

function normalizeObstacleDraft(parsed, analyzeInput) {
  const output = {
    schemaVersion: parsed.schemaVersion || 'p0-4a-obstacles-draft-v1',
    reviewStatus: 'draft',
    episodeId: EPISODE_ID,
    learnerLevel: analyzeInput.learnerLevel,
    analyzerVersion: analyzeInput.analyzerVersion,
    generatedAt: parsed.generatedAt || new Date().toISOString(),
    smokeTest: true,
    runtimeMayConsume: false,
    obstacles: Array.isArray(parsed.obstacles) ? parsed.obstacles : [],
  };

  output.obstacles = output.obstacles
    .filter((obstacle) => ALLOWED_TYPES.has(obstacle.type))
    .map((obstacle) => ({ ...obstacle, reviewDecision: 'pending' }))
    .sort((a, b) =>
      Number(a.subtitleIndex) - Number(b.subtitleIndex)
      || Number(a.markerStart ?? 0) - Number(b.markerStart ?? 0)
      || TYPE_ORDER[a.type] - TYPE_ORDER[b.type]
      || String(a.text || '').localeCompare(String(b.text || ''), 'en')
    )
    .map((obstacle, index) => ({
      ...obstacle,
      obstacleId: `${EPISODE_ID}-obstacle-${String(index + 1).padStart(6, '0')}`,
      smokeTest: true,
      decisionSource: ALLOWED_DECISION_SOURCES.has(obstacle.decisionSource)
        ? obstacle.decisionSource
        : (obstacle.type === 'comprehension' ? 'ai_comprehension' : 'ai_assisted'),
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
        { role: 'system', content: 'You are a deterministic JSON-only Analyze Engine draft generator.' },
        { role: 'user', content: JSON.stringify(prompt, null, 2) },
      ],
    }),
  });
  const raw = await response.text();
  let envelope;
  try { envelope = JSON.parse(raw); } catch (_) { envelope = { raw }; }
  writeJson(path.join(DEBUG_DIR, 'response_envelope.json'), envelope);
  if (!response.ok) throw new Error(`OpenAI API error ${response.status}: ${raw}`);
  return envelope.choices?.[0]?.message?.content || '';
}

async function main() {
  ensureDir(DEBUG_DIR);
  const range = parseRange(process.argv.slice(2));
  const analyzeInput = selectSmokeItems(readJson(ANALYZE_INPUT_PATH), range);
  const prompt = buildPrompt(analyzeInput);
  writeJson(path.join(DEBUG_DIR, 'prompt.json'), prompt);
  console.log(`Read analyze input: ${path.relative(REPO_ROOT, ANALYZE_INPUT_PATH)}`);
  console.log(`Smoke range: subtitleIndex ${range.start} through ${range.end} (${analyzeInput.items.length} subtitles)`);

  const config = getAiConfig();
  if (!config) {
    console.log('AI configuration missing: set OPENAI_API_KEY and OPENAI_MODEL (or P0_4A_ANALYZE_MODEL) to generate smoke draft obstacles. Skipping draft obstacle generation.');
    return;
  }

  try {
    const rawResponse = await callAi(prompt, config);
    fs.writeFileSync(path.join(DEBUG_DIR, 'raw_response.txt'), rawResponse, 'utf8');
    const parsed = extractJson(rawResponse);
    writeJson(path.join(DEBUG_DIR, 'parsed_response.json'), parsed);
    const normalized = normalizeObstacleDraft(parsed, analyzeInput);
    ensureDir(DRAFT_DIR);
    writeJson(OBSTACLE_DRAFT_PATH, normalized);
    console.log(`Wrote draft obstacles: ${path.relative(REPO_ROOT, OBSTACLE_DRAFT_PATH)} (${normalized.obstacles.length} obstacles)`);
  } catch (error) {
    fs.writeFileSync(path.join(DEBUG_DIR, 'parse_error.txt'), `${error.stack || error.message}\n`, 'utf8');
    console.error('AI smoke draft obstacle generation failed. Analyze input remains available; no frozen output was generated.');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
