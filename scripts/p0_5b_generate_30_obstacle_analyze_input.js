#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SCHEMA_VERSION = 'p0-5b-30-obstacle-analyze-input.v1';
const EPISODE_ID = 'tbbt-s12e01';
const LEARNER_LEVEL = 'CET-4';
const TARGET_OBSTACLE_COUNT = 30;
const SCOPE_START = '00:00:00';
const SCOPE_END = '00:06:00';
const SOURCE_PATH = 'output_text/v28d_bilingual_subtitles.json';
const OUTPUT_PATH = 'output_text/drafts/p0_5b_30_obstacle_analyze_input.json';
const SCOPE_CONTRACT_TAG = 'p0-5b-2-30-obstacle-offline-analyze-input-expansion-contract';
const SELECTION_RULE = 'include subtitle rows whose time range overlaps the frozen scope';

const START_FIELDS = ['startTime', 'start', 'timeStart'];
const END_FIELDS = ['endTime', 'end', 'timeEnd'];
const ENGLISH_FIELDS = ['source_en', 'en', 'english', 'text_en', 'text'];
const CHINESE_FIELDS = ['source_zh', 'zh', 'chinese', 'text_zh'];

function fail(message) {
  throw new Error(`P0-5B-3 analyze input generation failed: ${message}`);
}

function pickField(row, fieldNames) {
  for (const fieldName of fieldNames) {
    if (Object.prototype.hasOwnProperty.call(row, fieldName) && row[fieldName] !== null && row[fieldName] !== undefined) {
      return row[fieldName];
    }
  }
  return undefined;
}

function parseTimeToSeconds(value, label) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    fail(`${label} must be a string or finite number`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    fail(`${label} must not be empty`);
  }

  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  const parts = trimmed.split(':');
  if (parts.length === 2 || parts.length === 3) {
    const numericParts = parts.map((part) => Number(part));
    if (numericParts.every((part) => Number.isFinite(part))) {
      if (parts.length === 2) {
        return numericParts[0] * 60 + numericParts[1];
      }
      return numericParts[0] * 3600 + numericParts[1] * 60 + numericParts[2];
    }
  }

  fail(`could not parse ${label}: ${JSON.stringify(value)}`);
}

function normalizeTime(value, label) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  fail(`${label} is not usable`);
}

function overlapsScope(startSeconds, endSeconds) {
  const scopeStartSeconds = parseTimeToSeconds(SCOPE_START, 'scope start');
  const scopeEndSeconds = parseTimeToSeconds(SCOPE_END, 'scope end');
  return startSeconds < scopeEndSeconds && endSeconds > scopeStartSeconds;
}

function readSubtitleRows() {
  const raw = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));
  const rows = Array.isArray(raw) ? raw : raw.subtitles;
  if (!Array.isArray(rows)) {
    fail(`source must be an array or contain a subtitles array: ${SOURCE_PATH}`);
  }
  return rows;
}

function normalizeRow(row, arrayIndex) {
  const startRaw = pickField(row, START_FIELDS);
  const endRaw = pickField(row, END_FIELDS);
  if (startRaw === undefined || endRaw === undefined) {
    fail(`no usable start/end fields exist for subtitle array index ${arrayIndex}`);
  }

  const englishRaw = pickField(row, ENGLISH_FIELDS);
  if (typeof englishRaw !== 'string' || !englishRaw.trim()) {
    fail(`English text is unavailable for subtitle array index ${arrayIndex}`);
  }

  const chineseRaw = pickField(row, CHINESE_FIELDS);
  const subtitleIndex = Object.prototype.hasOwnProperty.call(row, 'subtitleIndex') ? row.subtitleIndex : arrayIndex;

  return {
    subtitleIndex,
    startTime: normalizeTime(startRaw, `start time for subtitle array index ${arrayIndex}`),
    endTime: normalizeTime(endRaw, `end time for subtitle array index ${arrayIndex}`),
    source_en: englishRaw,
    source_zh: typeof chineseRaw === 'string' ? chineseRaw : '',
    startSeconds: parseTimeToSeconds(startRaw, `start time for subtitle array index ${arrayIndex}`),
    endSeconds: parseTimeToSeconds(endRaw, `end time for subtitle array index ${arrayIndex}`),
  };
}

function buildOutput() {
  const normalized = readSubtitleRows().map(normalizeRow);
  const selected = normalized.filter((row) => overlapsScope(row.startSeconds, row.endSeconds));

  const subtitles = selected.map((row) => {
    const originalPosition = normalized.findIndex((candidate) => candidate === row);
    return {
      subtitleIndex: row.subtitleIndex,
      startTime: row.startTime,
      endTime: row.endTime,
      source_en: row.source_en,
      source_zh: row.source_zh,
      contextBefore: normalized.slice(Math.max(0, originalPosition - 2), originalPosition).map((contextRow) => contextRow.source_en),
      contextAfter: normalized.slice(originalPosition + 1, originalPosition + 3).map((contextRow) => contextRow.source_en),
    };
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    episodeId: EPISODE_ID,
    learnerLevel: LEARNER_LEVEL,
    targetObstacleCount: TARGET_OBSTACLE_COUNT,
    pilotScope: {
      start: SCOPE_START,
      end: SCOPE_END,
      selectionRule: SELECTION_RULE,
    },
    source: {
      subtitlesPath: SOURCE_PATH,
      scopeContractTag: SCOPE_CONTRACT_TAG,
    },
    generationRules: {
      aiMayBeCalled: false,
      runtimeMayConsume: false,
      draftOnly: true,
      mustNotGenerateObstacles: true,
    },
    stats: {
      subtitleCount: subtitles.length,
      firstSubtitleIndex: subtitles.length > 0 ? subtitles[0].subtitleIndex : null,
      lastSubtitleIndex: subtitles.length > 0 ? subtitles[subtitles.length - 1].subtitleIndex : null,
      firstStartTime: subtitles.length > 0 ? subtitles[0].startTime : null,
      lastEndTime: subtitles.length > 0 ? subtitles[subtitles.length - 1].endTime : null,
    },
    subtitles,
  };
}

function validateOutput(output) {
  if (OUTPUT_PATH !== 'output_text/drafts/p0_5b_30_obstacle_analyze_input.json') fail('output path is not the exact allowed path');
  if (!output.generationRules || output.generationRules.draftOnly !== true) fail('output must be draft/input only');
  if (output.generationRules.runtimeMayConsume !== false) fail('runtimeMayConsume must be false');
  if (Object.prototype.hasOwnProperty.call(output, 'obstacles')) fail('output must not contain an obstacles field');
  if (!Array.isArray(output.subtitles) || output.subtitles.length === 0) fail('subtitles must be a non-empty array');
  if (output.targetObstacleCount !== 30) fail('targetObstacleCount must be 30');
  if (output.schemaVersion !== SCHEMA_VERSION) fail('schemaVersion mismatch');

  for (const row of output.subtitles) {
    for (const fieldName of ['subtitleIndex', 'startTime', 'endTime', 'source_en']) {
      if (!Object.prototype.hasOwnProperty.call(row, fieldName)) fail(`subtitle missing ${fieldName}`);
    }
    if (!overlapsScope(parseTimeToSeconds(row.startTime, 'subtitle startTime'), parseTimeToSeconds(row.endTime, 'subtitle endTime'))) {
      fail(`subtitle ${row.subtitleIndex} does not overlap ${SCOPE_START}~${SCOPE_END}`);
    }
  }
}

function main() {
  const output = buildOutput();
  validateOutput(output);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);

  console.log('P0-5B-3 analyze input generated');
  console.log(`subtitle count: ${output.stats.subtitleCount}`);
  console.log(`subtitle index range: ${output.stats.firstSubtitleIndex}~${output.stats.lastSubtitleIndex}`);
  console.log(`time range: ${output.stats.firstStartTime}~${output.stats.lastEndTime}`);
  console.log(`output: ${OUTPUT_PATH}`);
  console.log('AI called: false');
  console.log('obstacles generated: false');
  console.log('runtime may consume: false');
}

main();
