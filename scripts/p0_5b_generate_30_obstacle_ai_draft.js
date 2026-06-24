#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const INPUT_PATH = 'output_text/drafts/p0_5b_30_obstacle_analyze_input.json';
const OUTPUT_PATH = 'output_text/drafts/p0_5b_30_obstacle_ai_draft.json';
const API_KEY_PATH = 'qwen_api_key.txt';
const ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const SCHEMA_VERSION = 'p0-5b-30-obstacle-ai-draft.v1';
const EPISODE_ID = 'tbbt-s12e01';
const LEARNER_LEVEL = 'CET-4';
const TARGET_OBSTACLE_COUNT = 30;
const MODEL = 'qwen-plus';
const TEMPERATURE = 0;
const ID_PREFIX = `${EPISODE_ID}-p0-5b-obstacle-`;
const TYPE_ORDER = { vocabulary: 0, comprehension: 1 };
const ALLOWED_TYPES = new Set(['vocabulary', 'comprehension']);
const COMMON_FIELDS = [
  'obstacleId', 'type', 'subtitleIndex', 'startTime', 'endTime', 'source_en', 'source_zh',
  'text', 'markerStart', 'markerEnd', 'decisionSource', 'confidence', 'reviewStatus', 'reviewDecision',
];
const VOCABULARY_FIELDS = ['word', 'lemma', 'phonetic', 'partOfSpeech', 'sentenceMeaning', 'translation'];
const COMPREHENSION_REQUIRED_ONE_OF = ['prototype', 'phrase', 'text'];
const COMPREHENSION_FIELDS = ['literal', 'actual', 'grammar'];

function repoPath(relativePath) {
  return path.join(REPO_ROOT, relativePath);
}

function fail(message, diagnostics = []) {
  const details = diagnostics.length ? `\n${diagnostics.map((item) => `- ${item}`).join('\n')}` : '';
  throw new Error(`P0-5B-4 AI draft generation failed: ${message}${details}`);
}

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(repoPath(relativePath), 'utf8'));
  } catch (error) {
    fail(`could not read valid JSON from ${relativePath}: ${error.message}`);
  }
}

function readApiKey() {
  try {
    const apiKey = fs.readFileSync(repoPath(API_KEY_PATH), 'utf8').trim();
    if (!apiKey) fail(`${API_KEY_PATH} is empty`);
    return apiKey;
  } catch (error) {
    if (error.code === 'ENOENT') fail(`${API_KEY_PATH} is missing`);
    fail(`could not read ${API_KEY_PATH}: ${error.message}`);
  }
}

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch (_) {
    fail('AI response was not valid top-level JSON. The model must return JSON only.');
  }
}

function subtitleMapFromInput(analyzeInput) {
  if (!Array.isArray(analyzeInput.subtitles)) fail('input subtitles must be an array');
  const map = new Map();
  for (const subtitle of analyzeInput.subtitles) {
    map.set(String(subtitle.subtitleIndex), subtitle);
  }
  return map;
}

function buildPrompt(analyzeInput) {
  return {
    task: 'P0-5B-4 30-obstacle AI Draft Generation',
    instructions: [
      'Return JSON only.',
      'No markdown fences.',
      'Do not claim output is frozen.',
      'Do not call tools.',
      'Do not generate coordinates.',
      'Do not generate visual mapping.',
      'Do not generate marker positions beyond markerStart/markerEnd character offsets.',
      'Do not modify subtitle JSON.',
      'Do not modify Runtime.',
      'Do not output runtimeMayConsume true.',
      'Do not output reviewStatus frozen.',
      'Do not fabricate obstacles.',
      'Use only the provided analyze input subtitles. Do not invent or rewrite subtitle text.',
      'Generate up to 30 high-quality draft obstacles; false positives are worse than fewer obstacles.',
      'Vocabulary obstacles must be level-aware for CET-4.',
      'Comprehension obstacles must be real meaning barriers, not ordinary literal or merely useful sentences.',
      'Avoid duplicate learning items and nested low-value duplicate comprehension spans.',
      'Sort by subtitleIndex ascending, markerStart ascending, vocabulary before comprehension when tied, then text alphabetically.',
      'Follow the frozen product philosophy, vocabulary level determination contract, comprehension obstacle determination contract, and analyze prompt contract.',
    ],
    requiredTopLevelShape: {
      schemaVersion: SCHEMA_VERSION,
      episodeId: EPISODE_ID,
      learnerLevel: LEARNER_LEVEL,
      targetObstacleCount: TARGET_OBSTACLE_COUNT,
      reviewStatus: 'draft',
      runtimeMayConsume: false,
      sourceInputPath: INPUT_PATH,
      generator: { stage: 'P0-5B-4', model: MODEL, temperature: TEMPERATURE },
      obstacles: [],
    },
    obstacleContract: {
      allowedTypes: ['vocabulary', 'comprehension'],
      commonRequiredFields: COMMON_FIELDS,
      vocabularyRequiredFields: VOCABULARY_FIELDS,
      comprehensionRequiredFields: ['prototype or phrase or text', ...COMPREHENSION_FIELDS],
      obstacleIdFormat: `${ID_PREFIX}NNNNNN`,
      firstObstacleId: `${ID_PREFIX}000001`,
      reviewStatus: 'draft',
      reviewDecision: 'pending',
      markerRule: 'markerStart and markerEnd are zero-based character offsets in source_en; text must equal source_en.slice(markerStart, markerEnd) or a semantically exact trimmed substring inside that slice.',
    },
    analyzeInput,
  };
}

async function callQwen(prompt, apiKey) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: TEMPERATURE,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a deterministic JSON-only draft obstacle generator. Return one JSON object and no other text.' },
        { role: 'user', content: JSON.stringify(prompt) },
      ],
    }),
  });

  const raw = await response.text();
  if (!response.ok) fail(`DashScope request failed with HTTP ${response.status} ${response.statusText}: ${raw}`);
  let envelope;
  try {
    envelope = JSON.parse(raw);
  } catch (error) {
    fail(`DashScope response envelope was not valid JSON: ${error.message}`);
  }
  const content = envelope?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) fail('DashScope response did not contain message content');
  return extractJson(content);
}

function hasRuntimeMayConsumeTrue(value) {
  if (value === null || typeof value !== 'object') return false;
  if (value.runtimeMayConsume === true) return true;
  return Object.values(value).some(hasRuntimeMayConsumeTrue);
}

function isCompatibleText(source, start, end, text) {
  const slice = source.slice(start, end);
  return text === slice || (slice.includes(text.trim()) && text.trim().length > 0);
}

function normalizeDraft(parsed) {
  const obstacles = Array.isArray(parsed.obstacles) ? parsed.obstacles.slice() : [];
  obstacles.sort((a, b) =>
    Number(a.subtitleIndex) - Number(b.subtitleIndex)
    || Number(a.markerStart) - Number(b.markerStart)
    || TYPE_ORDER[a.type] - TYPE_ORDER[b.type]
    || String(a.text || '').localeCompare(String(b.text || ''), 'en')
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    episodeId: EPISODE_ID,
    learnerLevel: LEARNER_LEVEL,
    targetObstacleCount: TARGET_OBSTACLE_COUNT,
    reviewStatus: 'draft',
    runtimeMayConsume: false,
    sourceInputPath: INPUT_PATH,
    generator: { stage: 'P0-5B-4', model: MODEL, temperature: TEMPERATURE },
    obstacles: obstacles.map((obstacle, index) => ({
      ...obstacle,
      obstacleId: `${ID_PREFIX}${String(index + 1).padStart(6, '0')}`,
      reviewStatus: 'draft',
      reviewDecision: 'pending',
    })),
  };
}

function validateDraft(draft, analyzeInput) {
  const diagnostics = [];
  const subtitlesByIndex = subtitleMapFromInput(analyzeInput);

  if (OUTPUT_PATH !== 'output_text/drafts/p0_5b_30_obstacle_ai_draft.json') diagnostics.push('output path is not the exact allowed draft path');
  if (draft.schemaVersion !== SCHEMA_VERSION) diagnostics.push('bad schemaVersion');
  if (draft.episodeId !== EPISODE_ID) diagnostics.push('bad episodeId');
  if (draft.learnerLevel !== LEARNER_LEVEL) diagnostics.push('bad learnerLevel');
  if (draft.targetObstacleCount !== TARGET_OBSTACLE_COUNT) diagnostics.push('bad targetObstacleCount');
  if (draft.reviewStatus !== 'draft') diagnostics.push('top-level reviewStatus must be draft');
  if (draft.runtimeMayConsume !== false) diagnostics.push('runtimeMayConsume must be false');
  if (draft.sourceInputPath !== INPUT_PATH) diagnostics.push('bad sourceInputPath');
  if (!draft.generator || draft.generator.stage !== 'P0-5B-4' || draft.generator.model !== MODEL || draft.generator.temperature !== TEMPERATURE) diagnostics.push('bad generator metadata');
  if (!Array.isArray(draft.obstacles)) diagnostics.push('obstacles must be an array');
  if (Array.isArray(draft.obstacles) && draft.obstacles.length > TARGET_OBSTACLE_COUNT) diagnostics.push('obstacle count exceeds 30');
  if (hasRuntimeMayConsumeTrue(draft)) diagnostics.push('runtimeMayConsume true is forbidden anywhere in output');

  if (Array.isArray(draft.obstacles)) {
    draft.obstacles.forEach((obstacle, index) => {
      const label = `obstacle[${index}]`;
      for (const field of COMMON_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(obstacle, field)) diagnostics.push(`${label} missing ${field}`);
      }
      if (!ALLOWED_TYPES.has(obstacle.type)) diagnostics.push(`${label} has invalid type`);
      if (obstacle.reviewStatus !== 'draft') diagnostics.push(`${label} reviewStatus must be draft`);
      if (obstacle.reviewDecision !== 'pending') diagnostics.push(`${label} reviewDecision must be pending`);
      const expectedId = `${ID_PREFIX}${String(index + 1).padStart(6, '0')}`;
      if (obstacle.obstacleId !== expectedId || !new RegExp(`^${ID_PREFIX}\\d{6}$`).test(String(obstacle.obstacleId))) diagnostics.push(`${label} has bad obstacleId`);

      const subtitle = subtitlesByIndex.get(String(obstacle.subtitleIndex));
      if (!subtitle) {
        diagnostics.push(`${label} subtitleIndex does not exist in input`);
      } else {
        if (obstacle.source_en !== subtitle.source_en) diagnostics.push(`${label} source_en does not exactly match input subtitle`);
        if (obstacle.startTime !== subtitle.startTime) diagnostics.push(`${label} startTime does not match input subtitle`);
        if (obstacle.endTime !== subtitle.endTime) diagnostics.push(`${label} endTime does not match input subtitle`);
        if (obstacle.source_zh !== subtitle.source_zh) diagnostics.push(`${label} source_zh does not match input subtitle`);
      }

      if (!Number.isInteger(obstacle.markerStart) || !Number.isInteger(obstacle.markerEnd)) {
        diagnostics.push(`${label} markerStart/markerEnd must be integers`);
      } else if (typeof obstacle.source_en === 'string') {
        if (!(0 <= obstacle.markerStart && obstacle.markerStart < obstacle.markerEnd && obstacle.markerEnd <= obstacle.source_en.length)) diagnostics.push(`${label} marker offsets are out of bounds`);
        if (typeof obstacle.text !== 'string' || !isCompatibleText(obstacle.source_en, obstacle.markerStart, obstacle.markerEnd, obstacle.text)) diagnostics.push(`${label} text is not compatible with marked substring`);
      }

      if (obstacle.type === 'vocabulary') {
        for (const field of VOCABULARY_FIELDS) {
          if (!Object.prototype.hasOwnProperty.call(obstacle, field) || obstacle[field] === '') diagnostics.push(`${label} vocabulary obstacle missing ${field}`);
        }
      }
      if (obstacle.type === 'comprehension') {
        if (!COMPREHENSION_REQUIRED_ONE_OF.some((field) => Object.prototype.hasOwnProperty.call(obstacle, field) && String(obstacle[field]).trim())) diagnostics.push(`${label} comprehension obstacle missing prototype/phrase/text`);
        for (const field of COMPREHENSION_FIELDS) {
          if (!Object.prototype.hasOwnProperty.call(obstacle, field) || obstacle[field] === '') diagnostics.push(`${label} comprehension obstacle missing ${field}`);
        }
      }
    });
  }

  if (diagnostics.length) fail('validation failed; no partial draft file was written', diagnostics);
}

async function main() {
  const analyzeInput = readJson(INPUT_PATH);
  const apiKey = readApiKey();
  const prompt = buildPrompt(analyzeInput);
  const parsed = await callQwen(prompt, apiKey);
  const draft = normalizeDraft(parsed);
  validateDraft(draft, analyzeInput);

  fs.mkdirSync(path.dirname(repoPath(OUTPUT_PATH)), { recursive: true });
  fs.writeFileSync(repoPath(OUTPUT_PATH), `${JSON.stringify(draft, null, 2)}\n`, 'utf8');

  console.log('P0-5B-4 AI draft generated');
  console.log(`model: ${MODEL}`);
  console.log(`target obstacle count: ${TARGET_OBSTACLE_COUNT}`);
  console.log(`actual obstacle count: ${draft.obstacles.length}`);
  console.log(`reviewStatus: ${draft.reviewStatus}`);
  console.log(`runtimeMayConsume: ${draft.runtimeMayConsume}`);
  console.log(`output: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
