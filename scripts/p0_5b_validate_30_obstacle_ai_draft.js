#!/usr/bin/env node
const fs = require('fs');

const defaultDraftPath = 'output_text/drafts/p0_5b_30_obstacle_ai_draft.json';
const analyzePath = 'output_text/drafts/p0_5b_30_obstacle_analyze_input.json';
const defaultReportPath = 'output_text/drafts/p0_5b_30_obstacle_ai_draft_validation_report.json';
const repairedDraftPath = 'output_text/drafts/p0_5b_30_obstacle_ai_draft_repaired.json';
const repairedReportPath = 'output_text/drafts/p0_5b_30_obstacle_ai_draft_repaired_validation_report.json';
const expectedDraftSchema = 'p0-5b-30-obstacle-ai-draft.v1';
const expectedReportSchema = 'p0-5b-30-obstacle-draft-validation-report.v1';
const targetObstacleCount = 30;
const allowedTypes = new Set(['vocabulary', 'comprehension']);
const allowedPos = new Set([
  'n.', 'v.', 'vi.', 'vt.', 'vt./vi.', 'adj.', 'adv.', 'prep.', 'pron.',
  'conj.', 'interj.', 'phr.', 'n./v.', 'adj./adv.', 'vt./n.', 'vi./n.',
  'vt./vi./n.'
]);
const placeholderValues = new Set(['tbd', 'todo', 'n/a', 'unknown', '待定', '无']);


function parseArgs(argv) {
  const options = {
    draftPath: defaultDraftPath,
    reportPath: defaultReportPath
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--draft') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--draft requires a path value');
      options.draftPath = value;
      index += 1;
    } else if (arg === '--report') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--report requires a path value');
      options.reportPath = value;
      index += 1;
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }

  return options;
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function chineseCharacterCount(value) {
  const matches = String(value).match(/[\u3400-\u9fff]/g);
  return matches ? matches.length : 0;
}

function isPlaceholder(value) {
  return typeof value === 'string' && placeholderValues.has(value.trim().toLowerCase());
}

function isPunctuationOnly(value) {
  return typeof value === 'string' && (value.trim().length === 0 || /^[\p{P}\p{S}\s]+$/u.test(value));
}

function spansOverlapHeavily(a, b) {
  const start = Math.max(a.markerStart, b.markerStart);
  const end = Math.min(a.markerEnd, b.markerEnd);
  const overlap = Math.max(0, end - start);
  const shortest = Math.min(a.markerEnd - a.markerStart, b.markerEnd - b.markerStart);
  return shortest > 0 && overlap / shortest >= 0.7;
}

function findRuntimeMayConsumeTrue(value, path = '$', found = []) {
  if (!value || typeof value !== 'object') return found;
  if (Object.prototype.hasOwnProperty.call(value, 'runtimeMayConsume') && value.runtimeMayConsume === true) {
    found.push(path + '.runtimeMayConsume');
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => findRuntimeMayConsumeTrue(item, `${path}[${index}]`, found));
  } else {
    Object.entries(value).forEach(([key, item]) => findRuntimeMayConsumeTrue(item, `${path}.${key}`, found));
  }
  return found;
}

function findForbiddenReviewValues(value, path = '$', found = []) {
  if (!value || typeof value !== 'object') return found;
  if (value.reviewStatus === 'frozen') found.push({ path: path + '.reviewStatus', value: 'frozen' });
  if (value.reviewDecision === 'approved' || value.reviewDecision === 'rejected') {
    found.push({ path: path + '.reviewDecision', value: value.reviewDecision });
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => findForbiddenReviewValues(item, `${path}[${index}]`, found));
  } else {
    Object.entries(value).forEach(([key, item]) => findForbiddenReviewValues(item, `${path}.${key}`, found));
  }
  return found;
}

function createCheck(name) {
  return { name, status: 'passed', details: [] };
}

function fail(check, detail, obstacleId) {
  check.status = 'failed';
  check.details.push(detail);
  invalidObstacles.push({ obstacleId: obstacleId || null, check: check.name, detail });
}

function warn(check, detail, obstacleId) {
  if (check.status !== 'failed') check.status = 'warning';
  check.details.push(detail);
  warnings.push({ obstacleId: obstacleId || null, check: check.name, detail });
}

const { draftPath, reportPath } = parseArgs(process.argv.slice(2));
const validationMode = draftPath === repairedDraftPath && reportPath === repairedReportPath ? 'repaired-draft' : 'default';

const checks = [];
const invalidObstacles = [];
const warnings = [];
let draft;
let analyze;

try {
  draft = readJson(draftPath);
  analyze = readJson(analyzePath);
} catch (error) {
  const check = createCheck('input files are readable JSON');
  fail(check, error.message);
  checks.push(check);
  draft = draft || {};
  analyze = analyze || {};
}

const subtitlesByIndex = new Map((Array.isArray(analyze.subtitles) ? analyze.subtitles : []).map((subtitle) => [subtitle.subtitleIndex, subtitle]));
const obstacles = Array.isArray(draft.obstacles) ? draft.obstacles : [];
const vocabularyCount = obstacles.filter((obstacle) => obstacle.type === 'vocabulary').length;
const comprehensionCount = obstacles.filter((obstacle) => obstacle.type === 'comprehension').length;
const subtitleCoverageCount = new Set(obstacles.map((obstacle) => obstacle.subtitleIndex)).size;

function addTopLevelChecks() {
  const schemaCheck = createCheck('top-level schemaVersion is expected draft schema');
  if (draft.schemaVersion !== expectedDraftSchema) fail(schemaCheck, `Expected ${expectedDraftSchema}, received ${draft.schemaVersion}`);
  checks.push(schemaCheck);

  const reviewStatusCheck = createCheck('top-level reviewStatus is draft');
  if (draft.reviewStatus !== 'draft') fail(reviewStatusCheck, `Expected draft, received ${draft.reviewStatus}`);
  checks.push(reviewStatusCheck);

  const runtimeCheck = createCheck('top-level runtimeMayConsume is false');
  if (draft.runtimeMayConsume !== false) fail(runtimeCheck, `Expected false, received ${draft.runtimeMayConsume}`);
  checks.push(runtimeCheck);

  const targetCheck = createCheck('top-level targetObstacleCount is 30');
  if (draft.targetObstacleCount !== targetObstacleCount) fail(targetCheck, `Expected 30, received ${draft.targetObstacleCount}`);
  checks.push(targetCheck);

  const arrayCheck = createCheck('obstacles is an array');
  if (!Array.isArray(draft.obstacles)) fail(arrayCheck, 'draft.obstacles is not an array');
  checks.push(arrayCheck);

  const countCheck = createCheck('obstacle count is within target and non-empty');
  if (obstacles.length > targetObstacleCount) fail(countCheck, `Expected <= 30 obstacles, received ${obstacles.length}`);
  if (obstacles.length <= 0) fail(countCheck, 'Expected at least one obstacle');
  checks.push(countCheck);

  const recursiveRuntimeCheck = createCheck('no runtimeMayConsume true anywhere recursively');
  findRuntimeMayConsumeTrue(draft).forEach((path) => fail(recursiveRuntimeCheck, `${path} is true`));
  checks.push(recursiveRuntimeCheck);

  const forbiddenReviewCheck = createCheck('no frozen reviewStatus or approved/rejected reviewDecision anywhere');
  findForbiddenReviewValues(draft).forEach((entry) => fail(forbiddenReviewCheck, `${entry.path} is ${entry.value}`));
  checks.push(forbiddenReviewCheck);
}

function addObstacleChecks() {
  const sequenceCheck = createCheck('obstacleId sequence is stable and gapless');
  const duplicateIdCheck = createCheck('duplicate obstacleId is forbidden');
  const duplicateLearningCheck = createCheck('duplicate learning item warning');
  const nestedComprehensionCheck = createCheck('same subtitle nested comprehension warning');
  const seenIds = new Set();
  const seenLearningItems = new Map();
  const comprehensionBySubtitle = new Map();

  obstacles.forEach((obstacle, index) => {
    const expectedId = `tbbt-s12e01-p0-5b-obstacle-${String(index + 1).padStart(6, '0')}`;
    const obstacleId = obstacle.obstacleId;
    if (obstacleId !== expectedId) fail(sequenceCheck, `At index ${index}, expected ${expectedId}, received ${obstacleId}`, obstacleId);
    if (seenIds.has(obstacleId)) fail(duplicateIdCheck, `Duplicate obstacleId ${obstacleId}`, obstacleId);
    seenIds.add(obstacleId);

    const typeCheck = createCheck(`obstacle ${obstacleId || index} allowed type`);
    if (!allowedTypes.has(obstacle.type)) fail(typeCheck, `Unsupported type ${obstacle.type}`, obstacleId);
    checks.push(typeCheck);

    const reviewCheck = createCheck(`obstacle ${obstacleId || index} draft review state`);
    if (obstacle.reviewStatus !== 'draft') fail(reviewCheck, `reviewStatus expected draft, received ${obstacle.reviewStatus}`, obstacleId);
    if (obstacle.reviewDecision !== 'pending') fail(reviewCheck, `reviewDecision expected pending, received ${obstacle.reviewDecision}`, obstacleId);
    checks.push(reviewCheck);

    const sourceCheck = createCheck(`obstacle ${obstacleId || index} source matches analyze input`);
    const subtitle = subtitlesByIndex.get(obstacle.subtitleIndex);
    if (!subtitle) {
      fail(sourceCheck, `subtitleIndex ${obstacle.subtitleIndex} does not exist in analyze input`, obstacleId);
    } else {
      ['source_en', 'startTime', 'endTime', 'source_zh'].forEach((field) => {
        if (obstacle[field] !== subtitle[field]) fail(sourceCheck, `${field} does not match analyze input`, obstacleId);
      });
    }
    checks.push(sourceCheck);

    const markerCheck = createCheck(`obstacle ${obstacleId || index} marker span is valid`);
    if (!Number.isInteger(obstacle.markerStart)) fail(markerCheck, 'markerStart is not an integer', obstacleId);
    if (!Number.isInteger(obstacle.markerEnd)) fail(markerCheck, 'markerEnd is not an integer', obstacleId);
    if (Number.isInteger(obstacle.markerStart) && Number.isInteger(obstacle.markerEnd) && typeof obstacle.source_en === 'string') {
      if (!(0 <= obstacle.markerStart && obstacle.markerStart < obstacle.markerEnd && obstacle.markerEnd <= obstacle.source_en.length)) {
        fail(markerCheck, `Invalid marker bounds ${obstacle.markerStart}-${obstacle.markerEnd} for source length ${obstacle.source_en.length}`, obstacleId);
      }
      const slice = obstacle.source_en.slice(obstacle.markerStart, obstacle.markerEnd);
      if (obstacle.text !== slice) fail(markerCheck, `text does not equal source_en slice; expected ${JSON.stringify(slice)}, received ${JSON.stringify(obstacle.text)}`, obstacleId);
      if (isPunctuationOnly(slice)) fail(markerCheck, 'marker span is punctuation-only', obstacleId);
    }
    checks.push(markerCheck);

    const confidenceCheck = createCheck(`obstacle ${obstacleId || index} confidence is valid`);
    if (typeof obstacle.confidence !== 'number' || !Number.isFinite(obstacle.confidence) || obstacle.confidence < 0 || obstacle.confidence > 1) {
      fail(confidenceCheck, `confidence must be a number between 0 and 1, received ${obstacle.confidence}`, obstacleId);
    } else if (obstacle.confidence < 0.6) {
      warn(confidenceCheck, `confidence ${obstacle.confidence} is below 0.6`, obstacleId);
    }
    checks.push(confidenceCheck);

    const decisionSourceCheck = createCheck(`obstacle ${obstacleId || index} decisionSource is non-empty`);
    if (!isNonEmptyString(obstacle.decisionSource)) fail(decisionSourceCheck, 'decisionSource is empty', obstacleId);
    checks.push(decisionSourceCheck);

    if (obstacle.type === 'vocabulary') validateVocabulary(obstacle, obstacleId, index);
    if (obstacle.type === 'comprehension') validateComprehension(obstacle, obstacleId, index);

    const learningKey = `${obstacle.type}:${String(obstacle.text || '').toLowerCase()}`;
    if (seenLearningItems.has(learningKey)) {
      warn(duplicateLearningCheck, `Duplicates ${seenLearningItems.get(learningKey)} with same type and lowercase text`, obstacleId);
    } else {
      seenLearningItems.set(learningKey, obstacleId || `index ${index}`);
    }

    if (obstacle.type === 'comprehension') {
      const list = comprehensionBySubtitle.get(obstacle.subtitleIndex) || [];
      list.forEach((other) => {
        if (spansOverlapHeavily(obstacle, other)) {
          warn(nestedComprehensionCheck, `Heavily overlaps ${other.obstacleId} in subtitle ${obstacle.subtitleIndex}`, obstacleId);
        }
      });
      list.push(obstacle);
      comprehensionBySubtitle.set(obstacle.subtitleIndex, list);
    }
  });

  checks.push(sequenceCheck, duplicateIdCheck, duplicateLearningCheck, nestedComprehensionCheck);
}

function validateVocabulary(obstacle, obstacleId, index) {
  const requiredCheck = createCheck(`vocabulary ${obstacleId || index} required fields are present`);
  ['word', 'lemma', 'phonetic', 'partOfSpeech', 'sentenceMeaning', 'translation'].forEach((field) => {
    if (!isNonEmptyString(obstacle[field])) fail(requiredCheck, `${field} is empty`, obstacleId);
  });
  checks.push(requiredCheck);

  const posCheck = createCheck(`vocabulary ${obstacleId || index} partOfSpeech uses frozen display format`);
  if (!allowedPos.has(obstacle.partOfSpeech)) fail(posCheck, `Unsupported partOfSpeech ${obstacle.partOfSpeech}`, obstacleId);
  checks.push(posCheck);

  const sentenceMeaningCheck = createCheck(`vocabulary ${obstacleId || index} sentenceMeaning is concise`);
  if (!isNonEmptyString(obstacle.sentenceMeaning)) {
    fail(sentenceMeaningCheck, 'sentenceMeaning is empty', obstacleId);
  } else if (chineseCharacterCount(obstacle.sentenceMeaning) > 30 || obstacle.sentenceMeaning.length > 80) {
    fail(sentenceMeaningCheck, `sentenceMeaning is too long (${chineseCharacterCount(obstacle.sentenceMeaning)} Chinese chars, ${obstacle.sentenceMeaning.length} total chars)`, obstacleId);
  }
  checks.push(sentenceMeaningCheck);
}

function validateComprehension(obstacle, obstacleId, index) {
  const titleCheck = createCheck(`comprehension ${obstacleId || index} has a title field`);
  if (!['prototype', 'phrase', 'text'].some((field) => isNonEmptyString(obstacle[field]))) {
    fail(titleCheck, 'Expected at least one non-empty title field: prototype, phrase, or text', obstacleId);
  }
  checks.push(titleCheck);

  const requiredCheck = createCheck(`comprehension ${obstacleId || index} explanation fields are present`);
  ['literal', 'actual', 'grammar'].forEach((field) => {
    if (!isNonEmptyString(obstacle[field])) fail(requiredCheck, `${field} is empty`, obstacleId);
  });
  checks.push(requiredCheck);

  const placeholderCheck = createCheck(`comprehension ${obstacleId || index} explanation fields are not placeholders`);
  ['literal', 'actual', 'grammar'].forEach((field) => {
    if (isPlaceholder(obstacle[field])) fail(placeholderCheck, `${field} contains placeholder ${JSON.stringify(obstacle[field])}`, obstacleId);
  });
  checks.push(placeholderCheck);
}

addTopLevelChecks();
addObstacleChecks();

const hardFailureCount = invalidObstacles.length;
const report = {
  schemaVersion: expectedReportSchema,
  stage: 'P0-5B-5',
  inputDraftPath: draftPath,
  inputAnalyzePath: analyzePath,
  status: hardFailureCount > 0 ? 'failed' : 'passed',
  summary: {
    targetObstacleCount,
    actualObstacleCount: obstacles.length,
    vocabularyCount,
    comprehensionCount,
    subtitleCoverageCount,
    invalidCount: hardFailureCount,
    warningCount: warnings.length
  },
  checks,
  invalidObstacles,
  warnings,
  nextStageAllowed: hardFailureCount === 0
};

if (validationMode === 'repaired-draft') {
  report.validationMode = validationMode;
}

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');

console.log('P0-5B-5 draft validation gate');
console.log(`input draft: ${draftPath}`);
console.log(`report: ${reportPath}`);
console.log(`status: ${report.status}`);
console.log(`actual obstacle count: ${report.summary.actualObstacleCount}`);
console.log(`vocabulary count: ${report.summary.vocabularyCount}`);
console.log(`comprehension count: ${report.summary.comprehensionCount}`);
console.log(`invalid count: ${report.summary.invalidCount}`);
console.log(`warning count: ${report.summary.warningCount}`);
console.log(`next stage allowed: ${report.nextStageAllowed}`);

process.exit(report.nextStageAllowed ? 0 : 1);
