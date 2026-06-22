#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DRAFT_DIR = path.join(REPO_ROOT, 'output_text', 'drafts');
const DEBUG_DIR = path.join(REPO_ROOT, 'tmp', 'p0_4a_analyze_debug', 'smoke');
const ANALYZE_INPUT_PATH = path.join(DRAFT_DIR, 'p0_4a_analyze_input_pilot.json');
const SMOKE_DRAFT_PATH = path.join(DRAFT_DIR, 'p0_4a_obstacles_pilot_draft_smoke.json');

const EPISODE_ID = 'tbbt-s12e01';
const PROMPT_CONTRACT_VERSION = 'p0-4a-analyze-prompt-v1';
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

function parseArgs(argv) {
  const options = {};
  for (const arg of argv) {
    const match = arg.match(/^--(start|end)=(\d+)$/);
    if (!match) throw new Error(`Unsupported argument: ${arg}. Use --start=N and/or --end=N.`);
    options[match[1]] = Number(match[2]);
  }
  if (options.start !== undefined && options.end !== undefined && options.start > options.end) {
    throw new Error('--start must be less than or equal to --end.');
  }
  return options;
}

function selectSmokeItems(analyzeInput, options) {
  const items = Array.isArray(analyzeInput.items) ? analyzeInput.items : [];
  return items.filter((item) => {
    const subtitleIndex = Number(item.subtitleIndex);
    if (options.start !== undefined && subtitleIndex < options.start) return false;
    if (options.end !== undefined && subtitleIndex > options.end) return false;
    return true;
  });
}

function buildSmokeAnalyzeInput(analyzeInput, options) {
  const selectedItems = selectSmokeItems(analyzeInput, options);
  return {
    ...analyzeInput,
    smokeTest: true,
    runtimeMayConsume: false,
    promptContractVersion: PROMPT_CONTRACT_VERSION,
    sourceAnalyzeInputPath: 'output_text/drafts/p0_4a_analyze_input_pilot.json',
    smokeScope: {
      startSubtitleIndex: options.start ?? null,
      endSubtitleIndex: options.end ?? null,
    },
    items: selectedItems,
  };
}

function buildPrompt(smokeAnalyzeInput) {
  return {
    promptContractVersion: PROMPT_CONTRACT_VERSION,
    smokeTest: true,
    runtimeMayConsume: false,
    role: 'P0-4A offline Analyze Engine smoke test',
    instruction: [
      'Return valid JSON only. Do not use markdown fences.',
      'Generate draft Vocabulary Obstacles and Comprehension Obstacles for the provided smoke analyze input only.',
      'This is a smoke test. Do not generate frozen output, call Qwen-VL, run OCR, modify Runtime, or read subtitle JSON directly.',
      'Choose minimal meaningful boundaries from source_en whenever possible and deduplicate equivalent obstacles.',
    ],
    requiredOutput: {
      schemaVersion: 'p0-4a-obstacles-draft-v1',
      reviewStatus: 'draft',
      smokeTest: true,
      runtimeMayConsume: false,
      episodeId: EPISODE_ID,
      learnerLevel: smokeAnalyzeInput.learnerLevel,
      analyzerVersion: smokeAnalyzeInput.analyzerVersion,
      generatedAt: 'ISO-8601 timestamp',
      obstacles: 'array sorted by subtitleIndex, markerStart, type (vocabulary before comprehension), text',
    },
    obstacleContract: {
      obstacleIdFormat: 'tbbt-s12e01-obstacle-smoke-NNNNNN',
      allowedTypes: ['vocabulary', 'comprehension'],
      initialReviewDecision: 'pending',
      requiredCommonFields: ['obstacleId', 'type', 'subtitleIndex', 'startTime', 'endTime', 'source_en', 'source_zh', 'text', 'markerStart', 'markerEnd', 'decisionSource', 'confidence', 'reviewDecision'],
    },
    analyzeInput: smokeAnalyzeInput,
  };
}

function getAiConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || process.env.P0_4A_ANALYZE_MODEL;
  if (!apiKey || !model) return null;
  return { apiKey, model };
}

function removeStaleSmokeOutput() {
  if (fs.existsSync(SMOKE_DRAFT_PATH)) fs.unlinkSync(SMOKE_DRAFT_PATH);
}

function extractJson(text) {
  try { return JSON.parse(text); } catch (_) {}
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI response did not contain a JSON object.');
  return JSON.parse(match[0]);
}

function normalizeObstacleDraft(parsed, smokeAnalyzeInput) {
  const output = {
    schemaVersion: parsed.schemaVersion || 'p0-4a-obstacles-draft-v1',
    reviewStatus: 'draft',
    smokeTest: true,
    runtimeMayConsume: false,
    promptContractVersion: PROMPT_CONTRACT_VERSION,
    episodeId: EPISODE_ID,
    learnerLevel: smokeAnalyzeInput.learnerLevel,
    analyzerVersion: smokeAnalyzeInput.analyzerVersion,
    generatedAt: parsed.generatedAt || new Date().toISOString(),
    pilotScope: smokeAnalyzeInput.pilotScope,
    smokeScope: smokeAnalyzeInput.smokeScope,
    sourceAnalyzeInputPath: 'output_text/drafts/p0_4a_analyze_input_pilot.json',
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
      obstacleId: `${EPISODE_ID}-obstacle-smoke-${String(index + 1).padStart(6, '0')}`,
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
  try {
    envelope = JSON.parse(raw);
  } catch (_) {
    envelope = { parseError: true, status: response.status, raw };
  }
  writeJson(path.join(DEBUG_DIR, 'response_envelope.json'), envelope);
  if (!response.ok) throw new Error(`OpenAI API error ${response.status}: ${raw}`);
  return envelope.choices?.[0]?.message?.content || '';
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  ensureDir(DRAFT_DIR);

  const analyzeInput = readJson(ANALYZE_INPUT_PATH);
  const smokeAnalyzeInput = buildSmokeAnalyzeInput(analyzeInput, options);

  const config = getAiConfig();
  if (!config) {
    removeStaleSmokeOutput();
    console.log('Skipping P0-4A smoke draft generation: AI configuration missing. Set OPENAI_API_KEY and OPENAI_MODEL (or P0_4A_ANALYZE_MODEL). No fake obstacles were generated and no smoke draft output was created.');
    return;
  }

  ensureDir(DEBUG_DIR);
  const prompt = buildPrompt(smokeAnalyzeInput);
  writeJson(path.join(DEBUG_DIR, 'prompt.json'), prompt);

  try {
    const rawResponse = await callAi(prompt, config);
    fs.writeFileSync(path.join(DEBUG_DIR, 'raw_response.txt'), rawResponse, 'utf8');
    const parsed = extractJson(rawResponse);
    writeJson(path.join(DEBUG_DIR, 'parsed_response.json'), parsed);
    const normalized = normalizeObstacleDraft(parsed, smokeAnalyzeInput);
    writeJson(SMOKE_DRAFT_PATH, normalized);
    console.log(`Wrote smoke draft obstacles: ${path.relative(REPO_ROOT, SMOKE_DRAFT_PATH)} (${normalized.obstacles.length} obstacles)`);
  } catch (error) {
    removeStaleSmokeOutput();
    fs.writeFileSync(path.join(DEBUG_DIR, 'parse_error.txt'), `${error.stack || error.message}\n`, 'utf8');
    console.error('AI smoke draft obstacle generation failed. No frozen output was generated.');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
