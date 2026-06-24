#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SOURCE_DRAFT_PATH = 'output_text/drafts/p0_5b_30_obstacle_ai_draft.json';
const SOURCE_VALIDATION_REPORT_PATH = 'output_text/drafts/p0_5b_30_obstacle_ai_draft_validation_report.json';
const REPAIRED_DRAFT_PATH = 'output_text/drafts/p0_5b_30_obstacle_ai_draft_repaired.json';
const REPAIR_REPORT_PATH = 'output_text/drafts/p0_5b_30_obstacle_ai_draft_repair_report.json';

const POS_NORMALIZATION = Object.freeze({
  noun: 'n.',
  verb: 'vt./vi.',
  adjective: 'adj.',
  adverb: 'adv.',
  'proper noun': 'n.',
});

const FROZEN_SUPPORTED_POS = new Set([
  'n.',
  'v.',
  'vt.',
  'vi.',
  'vt./vi.',
  'adj.',
  'adv.',
  'prep.',
  'conj.',
  'pron.',
  'interj.',
  'phr.',
  'abbr.',
]);

const PRESERVED_OBSTACLE_FIELDS = [
  'obstacleId',
  'type',
  'subtitleIndex',
  'startTime',
  'endTime',
  'source_en',
  'source_zh',
  'text',
  'markerStart',
  'markerEnd',
  'decisionSource',
  'confidence',
  'reviewStatus',
  'reviewDecision',
];

const COMPREHENSION_FIELDS = [
  'literal',
  'actual',
  'grammar',
  'prototype',
  'phrase',
  'text',
];

function fail(message) {
  throw new Error(`[P0-5B-5B repair] ${message}`);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`required input does not exist: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function stableJson(value) {
  return JSON.stringify(value, null, 2) + '\n';
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function chineseCharCount(value) {
  const matches = String(value || '').match(/[\u3400-\u9fff]/g);
  return matches ? matches.length : 0;
}

function obeysSentenceMeaningLimits(value) {
  const text = String(value || '');
  return chineseCharCount(text) <= 30 && text.length <= 80;
}

function isTooLongSentenceMeaning(value) {
  return !obeysSentenceMeaningLimits(value);
}

function cleanChineseMeaning(raw) {
  if (typeof raw !== 'string') return '';

  let value = raw
    .replace(/[（(][^（）()]*[）)]/g, '')
    .replace(/[A-Za-z][A-Za-z\s.'’_-]*:?/g, '')
    .replace(/^[\s:：;；,，.。/、|·•\-—]+|[\s:：;；,，.。/、|·•\-—]+$/g, '')
    .trim();

  const segments = value
    .split(/[，,；;、/|]/)
    .map((segment) => segment.replace(/^[\s:：.。·•\-—]+|[\s:：.。·•\-—]+$/g, '').trim())
    .filter(Boolean);

  const chineseSegments = segments.filter((segment) => /[\u3400-\u9fff]/.test(segment));
  value = chineseSegments[0] || '';

  value = value
    .replace(/^[的地得之]+/, '')
    .replace(/[。.!！?？]+$/g, '')
    .trim();

  if (!/[\u3400-\u9fff]/.test(value)) return '';
  if (!obeysSentenceMeaningLimits(value)) return '';
  return value;
}

function deriveSentenceMeaning(obstacle) {
  const candidates = [
    obstacle.translation,
    obstacle.source_zh,
  ];

  for (const candidate of candidates) {
    const cleaned = cleanChineseMeaning(candidate);
    if (cleaned) return cleaned;
  }

  return '';
}

function normalizePartOfSpeech(value) {
  if (typeof value !== 'string') return value;
  if (FROZEN_SUPPORTED_POS.has(value)) return value;
  return POS_NORMALIZATION[value.trim().toLowerCase()] || value;
}

function validateDraftBeforeRepair(draft) {
  if (draft.reviewStatus !== 'draft') fail('original draft reviewStatus must be draft');
  if (draft.runtimeMayConsume !== false) fail('original draft runtimeMayConsume must be false');
  if (!Array.isArray(draft.obstacles)) fail('original draft obstacles must be an array');
}

function validatePreservation(original, repaired, originalFileText) {
  if (fs.readFileSync(SOURCE_DRAFT_PATH, 'utf8') !== originalFileText) {
    fail('original AI draft file was overwritten or modified during repair');
  }
  if (repaired.reviewStatus !== 'draft') fail('repaired draft reviewStatus must remain draft');
  if (repaired.runtimeMayConsume !== false) fail('repaired draft runtimeMayConsume must remain false');
  if (repaired.obstacles.length !== original.obstacles.length) fail('repaired obstacle length changed');

  for (const topField of [
    'schemaVersion',
    'episodeId',
    'learnerLevel',
    'targetObstacleCount',
    'reviewStatus',
    'runtimeMayConsume',
    'sourceInputPath',
    'generator',
  ]) {
    if (!isEqual(original[topField], repaired[topField])) fail(`top-level field changed unexpectedly: ${topField}`);
  }

  for (let index = 0; index < original.obstacles.length; index += 1) {
    const before = original.obstacles[index];
    const after = repaired.obstacles[index];

    for (const field of PRESERVED_OBSTACLE_FIELDS) {
      if (!isEqual(before[field], after[field])) {
        fail(`field changed unexpectedly for obstacle ${before.obstacleId}: ${field}`);
      }
    }

    for (const field of COMPREHENSION_FIELDS) {
      if (before.type === 'comprehension' && !isEqual(before[field], after[field])) {
        fail(`comprehension field changed unexpectedly for obstacle ${before.obstacleId}: ${field}`);
      }
    }

    const allowedChangedFields = before.type === 'vocabulary' ? new Set(['partOfSpeech', 'sentenceMeaning']) : new Set();
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    for (const key of keys) {
      if (allowedChangedFields.has(key)) continue;
      if (!isEqual(before[key], after[key])) {
        fail(`disallowed obstacle change for ${before.obstacleId}: ${key}`);
      }
    }

    if (after.type === 'vocabulary') {
      if (!FROZEN_SUPPORTED_POS.has(after.partOfSpeech)) {
        fail(`unsupported repaired partOfSpeech for ${after.obstacleId}: ${after.partOfSpeech}`);
      }
      if (before.sentenceMeaning !== after.sentenceMeaning && !obeysSentenceMeaningLimits(after.sentenceMeaning)) {
        fail(`repaired sentenceMeaning exceeds limits for ${after.obstacleId}`);
      }
    }
  }
}

function main() {
  const originalFileText = fs.readFileSync(SOURCE_DRAFT_PATH, 'utf8');
  const original = readJson(SOURCE_DRAFT_PATH);
  readJson(SOURCE_VALIDATION_REPORT_PATH);
  validateDraftBeforeRepair(original);

  const repaired = deepClone(original);
  const changes = [];
  const unrepaired = [];
  let posNormalizedCount = 0;
  let sentenceMeaningShortenedCount = 0;

  for (const obstacle of repaired.obstacles) {
    if (obstacle.type !== 'vocabulary') continue;

    const originalPos = obstacle.partOfSpeech;
    const normalizedPos = normalizePartOfSpeech(originalPos);
    if (normalizedPos !== originalPos) {
      obstacle.partOfSpeech = normalizedPos;
      posNormalizedCount += 1;
      changes.push({
        obstacleId: obstacle.obstacleId,
        field: 'partOfSpeech',
        before: originalPos,
        after: normalizedPos,
        reason: 'Normalized vocabulary partOfSpeech display value to frozen-supported form.',
      });
    }

    const originalSentenceMeaning = obstacle.sentenceMeaning;
    if (isTooLongSentenceMeaning(originalSentenceMeaning)) {
      const conciseMeaning = deriveSentenceMeaning(obstacle);
      if (conciseMeaning) {
        obstacle.sentenceMeaning = conciseMeaning;
        sentenceMeaningShortenedCount += 1;
        changes.push({
          obstacleId: obstacle.obstacleId,
          field: 'sentenceMeaning',
          before: originalSentenceMeaning,
          after: conciseMeaning,
          reason: 'Shortened to concise Chinese current-sentence meaning derived from existing draft fields.',
        });
      } else {
        unrepaired.push({
          obstacleId: obstacle.obstacleId,
          field: 'sentenceMeaning',
          value: originalSentenceMeaning,
          reason: 'No safe concise Chinese meaning could be derived from existing draft fields without AI.',
        });
      }
    }
  }

  repaired.repair = {
    stage: 'P0-5B-5B',
    sourceDraftPath: SOURCE_DRAFT_PATH,
    sourceValidationReportPath: SOURCE_VALIDATION_REPORT_PATH,
    repairStatus: 'repaired-draft',
  };

  validatePreservation(original, repaired, originalFileText);

  const report = {
    schemaVersion: 'p0-5b-30-obstacle-draft-repair-report.v1',
    stage: 'P0-5B-5B',
    sourceDraftPath: SOURCE_DRAFT_PATH,
    sourceValidationReportPath: SOURCE_VALIDATION_REPORT_PATH,
    repairedDraftPath: REPAIRED_DRAFT_PATH,
    summary: {
      obstacleCount: repaired.obstacles.length,
      posNormalizedCount,
      sentenceMeaningShortenedCount,
      unrepairedCount: unrepaired.length,
    },
    changes,
    unrepaired,
    nextRecommendedStep: 'Run P0-5B validation gate against repaired draft.',
  };

  fs.mkdirSync(path.dirname(REPAIRED_DRAFT_PATH), { recursive: true });
  fs.writeFileSync(REPAIRED_DRAFT_PATH, stableJson(repaired));
  fs.writeFileSync(REPAIR_REPORT_PATH, stableJson(report));

  console.log('P0-5B-5B draft repair complete');
  console.log(`obstacle count: ${repaired.obstacles.length}`);
  console.log(`POS normalized: ${posNormalizedCount}`);
  console.log(`sentenceMeaning shortened: ${sentenceMeaningShortenedCount}`);
  console.log(`unrepaired: ${unrepaired.length}`);
  console.log(`repaired draft: ${REPAIRED_DRAFT_PATH}`);
  console.log(`repair report: ${REPAIR_REPORT_PATH}`);
}

main();
