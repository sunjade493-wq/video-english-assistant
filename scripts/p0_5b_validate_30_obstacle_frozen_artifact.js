const fs = require('fs');
const path = require('path');

const FROZEN_PATH = 'output_text/frozen/p0_5b_30_obstacle_frozen.json';
const PROMOTION_REPORT_PATH = 'output_text/frozen/p0_5b_30_obstacle_frozen_promotion_report.json';
const REPORT_PATH = 'output_text/frozen/p0_5b_30_obstacle_frozen_validation_report.json';

const EXPECTED_FROZEN_SCHEMA = 'p0-5b-30-obstacle-frozen.v1';
const EXPECTED_PROMOTION_SCHEMA = 'p0-5b-30-obstacle-frozen-promotion-report.v1';
const EXPECTED_REPORT_SCHEMA = 'p0-5b-30-obstacle-frozen-validation-report.v1';
const EXPECTED_SUMMARY = {
  sourceObstacleCount: 30,
  frozenObstacleCount: 17,
  approvedPromotedCount: 17,
  rejectedExcludedCount: 12,
  needsEditExcludedCount: 1,
  pendingExcludedCount: 0,
};
const ALLOWED_TYPES = new Set(['vocabulary', 'comprehension']);
const ALLOWED_PARTS_OF_SPEECH = new Set([
  'n.', 'v.', 'vi.', 'vt.', 'vt./vi.', 'adj.', 'adv.', 'prep.', 'pron.', 'conj.', 'interj.', 'phr.',
  'n./v.', 'adj./adv.', 'vt./n.', 'vi./n.', 'vt./vi./n.',
]);
const PLACEHOLDERS = new Set(['tbd', 'todo', 'n/a', 'unknown', '待定', '无']);

function readJson(filePath, checks) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    checks.push(failCheck(`parse ${filePath}`, `Invalid JSON: ${error.message}`));
    return null;
  }
}

function passCheck(name) {
  return { name, status: 'passed' };
}

function failCheck(name, message, obstacleId) {
  return { name, status: 'failed', message, ...(obstacleId ? { obstacleId } : {}) };
}

function addCheck(checks, invalids, condition, name, message, obstacleId) {
  if (condition) {
    checks.push(passCheck(name));
  } else {
    const check = failCheck(name, message, obstacleId);
    checks.push(check);
    invalids.push({ check: name, message, ...(obstacleId ? { obstacleId } : {}) });
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isInteger(value) {
  return Number.isInteger(value);
}

function deepContainsRuntimeMayConsumeTrue(value) {
  if (!value || typeof value !== 'object') return false;
  if (value.runtimeMayConsume === true) return true;
  if (Array.isArray(value)) return value.some(deepContainsRuntimeMayConsumeTrue);
  return Object.values(value).some(deepContainsRuntimeMayConsumeTrue);
}

function deepContainsForbiddenStatus(value) {
  const hits = [];
  function visit(node, location) {
    if (!node || typeof node !== 'object') return;
    if (['draft', 'reviewed'].includes(node.reviewStatus)) hits.push(`${location}.reviewStatus=${node.reviewStatus}`);
    if (['pending', 'rejected', 'needs_edit'].includes(node.reviewDecision)) hits.push(`${location}.reviewDecision=${node.reviewDecision}`);
    Object.entries(node).forEach(([key, child]) => visit(child, `${location}.${key}`));
  }
  visit(value, '$');
  return hits;
}

function deepContainsRuntimeDraftPathField(value) {
  const hits = [];
  function visit(node, location, keyName) {
    if (!node || typeof node !== 'object') return;
    if (typeof node === 'string') return;
    Object.entries(node).forEach(([key, child]) => {
      const childLocation = `${location}.${key}`;
      if (
        typeof child === 'string' &&
        child.includes('output_text/drafts') &&
        /runtime|consume|path/i.test(key) &&
        !/^source/i.test(key) &&
        !/trace/i.test(key)
      ) {
        hits.push(`${childLocation}=${child}`);
      }
      visit(child, childLocation, key);
    });
  }
  visit(value, '$', '');
  return hits;
}

function countChineseCharacters(value) {
  const matches = String(value).match(/[\u3400-\u9fff]/g);
  return matches ? matches.length : 0;
}

function isEnglishOnly(value) {
  return /[A-Za-z]/.test(value) && countChineseCharacters(value) === 0;
}

function sameArray(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, index) => item === b[index]);
}

function validate() {
  const checks = [];
  const invalidObstacles = [];
  const warnings = [];

  addCheck(checks, invalidObstacles, fs.existsSync(FROZEN_PATH), 'frozen artifact exists', `${FROZEN_PATH} does not exist`);
  addCheck(checks, invalidObstacles, fs.existsSync(PROMOTION_REPORT_PATH), 'promotion report exists', `${PROMOTION_REPORT_PATH} does not exist`);

  const frozen = readJson(FROZEN_PATH, checks);
  const promotion = readJson(PROMOTION_REPORT_PATH, checks);
  const obstacles = Array.isArray(frozen && frozen.obstacles) ? frozen.obstacles : [];

  if (frozen) {
    addCheck(checks, invalidObstacles, frozen.schemaVersion === EXPECTED_FROZEN_SCHEMA, 'frozen schemaVersion', `Expected ${EXPECTED_FROZEN_SCHEMA}`);
    addCheck(checks, invalidObstacles, frozen.reviewStatus === 'frozen', 'frozen reviewStatus', 'Expected reviewStatus frozen');
    addCheck(checks, invalidObstacles, frozen.runtimeMayConsume === false, 'frozen runtimeMayConsume false', 'Expected runtimeMayConsume false');
    addCheck(checks, invalidObstacles, frozen.promotionPolicy === 'approved-only', 'frozen promotionPolicy', 'Expected approved-only');
    Object.entries(EXPECTED_SUMMARY).forEach(([key, value]) => addCheck(checks, invalidObstacles, frozen.summary && frozen.summary[key] === value, `frozen summary ${key}`, `Expected ${key} ${value}`));
    addCheck(checks, invalidObstacles, Array.isArray(frozen.obstacles) && frozen.obstacles.length === 17, 'frozen obstacle array count', 'Expected exactly 17 obstacles');
    addCheck(checks, invalidObstacles, !deepContainsRuntimeMayConsumeTrue(frozen), 'no runtimeMayConsume true anywhere', 'Found runtimeMayConsume true');
    const forbiddenStatuses = deepContainsForbiddenStatus(frozen);
    addCheck(checks, invalidObstacles, forbiddenStatuses.length === 0, 'no draft/reviewed/pending/rejected/needs_edit statuses', forbiddenStatuses.join('; '));
    const runtimeDraftPathFields = deepContainsRuntimeDraftPathField(frozen);
    addCheck(checks, invalidObstacles, runtimeDraftPathFields.length === 0, 'no draft runtime-consumable path', runtimeDraftPathFields.join('; '));
  }

  if (promotion) {
    addCheck(checks, invalidObstacles, promotion.schemaVersion === EXPECTED_PROMOTION_SCHEMA, 'promotion report schemaVersion', `Expected ${EXPECTED_PROMOTION_SCHEMA}`);
    addCheck(checks, invalidObstacles, promotion.runtimePromotionAllowed === false, 'promotion report runtimePromotionAllowed false', 'Expected false before runtime promotion');
    Object.entries(EXPECTED_SUMMARY).forEach(([key, value]) => addCheck(checks, invalidObstacles, promotion.summary && promotion.summary[key] === value, `promotion summary ${key}`, `Expected ${key} ${value}`));
  }

  const ids = obstacles.map((obstacle) => obstacle && obstacle.obstacleId);
  if (promotion) {
    addCheck(checks, invalidObstacles, sameArray(promotion.promotedObstacleIds, ids), 'promotedObstacleIds equal frozen IDs in order', 'Promotion IDs do not exactly match frozen obstacle IDs in order');
    ['rejected', 'needsEdit', 'pending'].forEach((bucket) => {
      const excluded = (((promotion.excluded || {})[bucket]) || []);
      const found = excluded.filter((id) => ids.includes(id));
      addCheck(checks, invalidObstacles, found.length === 0, `excluded ${bucket} IDs absent`, `Found excluded IDs in frozen artifact: ${found.join(', ')}`);
    });
  }

  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  addCheck(checks, invalidObstacles, duplicateIds.length === 0, 'unique obstacleId', `Duplicate obstacle IDs: ${duplicateIds.join(', ')}`);

  let vocabularyCount = 0;
  let comprehensionCount = 0;
  obstacles.forEach((obstacle, index) => {
    const id = obstacle.obstacleId || `index-${index}`;
    if (obstacle.type === 'vocabulary') vocabularyCount += 1;
    if (obstacle.type === 'comprehension') comprehensionCount += 1;

    addCheck(checks, invalidObstacles, obstacle.reviewStatus === 'frozen', 'obstacle reviewStatus frozen', 'Expected frozen', id);
    addCheck(checks, invalidObstacles, obstacle.reviewDecision === 'approved', 'obstacle reviewDecision approved', 'Expected approved', id);
    addCheck(checks, invalidObstacles, ALLOWED_TYPES.has(obstacle.type), 'allowed obstacle type', `Invalid type ${obstacle.type}`, id);
    addCheck(checks, invalidObstacles, typeof obstacle.subtitleIndex === 'number' && Number.isFinite(obstacle.subtitleIndex), 'subtitleIndex number', 'subtitleIndex must be a number', id);
    ['source_en', 'source_zh', 'text'].forEach((field) => addCheck(checks, invalidObstacles, isNonEmptyString(obstacle[field]), `${field} non-empty`, `${field} must be a non-empty string`, id));
    addCheck(checks, invalidObstacles, isInteger(obstacle.markerStart) && isInteger(obstacle.markerEnd), 'marker integers', 'markerStart and markerEnd must be integers', id);
    const markerBoundsValid = isInteger(obstacle.markerStart) && isInteger(obstacle.markerEnd) && isNonEmptyString(obstacle.source_en) && obstacle.markerStart >= 0 && obstacle.markerStart < obstacle.markerEnd && obstacle.markerEnd <= obstacle.source_en.length;
    addCheck(checks, invalidObstacles, markerBoundsValid, 'marker bounds', 'Expected 0 <= markerStart < markerEnd <= source_en.length', id);
    addCheck(checks, invalidObstacles, markerBoundsValid && obstacle.text === obstacle.source_en.slice(obstacle.markerStart, obstacle.markerEnd), 'text matches marker slice', 'text must equal source_en.slice(markerStart, markerEnd)', id);
    addCheck(checks, invalidObstacles, typeof obstacle.confidence === 'number' && obstacle.confidence >= 0 && obstacle.confidence <= 1, 'confidence range', 'confidence must be between 0 and 1', id);
    addCheck(checks, invalidObstacles, isNonEmptyString(obstacle.decisionSource), 'decisionSource non-empty', 'decisionSource must be non-empty', id);

    if (!Object.prototype.hasOwnProperty.call(obstacle, 'contextBefore') || !Object.prototype.hasOwnProperty.call(obstacle, 'contextAfter')) warnings.push({ obstacleId: id, type: 'missing-context', message: 'Missing contextBefore/contextAfter field' });
    if (typeof obstacle.confidence === 'number' && obstacle.confidence < 0.6) warnings.push({ obstacleId: id, type: 'low-confidence', message: 'confidence is below 0.6' });

    if (obstacle.type === 'vocabulary') {
      ['word', 'lemma', 'phonetic', 'partOfSpeech', 'sentenceMeaning', 'translation'].forEach((field) => addCheck(checks, invalidObstacles, isNonEmptyString(obstacle[field]), `vocabulary ${field} non-empty`, `${field} must be non-empty`, id));
      addCheck(checks, invalidObstacles, ALLOWED_PARTS_OF_SPEECH.has(obstacle.partOfSpeech), 'vocabulary partOfSpeech supported', `Unsupported partOfSpeech ${obstacle.partOfSpeech}`, id);
      const meaning = obstacle.sentenceMeaning || '';
      addCheck(checks, invalidObstacles, isNonEmptyString(meaning) && countChineseCharacters(meaning) <= 30 && String(meaning).length <= 80, 'vocabulary sentenceMeaning limits', 'sentenceMeaning must be non-empty, <=30 Chinese chars, and <=80 total chars', id);
      if (isNonEmptyString(meaning) && isEnglishOnly(meaning)) warnings.push({ obstacleId: id, type: 'english-only-sentenceMeaning', message: 'Vocabulary sentenceMeaning is English-only' });
      if (countChineseCharacters(meaning) > 12) warnings.push({ obstacleId: id, type: 'long-chinese-sentenceMeaning', message: 'Vocabulary sentenceMeaning is longer than 12 Chinese characters' });
    }

    if (obstacle.type === 'comprehension') {
      addCheck(checks, invalidObstacles, ['prototype', 'phrase', 'text'].some((field) => isNonEmptyString(obstacle[field])), 'comprehension title field present', 'Expected prototype, phrase, or text to be non-empty', id);
      ['literal', 'actual', 'grammar'].forEach((field) => addCheck(checks, invalidObstacles, isNonEmptyString(obstacle[field]), `comprehension ${field} non-empty`, `${field} must be non-empty`, id));
      ['literal', 'actual', 'grammar'].forEach((field) => {
        const normalized = String(obstacle[field] || '').trim().toLowerCase();
        addCheck(checks, invalidObstacles, !PLACEHOLDERS.has(normalized), `comprehension ${field} not placeholder`, `${field} must not be placeholder text`, id);
      });
    }
  });

  const status = invalidObstacles.length === 0 ? 'passed' : 'failed';
  const report = {
    schemaVersion: EXPECTED_REPORT_SCHEMA,
    stage: 'P0-5B-8A',
    inputFrozenPath: FROZEN_PATH,
    inputPromotionReportPath: PROMOTION_REPORT_PATH,
    status,
    summary: {
      frozenObstacleCount: obstacles.length,
      vocabularyCount,
      comprehensionCount,
      invalidCount: invalidObstacles.length,
      warningCount: warnings.length,
    },
    checks,
    invalidObstacles,
    warnings,
    runtimePromotionAllowed: status === 'passed',
    nextStageAllowed: status === 'passed',
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log('P0-5B-8A frozen artifact validation');
  console.log(`status: ${report.status}`);
  console.log(`frozen obstacles: ${report.summary.frozenObstacleCount}`);
  console.log(`vocabulary count: ${report.summary.vocabularyCount}`);
  console.log(`comprehension count: ${report.summary.comprehensionCount}`);
  console.log(`invalid count: ${report.summary.invalidCount}`);
  console.log(`warning count: ${report.summary.warningCount}`);
  console.log(`runtime promotion allowed: ${report.runtimePromotionAllowed}`);
  console.log(`next stage allowed: ${report.nextStageAllowed}`);
  console.log(`report: ${REPORT_PATH}`);

  if (status === 'failed') process.exit(1);
}

validate();
