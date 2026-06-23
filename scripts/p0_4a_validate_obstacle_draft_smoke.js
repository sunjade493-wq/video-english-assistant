#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DRAFT_PATH = path.join(REPO_ROOT, 'output_text', 'drafts', 'p0_4a_obstacles_pilot_draft_smoke.json');
const REPORT_PATH = path.join(REPO_ROOT, 'output_text', 'drafts', 'p0_4a_obstacles_pilot_draft_review_report.json');
const SOURCE_DRAFT_PATH = 'output_text/drafts/p0_4a_obstacles_pilot_draft_smoke.json';

const EXPECTED_TOP_LEVEL = {
  schemaVersion: 'p0-4a-obstacles-draft-smoke-v1',
  smokeTest: true,
  runtimeMayConsume: false,
  promptContractVersion: 'p0-analyze-prompt-contract-v1',
  reviewStatus: 'draft',
  episodeId: 'tbbt-s12e01',
  analyzerVersion: 'p0-4a-2b-real-ai-draft-generation-v1',
};

const REPORT_SCHEMA_VERSION = 'p0-4a-draft-review-report-v1';
const OBSTACLE_ID_PATTERN = /^tbbt-s12e01-obstacle-(\d{6})$/;
const ALLOWED_TYPES = new Set(['vocabulary', 'comprehension']);
const TYPE_ORDER = { vocabulary: 0, comprehension: 1 };

const REQUIRED_COMMON_FIELDS = [
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
  'reviewDecision',
];

const REQUIRED_VOCABULARY_FIELDS = [
  'word',
  'lemma',
  'phonetic',
  'partOfSpeech',
  'sentenceMeaning',
  'translation',
  'difficultyLevel',
  'difficultyEvidence',
];

const REQUIRED_COMPREHENSION_FIELDS = [
  'phrase',
  'literal',
  'actual',
  'grammar',
  'explanationWhy',
  'transferableUsage',
  'comprehensionCategory',
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function hasField(object, field) {
  return Object.prototype.hasOwnProperty.call(object, field);
}

function addMissingFieldErrors(errors, obstacle, obstacleLabel, fields) {
  for (const field of fields) {
    if (!hasField(obstacle, field)) {
      errors.push(`${obstacleLabel}: missing required field "${field}".`);
    }
  }
}

function getSmokeScopeRange(smokeScope, errors) {
  if (!smokeScope || typeof smokeScope !== 'object' || Array.isArray(smokeScope)) {
    errors.push('Top-level field "smokeScope" must be an object.');
    return null;
  }

  const start = smokeScope.subtitleIndexStart;
  const end = smokeScope.subtitleIndexEnd;

  if (!Number.isInteger(start)) {
    errors.push('smokeScope.subtitleIndexStart must be an integer.');
  }
  if (!Number.isInteger(end)) {
    errors.push('smokeScope.subtitleIndexEnd must be an integer.');
  }
  if (Number.isInteger(start) && Number.isInteger(end) && start > end) {
    errors.push('smokeScope subtitleIndexStart must be less than or equal to subtitleIndexEnd.');
  }

  if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) return null;
  return { start, end };
}

function validateTopLevel(draft, errors) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    errors.push('Draft root must be a JSON object.');
    return null;
  }

  for (const [field, expected] of Object.entries(EXPECTED_TOP_LEVEL)) {
    if (draft[field] !== expected) {
      errors.push(`Top-level field "${field}" must be ${JSON.stringify(expected)}; found ${JSON.stringify(draft[field])}.`);
    }
  }

  if (!hasField(draft, 'sourceAnalyzeInputPath')) {
    errors.push('Top-level field "sourceAnalyzeInputPath" is required.');
  } else if (typeof draft.sourceAnalyzeInputPath !== 'string' || draft.sourceAnalyzeInputPath.trim() === '') {
    errors.push('Top-level field "sourceAnalyzeInputPath" must be a non-empty string.');
  } else {
    const sourceAnalyzeInputPath = path.resolve(REPO_ROOT, draft.sourceAnalyzeInputPath);
    if (!fs.existsSync(sourceAnalyzeInputPath)) {
      errors.push(`sourceAnalyzeInputPath does not exist: ${draft.sourceAnalyzeInputPath}.`);
    }
  }

  if (!hasField(draft, 'smokeScope')) {
    errors.push('Top-level field "smokeScope" is required.');
  }

  if (!Array.isArray(draft.obstacles)) {
    errors.push('Top-level field "obstacles" must be an array.');
  }

  return getSmokeScopeRange(draft.smokeScope, errors);
}

function compareObstacleOrder(a, b) {
  return (
    a.subtitleIndex - b.subtitleIndex
    || a.markerStart - b.markerStart
    || TYPE_ORDER[a.type] - TYPE_ORDER[b.type]
    || String(a.text).localeCompare(String(b.text), 'en')
  );
}

function validateObstacle(obstacle, index, smokeRange, errors) {
  const obstacleLabel = `obstacles[${index}]`;

  if (!obstacle || typeof obstacle !== 'object' || Array.isArray(obstacle)) {
    errors.push(`${obstacleLabel}: obstacle must be an object.`);
    return;
  }

  addMissingFieldErrors(errors, obstacle, obstacleLabel, REQUIRED_COMMON_FIELDS);

  const idMatch = typeof obstacle.obstacleId === 'string' ? obstacle.obstacleId.match(OBSTACLE_ID_PATTERN) : null;
  if (!idMatch) {
    errors.push(`${obstacleLabel}: obstacleId must match tbbt-s12e01-obstacle-NNNNNN.`);
  }

  if (!ALLOWED_TYPES.has(obstacle.type)) {
    errors.push(`${obstacleLabel}: type must be either "vocabulary" or "comprehension".`);
  }

  if (obstacle.reviewDecision !== 'pending') {
    errors.push(`${obstacleLabel}: reviewDecision must be "pending".`);
  }

  if (typeof obstacle.confidence !== 'number' || !Number.isFinite(obstacle.confidence) || obstacle.confidence < 0 || obstacle.confidence > 1) {
    errors.push(`${obstacleLabel}: confidence must be a number between 0 and 1.`);
  }

  if (!Number.isInteger(obstacle.subtitleIndex)) {
    errors.push(`${obstacleLabel}: subtitleIndex must be an integer.`);
  } else if (smokeRange && (obstacle.subtitleIndex < smokeRange.start || obstacle.subtitleIndex > smokeRange.end)) {
    errors.push(`${obstacleLabel}: subtitleIndex ${obstacle.subtitleIndex} is outside smokeScope range ${smokeRange.start}-${smokeRange.end}.`);
  }

  const sourceEn = typeof obstacle.source_en === 'string' ? obstacle.source_en : null;
  if (sourceEn === null) {
    errors.push(`${obstacleLabel}: source_en must be a string for marker validation.`);
  }

  if (!Number.isInteger(obstacle.markerStart) || !Number.isInteger(obstacle.markerEnd)) {
    errors.push(`${obstacleLabel}: markerStart and markerEnd must be integers.`);
  } else if (sourceEn !== null && !(obstacle.markerStart >= 0 && obstacle.markerStart < obstacle.markerEnd && obstacle.markerEnd <= sourceEn.length)) {
    errors.push(`${obstacleLabel}: marker range must satisfy 0 <= markerStart < markerEnd <= source_en.length.`);
  }

  if (obstacle.type === 'vocabulary') {
    addMissingFieldErrors(errors, obstacle, obstacleLabel, REQUIRED_VOCABULARY_FIELDS);
  } else if (obstacle.type === 'comprehension') {
    addMissingFieldErrors(errors, obstacle, obstacleLabel, REQUIRED_COMPREHENSION_FIELDS);
  }
}

function validateContinuousObstacleIds(obstacles, errors) {
  const idNumbers = [];
  const seen = new Set();

  obstacles.forEach((obstacle, index) => {
    const match = typeof obstacle?.obstacleId === 'string' ? obstacle.obstacleId.match(OBSTACLE_ID_PATTERN) : null;
    if (!match) return;

    const id = obstacle.obstacleId;
    if (seen.has(id)) {
      errors.push(`obstacles[${index}]: duplicate obstacleId ${id}.`);
    }
    seen.add(id);
    idNumbers.push(Number(match[1]));
  });

  idNumbers.sort((a, b) => a - b);
  idNumbers.forEach((idNumber, index) => {
    const expected = index + 1;
    if (idNumber !== expected) {
      errors.push(`Obstacle IDs must be continuous after sorting; expected ${String(expected).padStart(6, '0')} but found ${String(idNumber).padStart(6, '0')}.`);
    }
  });
}

function validateOrdering(obstacles, errors) {
  for (let index = 1; index < obstacles.length; index += 1) {
    const previous = obstacles[index - 1];
    const current = obstacles[index];

    if (!previous || !current || typeof previous !== 'object' || typeof current !== 'object') continue;
    if (!ALLOWED_TYPES.has(previous.type) || !ALLOWED_TYPES.has(current.type)) continue;
    if (!Number.isInteger(previous.subtitleIndex) || !Number.isInteger(current.subtitleIndex)) continue;
    if (!Number.isInteger(previous.markerStart) || !Number.isInteger(current.markerStart)) continue;
    if (!hasField(previous, 'text') || !hasField(current, 'text')) continue;

    if (compareObstacleOrder(previous, current) > 0) {
      errors.push(`Obstacles must be deterministically sorted by subtitleIndex, markerStart, type (vocabulary before comprehension), and text; ordering first fails between obstacles[${index - 1}] and obstacles[${index}].`);
      return;
    }
  }
}

function buildReport(draft, errors, warnings) {
  const obstacles = Array.isArray(draft?.obstacles) ? draft.obstacles : [];
  const vocabularyCount = obstacles.filter((obstacle) => obstacle?.type === 'vocabulary').length;
  const comprehensionCount = obstacles.filter((obstacle) => obstacle?.type === 'comprehension').length;

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    sourceDraftPath: SOURCE_DRAFT_PATH,
    generatedAt: new Date().toISOString(),
    pass: errors.length === 0,
    summary: {
      totalObstacles: obstacles.length,
      vocabularyCount,
      comprehensionCount,
      errorCount: errors.length,
      warningCount: warnings.length,
    },
    errors,
    warnings,
    reviewBoundary: {
      runtimeMayConsume: false,
      frozenOutputGenerated: false,
      note: 'Draft review only. This report does not promote draft obstacles to Runtime data or generate frozen obstacle output.',
    },
  };
}

function main() {
  const errors = [];
  const warnings = [];
  let draft = null;

  try {
    draft = readJson(DRAFT_PATH);
  } catch (error) {
    errors.push(`Unable to read or parse source draft ${SOURCE_DRAFT_PATH}: ${error.message}`);
  }

  const smokeRange = draft ? validateTopLevel(draft, errors) : null;
  const obstacles = Array.isArray(draft?.obstacles) ? draft.obstacles : [];

  obstacles.forEach((obstacle, index) => validateObstacle(obstacle, index, smokeRange, errors));
  validateContinuousObstacleIds(obstacles, errors);
  validateOrdering(obstacles, errors);

  const report = buildReport(draft, errors, warnings);
  writeJson(REPORT_PATH, report);

  if (report.pass) {
    console.log('P0-4A-2C-1 draft validation passed.');
    process.exit(0);
  }

  console.log('P0-4A-2C-1 draft validation failed.');
  process.exit(1);
}

main();
