#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const SOURCE_DRAFT_PATH = 'output_text/drafts/p0_4a_obstacles_pilot_draft_smoke.json';
const SOURCE_REVIEW_DECISIONS_PATH = 'output_text/drafts/p0_4a_obstacles_pilot_review_decisions.json';
const SOURCE_REVIEW_REPORT_PATH = 'output_text/drafts/p0_4a_obstacles_pilot_draft_review_report.json';
const OUTPUT_PATH = 'output_text/drafts/p0_4a_obstacles_pilot_review_results.json';

const DRAFT_PATH_ABSOLUTE = path.join(REPO_ROOT, SOURCE_DRAFT_PATH);
const REVIEW_DECISIONS_PATH_ABSOLUTE = path.join(REPO_ROOT, SOURCE_REVIEW_DECISIONS_PATH);
const REVIEW_REPORT_PATH_ABSOLUTE = path.join(REPO_ROOT, SOURCE_REVIEW_REPORT_PATH);
const OUTPUT_PATH_ABSOLUTE = path.join(REPO_ROOT, OUTPUT_PATH);

const EXPECTED_DRAFT_SCHEMA_VERSION = 'p0-4a-obstacles-draft-smoke-v1';
const EXPECTED_REVIEW_DECISIONS_SCHEMA_VERSION = 'p0-4a-review-decisions-v1';
const OUTPUT_SCHEMA_VERSION = 'p0-4a-review-results-v1';
const ALLOWED_HUMAN_DECISIONS = new Set(['pending', 'approved', 'rejected']);

const REQUIRED_DECISION_FIELDS = [
  'obstacleId',
  'humanDecision',
  'reviewer',
  'reviewedAt',
  'reviewNotes',
];

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read or parse ${label}: ${error.message}`);
  }
}

function hasOwn(object, field) {
  return Object.prototype.hasOwnProperty.call(object, field);
}

function validateReviewReportIfPresent() {
  if (!fs.existsSync(REVIEW_REPORT_PATH_ABSOLUTE)) return;

  const reviewReport = readJson(REVIEW_REPORT_PATH_ABSOLUTE, SOURCE_REVIEW_REPORT_PATH);
  if (!reviewReport || typeof reviewReport !== 'object' || Array.isArray(reviewReport)) {
    throw new Error('Review report root must be a JSON object.');
  }

  if (reviewReport.pass !== true) {
    throw new Error(`Review report pass must be true before applying review decisions; found ${JSON.stringify(reviewReport.pass)}.`);
  }
}

function validateDraft(draft) {
  const errors = [];

  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    return ['Draft root must be a JSON object.'];
  }

  if (draft.schemaVersion !== EXPECTED_DRAFT_SCHEMA_VERSION) {
    errors.push(`Draft schemaVersion must be ${JSON.stringify(EXPECTED_DRAFT_SCHEMA_VERSION)}; found ${JSON.stringify(draft.schemaVersion)}.`);
  }

  if (draft.smokeTest !== true) {
    errors.push(`Draft smokeTest must be true; found ${JSON.stringify(draft.smokeTest)}.`);
  }

  if (draft.runtimeMayConsume !== false) {
    errors.push(`Draft runtimeMayConsume must be false; found ${JSON.stringify(draft.runtimeMayConsume)}.`);
  }

  if (draft.reviewStatus !== 'draft') {
    errors.push(`Draft reviewStatus must be "draft"; found ${JSON.stringify(draft.reviewStatus)}.`);
  }

  if (!Array.isArray(draft.obstacles)) {
    errors.push('Draft obstacles must be an array.');
  }

  return errors;
}

function validateReviewDecisions(reviewDecisions) {
  const errors = [];

  if (!reviewDecisions || typeof reviewDecisions !== 'object' || Array.isArray(reviewDecisions)) {
    return ['Review decisions root must be a JSON object.'];
  }

  if (reviewDecisions.schemaVersion !== EXPECTED_REVIEW_DECISIONS_SCHEMA_VERSION) {
    errors.push(`Review decisions schemaVersion must be ${JSON.stringify(EXPECTED_REVIEW_DECISIONS_SCHEMA_VERSION)}; found ${JSON.stringify(reviewDecisions.schemaVersion)}.`);
  }

  if (reviewDecisions.reviewStatus !== 'pending_human_review') {
    errors.push(`Review decisions reviewStatus must be "pending_human_review"; found ${JSON.stringify(reviewDecisions.reviewStatus)}.`);
  }

  if (reviewDecisions.runtimeMayConsume !== false) {
    errors.push(`Review decisions runtimeMayConsume must be false; found ${JSON.stringify(reviewDecisions.runtimeMayConsume)}.`);
  }

  if (reviewDecisions.frozenOutputGenerated !== false) {
    errors.push(`Review decisions frozenOutputGenerated must be false; found ${JSON.stringify(reviewDecisions.frozenOutputGenerated)}.`);
  }

  if (!Array.isArray(reviewDecisions.decisions)) {
    errors.push('Review decisions decisions must be an array.');
    return errors;
  }

  reviewDecisions.decisions.forEach((decision, index) => {
    const label = `decisions[${index}]`;

    if (!decision || typeof decision !== 'object' || Array.isArray(decision)) {
      errors.push(`${label} must be a JSON object.`);
      return;
    }

    for (const field of REQUIRED_DECISION_FIELDS) {
      if (!hasOwn(decision, field)) {
        errors.push(`${label} is missing required field ${JSON.stringify(field)}.`);
      }
    }

    if (hasOwn(decision, 'humanDecision') && !ALLOWED_HUMAN_DECISIONS.has(decision.humanDecision)) {
      errors.push(`${label}.humanDecision must be one of pending, approved, rejected; found ${JSON.stringify(decision.humanDecision)}.`);
    }
  });

  return errors;
}

function validateDecisionMatches(draft, reviewDecisions) {
  const errors = [];
  const draftObstacleIds = new Set();
  const decisionsByObstacleId = new Map();

  draft.obstacles.forEach((obstacle, index) => {
    if (!obstacle || typeof obstacle !== 'object' || Array.isArray(obstacle)) {
      errors.push(`obstacles[${index}] must be a JSON object.`);
      return;
    }

    if (!hasOwn(obstacle, 'obstacleId')) {
      errors.push(`obstacles[${index}] is missing required field "obstacleId".`);
      return;
    }

    if (draftObstacleIds.has(obstacle.obstacleId)) {
      errors.push(`Draft contains duplicate obstacleId ${JSON.stringify(obstacle.obstacleId)}.`);
    }

    draftObstacleIds.add(obstacle.obstacleId);
  });

  reviewDecisions.decisions.forEach((decision, index) => {
    if (!decision || typeof decision !== 'object' || Array.isArray(decision) || !hasOwn(decision, 'obstacleId')) return;

    if (decisionsByObstacleId.has(decision.obstacleId)) {
      errors.push(`Duplicate decision obstacleId ${JSON.stringify(decision.obstacleId)} at decisions[${index}].`);
      return;
    }

    decisionsByObstacleId.set(decision.obstacleId, decision);

    if (!draftObstacleIds.has(decision.obstacleId)) {
      errors.push(`Unknown decision obstacleId ${JSON.stringify(decision.obstacleId)} at decisions[${index}].`);
    }
  });

  draft.obstacles.forEach((obstacle, index) => {
    if (!obstacle || typeof obstacle !== 'object' || Array.isArray(obstacle) || !hasOwn(obstacle, 'obstacleId')) return;

    if (!decisionsByObstacleId.has(obstacle.obstacleId)) {
      errors.push(`Missing decision for draft obstacles[${index}] obstacleId ${JSON.stringify(obstacle.obstacleId)}.`);
    }
  });

  return errors;
}

function buildReviewResults(draft, reviewDecisions) {
  const decisionsByObstacleId = new Map(
    reviewDecisions.decisions.map((decision) => [decision.obstacleId, decision]),
  );

  const results = draft.obstacles.map((obstacle) => {
    const decision = decisionsByObstacleId.get(obstacle.obstacleId);

    return {
      obstacleId: obstacle.obstacleId,
      type: obstacle.type,
      subtitleIndex: obstacle.subtitleIndex,
      text: obstacle.text,
      source_en: obstacle.source_en,
      source_zh: obstacle.source_zh,
      aiDecisionSource: obstacle.decisionSource,
      aiConfidence: obstacle.confidence,
      humanDecision: decision.humanDecision,
      reviewer: decision.reviewer,
      reviewedAt: decision.reviewedAt,
      reviewNotes: decision.reviewNotes,
    };
  });

  const approvedCount = results.filter((result) => result.humanDecision === 'approved').length;
  const rejectedCount = results.filter((result) => result.humanDecision === 'rejected').length;
  const pendingCount = results.filter((result) => result.humanDecision === 'pending').length;

  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    sourceDraftPath: SOURCE_DRAFT_PATH,
    sourceReviewDecisionsPath: SOURCE_REVIEW_DECISIONS_PATH,
    sourceReviewReportPath: SOURCE_REVIEW_REPORT_PATH,
    generatedAt: new Date().toISOString(),
    reviewStatus: pendingCount > 0 ? 'pending_human_review' : 'human_review_completed',
    runtimeMayConsume: false,
    frozenOutputGenerated: false,
    episodeId: draft.episodeId,
    learnerLevel: draft.learnerLevel,
    analyzerVersion: draft.analyzerVersion,
    smokeScope: draft.smokeScope,
    summary: {
      totalObstacles: results.length,
      approvedCount,
      rejectedCount,
      pendingCount,
    },
    results,
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function main() {
  try {
    const draft = readJson(DRAFT_PATH_ABSOLUTE, SOURCE_DRAFT_PATH);
    const reviewDecisions = readJson(REVIEW_DECISIONS_PATH_ABSOLUTE, SOURCE_REVIEW_DECISIONS_PATH);

    validateReviewReportIfPresent();

    const validationErrors = [
      ...validateDraft(draft),
      ...validateReviewDecisions(reviewDecisions),
    ];

    if (validationErrors.length === 0) {
      validationErrors.push(...validateDecisionMatches(draft, reviewDecisions));
    }

    if (validationErrors.length > 0) {
      throw new Error(`Review decision apply validation failed:\n- ${validationErrors.join('\n- ')}`);
    }

    const reviewResults = buildReviewResults(draft, reviewDecisions);
    writeJson(OUTPUT_PATH_ABSOLUTE, reviewResults);

    console.log('P0-4A-2C-3 review decisions applied.');
    process.exit(0);
  } catch (error) {
    console.log(`P0-4A-2C-3 review decision apply failed: ${error.message}`);
    process.exit(1);
  }
}

main();
