#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SUBTITLE_PATH = path.join(REPO_ROOT, 'output_text', 'v28d_bilingual_subtitles.json');
const DRAFT_DIR = path.join(REPO_ROOT, 'output_text', 'drafts');
const DEBUG_DIR = path.join(REPO_ROOT, 'tmp', 'p0_4a_analyze_debug');
const ANALYZE_INPUT_PATH = path.join(DRAFT_DIR, 'p0_4a_analyze_input_pilot.json');
const OBSTACLE_DRAFT_PATH = path.join(DRAFT_DIR, 'p0_4a_obstacles_pilot_draft.json');

const EPISODE_ID = 'tbbt-s12e01';
const PILOT_START = '00:00:00';
const PILOT_END = '00:02:00';
const PILOT_START_SECONDS = 0;
const PILOT_END_SECONDS = 120;
const DEFAULT_LEARNER_LEVEL = 'CET-4';
const ANALYZER_VERSION = 'p0-4a-1-pilot-skeleton-v1';
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

function toSeconds(value) {
  if (typeof value === 'number') return value;
  const text = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
  const parts = text.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  throw new Error(`Unsupported timestamp: ${value}`);
}

function formatTime(value) {
  const seconds = toSeconds(value);
  const whole = Math.floor(seconds);
  const fraction = seconds - whole;
  const hh = String(Math.floor(whole / 3600)).padStart(2, '0');
  const mm = String(Math.floor((whole % 3600) / 60)).padStart(2, '0');
  const ss = String(whole % 60).padStart(2, '0');
  if (fraction === 0) return `${hh}:${mm}:${ss}`;
  const decimal = fraction.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  return `${hh}:${mm}:${ss}${decimal.slice(1)}`;
}

function normalizeSubtitle(raw, index) {
  return {
    subtitleIndex: index,
    startTime: formatTime(raw.start ?? raw.startTime),
    endTime: formatTime(raw.end ?? raw.endTime),
    startSeconds: toSeconds(raw.start ?? raw.startTime),
    endSeconds: toSeconds(raw.end ?? raw.endTime),
    source_en: raw.en ?? raw.source_en ?? '',
    source_zh: raw.zh ?? raw.source_zh ?? '',
  };
}

function selectPilotSubtitles(subtitles) {
  return subtitles.filter((subtitle) => subtitle.startSeconds >= PILOT_START_SECONDS && subtitle.endSeconds <= PILOT_END_SECONDS);
}

function contextFor(subtitles, currentIndex, direction) {
  const windowSize = 2;
  const selected = direction === 'before'
    ? subtitles.slice(Math.max(0, currentIndex - windowSize), currentIndex)
    : subtitles.slice(currentIndex + 1, currentIndex + 1 + windowSize);
  return selected.map((subtitle) => ({
    subtitleIndex: subtitle.subtitleIndex,
    startTime: subtitle.startTime,
    endTime: subtitle.endTime,
    source_en: subtitle.source_en,
    source_zh: subtitle.source_zh,
  }));
}

function buildAnalyzeInput(pilotSubtitles, learnerLevel) {
  return {
    schemaVersion: 'p0-4a-analyze-input-v1',
    episodeId: EPISODE_ID,
    pilotScope: { startTime: PILOT_START, endTime: PILOT_END },
    learnerLevel,
    analyzerVersion: ANALYZER_VERSION,
    sourceSubtitlePath: 'output_text/v28d_bilingual_subtitles.json',
    runtimeBoundary: {
      runtimeMayConsume: false,
      note: 'Draft analyze input only. Runtime must not read output_text/drafts/*.',
    },
    items: pilotSubtitles.map((subtitle, localIndex) => ({
      episodeId: EPISODE_ID,
      subtitleIndex: subtitle.subtitleIndex,
      startTime: subtitle.startTime,
      endTime: subtitle.endTime,
      source_en: subtitle.source_en,
      source_zh: subtitle.source_zh,
      learnerLevel,
      contextBefore: contextFor(pilotSubtitles, localIndex, 'before'),
      contextAfter: contextFor(pilotSubtitles, localIndex, 'after'),
      analyzerVersion: ANALYZER_VERSION,
    })),
  };
}

function buildPrompt(analyzeInput) {
  return {
    role: 'P0-4A offline Analyze Engine pilot',
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
      pilotScope: { startTime: PILOT_START, endTime: PILOT_END },
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
    pilotScope: { startTime: PILOT_START, endTime: PILOT_END },
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
  if (!response.ok) throw new Error(`OpenAI API error ${response.status}: ${raw}`);
  const envelope = JSON.parse(raw);
  return envelope.choices?.[0]?.message?.content || '';
}

async function main() {
  ensureDir(DRAFT_DIR);
  ensureDir(DEBUG_DIR);

  const subtitleJson = readJson(SUBTITLE_PATH);
  const rawSubtitles = Array.isArray(subtitleJson) ? subtitleJson : subtitleJson.subtitles;
  if (!Array.isArray(rawSubtitles)) throw new Error('Subtitle JSON must contain a subtitles array.');

  const allSubtitles = rawSubtitles.map(normalizeSubtitle);
  const pilotSubtitles = selectPilotSubtitles(allSubtitles);
  const learnerLevel = process.env.P0_4A_LEARNER_LEVEL || DEFAULT_LEARNER_LEVEL;
  const analyzeInput = buildAnalyzeInput(pilotSubtitles, learnerLevel);
  writeJson(ANALYZE_INPUT_PATH, analyzeInput);
  console.log(`Wrote analyze input: ${path.relative(REPO_ROOT, ANALYZE_INPUT_PATH)} (${analyzeInput.items.length} subtitles)`);

  const config = getAiConfig();
  if (!config) {
    console.log('AI configuration missing: set OPENAI_API_KEY and OPENAI_MODEL (or P0_4A_ANALYZE_MODEL) to generate draft obstacles. Skipping draft obstacle generation.');
    return;
  }

  const prompt = buildPrompt(analyzeInput);
  writeJson(path.join(DEBUG_DIR, 'prompt.json'), prompt);

  let rawResponse = '';
  try {
    rawResponse = await callAi(prompt, config);
    fs.writeFileSync(path.join(DEBUG_DIR, 'raw_response.txt'), rawResponse, 'utf8');
    const parsed = extractJson(rawResponse);
    writeJson(path.join(DEBUG_DIR, 'parsed_response.json'), parsed);
    const normalized = normalizeObstacleDraft(parsed, analyzeInput);
    writeJson(OBSTACLE_DRAFT_PATH, normalized);
    console.log(`Wrote draft obstacles: ${path.relative(REPO_ROOT, OBSTACLE_DRAFT_PATH)} (${normalized.obstacles.length} obstacles)`);
  } catch (error) {
    fs.writeFileSync(path.join(DEBUG_DIR, 'parse_error.txt'), `${error.stack || error.message}\n`, 'utf8');
    console.error('AI draft obstacle generation failed. Analyze input remains available; no frozen output was generated.');
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
