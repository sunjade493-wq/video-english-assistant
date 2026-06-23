#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const SOURCE_DRAFT_PATH = 'output_text/drafts/p0_4a_obstacles_pilot_draft_smoke.json';
const SOURCE_REVIEW_RESULTS_PATH = 'output_text/drafts/p0_4a_obstacles_pilot_review_results.json';
const SOURCE_REVIEW_REPORT_PATH = 'output_text/drafts/p0_4a_obstacles_pilot_draft_review_report.json';
const OUTPUT_PATH = 'output_text/frozen/p0_4a_obstacles_pilot_frozen.json';

const DRAFT_PATH_ABSOLUTE = path.join(REPO_ROOT, SOURCE_DRAFT_PATH);
const REVIEW_RESULTS_PATH_ABSOLUTE = path.join(REPO_ROOT, SOURCE_REVIEW_RESULTS_PATH);
const REVIEW_REPORT_PATH_ABSOLUTE = path.join(REPO_ROOT, SOURCE_REVIEW_REPORT_PATH);
const OUTPUT_PATH_ABSOLUTE = path.join(REPO_ROOT, OUTPUT_PATH);

const EXPECTED_DRAFT_SCHEMA_VERSION = 'p0-4a-obstacles-draft-smoke-v1';
const EXPECTED_REVIEW_RESULTS_SCHEMA_VERSION = 'p0-4a-review-results-v1';
const OUTPUT_SCHEMA_VERSION = 'p0-4a-frozen-obstacles-pilot-v1';
const FROZEN_SOURCE = 'p0-4a-3a-reviewed-draft-promotion';
const ALLOWED_HUMAN_DECISIONS = new Set(['approved', 'rejected', 'pending']);

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read or parse ${label}: ${error.message}`);
  }
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  fs.renameSync(temporaryPath, filePath);
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
    throw new Error(`Review report pass must be true before frozen pilot promotion; found ${JSON.stringify(reviewReport.pass)}.`);
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

function validateReviewResults(reviewResults) {
  const errors = [];

  if (!reviewResults || typeof reviewResults !== 'object' || Array.isArray(reviewResults)) {
    return ['Review results root must be a JSON object.'];
  }

  if (reviewResults.schemaVersion !== EXPECTED_REVIEW_RESULTS_SCHEMA_VERSION) {
    errors.push(`Review results schemaVersion must be ${JSON.stringify(EXPECTED_REVIEW_RESULTS_SCHEMA_VERSION)}; found ${JSON.stringify(reviewResults.schemaVersion)}.`);
  }

  if (reviewResults.runtimeMayConsume !== false) {
    errors.push(`Review results runtimeMayConsume must be false; found ${JSON.stringify(reviewResults.runtimeMayConsume)}.`);
  }

  if (reviewResults.frozenOutputGenerated !== false) {
    errors.push(`Review results frozenOutputGenerated must be false; found ${JSON.stringify(reviewResults.frozenOutputGenerated)}.`);
  }

  if (reviewResults.reviewStatus === 'pending_human_review') {
    errors.push('Review results reviewStatus is "pending_human_review"; frozen pilot promotion requires completed human review.');
  } else if (reviewResults.reviewStatus !== 'human_review_completed') {
    errors.push(`Review results reviewStatus must be "human_review_completed"; found ${JSON.stringify(reviewResults.reviewStatus)}.`);
  }

  if (!Array.isArray(reviewResults.results)) {
    errors.push('Review results results must be an array.');
  }

  return errors;
}

function validateResultShape(result, index, errors) {
  const label = `results[${index}]`;

  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    errors.push(`${label} must be a JSON object.`);
    return;
  }

  for (const field of ['obstacleId', 'humanDecision', 'reviewer', 'reviewedAt', 'reviewNotes']) {
    if (!hasOwn(result, field)) {
      errors.push(`${label} is missing required field ${JSON.stringify(field)}.`);
    }
  }

  if (hasOwn(result, 'humanDecision') && !ALLOWED_HUMAN_DECISIONS.has(result.humanDecision)) {
    errors.push(`${label}.humanDecision must be one of approved, rejected, pending; found ${JSON.stringify(result.humanDecision)}.`);
  }

  if (result.humanDecision === 'pending') {
    errors.push(`${label} obstacleId ${JSON.stringify(result.obstacleId)} has pending humanDecision; frozen pilot promotion requires approved or rejected decisions only.`);
  }
}

function validateMatchesAndBuildResultMap(draft, reviewResults) {
  const errors = [];
  const draftObstacleIds = new Set();
  const resultsByObstacleId = new Map();

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

  reviewResults.results.forEach((result, index) => {
    validateResultShape(result, index, errors);
    if (!result || typeof result !== 'object' || Array.isArray(result) || !hasOwn(result, 'obstacleId')) return;

    if (resultsByObstacleId.has(result.obstacleId)) {
      errors.push(`Duplicate review result obstacleId ${JSON.stringify(result.obstacleId)} at results[${index}].`);
      return;
    }

    resultsByObstacleId.set(result.obstacleId, result);

    if (!draftObstacleIds.has(result.obstacleId)) {
      errors.push(`Unknown review result obstacleId ${JSON.stringify(result.obstacleId)} at results[${index}].`);
    }
  });

  draft.obstacles.forEach((obstacle, index) => {
    if (!obstacle || typeof obstacle !== 'object' || Array.isArray(obstacle) || !hasOwn(obstacle, 'obstacleId')) return;

    if (!resultsByObstacleId.has(obstacle.obstacleId)) {
      errors.push(`Missing review result for draft obstacles[${index}] obstacleId ${JSON.stringify(obstacle.obstacleId)}.`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Frozen pilot promotion validation failed:\n- ${errors.join('\n- ')}`);
  }

  return resultsByObstacleId;
}

function buildFrozenOutput(draft, resultsByObstacleId) {
  const frozenAt = new Date().toISOString();
  let approvedCount = 0;
  let rejectedCount = 0;

  const obstacles = [];
  for (const obstacle of draft.obstacles) {
    const reviewResult = resultsByObstacleId.get(obstacle.obstacleId);

    if (reviewResult.humanDecision === 'approved') {
      approvedCount += 1;
      obstacles.push({
        ...obstacle,
        reviewStatus: 'approved',
        humanDecision: 'approved',
        reviewer: reviewResult.reviewer,
        reviewedAt: reviewResult.reviewedAt,
        reviewNotes: reviewResult.reviewNotes,
        frozenAt,
        frozenSource: FROZEN_SOURCE,
      });
    } else if (reviewResult.humanDecision === 'rejected') {
      rejectedCount += 1;
    }
  }

  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    sourceDraftPath: SOURCE_DRAFT_PATH,
    sourceReviewResultsPath: SOURCE_REVIEW_RESULTS_PATH,
    sourceReviewReportPath: SOURCE_REVIEW_REPORT_PATH,
    generatedAt: frozenAt,
    frozenStatus: 'frozen_pilot',
    runtimeMayConsume: false,
    runtimePromotionRequired: true,
    episodeId: draft.episodeId,
    learnerLevel: draft.learnerLevel,
    analyzerVersion: draft.analyzerVersion,
    smokeScope: draft.smokeScope,
    summary: {
      totalDraftObstacles: draft.obstacles.length,
      approvedCount,
      rejectedCount,
      promotedCount: obstacles.length,
    },
    obstacles,
  };
}

function main() {
  try {
    const draft = readJson(DRAFT_PATH_ABSOLUTE, SOURCE_DRAFT_PATH);
    const reviewResults = readJson(REVIEW_RESULTS_PATH_ABSOLUTE, SOURCE_REVIEW_RESULTS_PATH);

    validateReviewReportIfPresent();

    const validationErrors = [
      ...validateDraft(draft),
      ...validateReviewResults(reviewResults),
    ];

    if (validationErrors.length > 0) {
      throw new Error(`Frozen pilot promotion validation failed:\n- ${validationErrors.join('\n- ')}`);
    }

    const resultsByObstacleId = validateMatchesAndBuildResultMap(draft, reviewResults);
    const frozenOutput = buildFrozenOutput(draft, resultsByObstacleId);
    writeJsonAtomic(OUTPUT_PATH_ABSOLUTE, frozenOutput);

    console.log('P0-4A-3A frozen pilot obstacles generated.');
    process.exit(0);
  } catch (error) {
    console.log(`P0-4A-3A frozen pilot obstacle promotion failed: ${error.message}`);
    process.exit(1);
  }
}

main();
