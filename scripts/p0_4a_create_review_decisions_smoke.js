#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const SOURCE_DRAFT_PATH = 'output_text/drafts/p0_4a_obstacles_pilot_draft_smoke.json';
const SOURCE_REVIEW_REPORT_PATH = 'output_text/drafts/p0_4a_obstacles_pilot_draft_review_report.json';
const OUTPUT_PATH = 'output_text/drafts/p0_4a_obstacles_pilot_review_decisions.json';

const DRAFT_PATH_ABSOLUTE = path.join(REPO_ROOT, SOURCE_DRAFT_PATH);
const REVIEW_REPORT_PATH_ABSOLUTE = path.join(REPO_ROOT, SOURCE_REVIEW_REPORT_PATH);
const OUTPUT_PATH_ABSOLUTE = path.join(REPO_ROOT, OUTPUT_PATH);

const EXPECTED_DRAFT_SCHEMA_VERSION = 'p0-4a-obstacles-draft-smoke-v1';
const OUTPUT_SCHEMA_VERSION = 'p0-4a-review-decisions-v1';

const REQUIRED_OBSTACLE_FIELDS = [
  'obstacleId',
  'type',
  'subtitleIndex',
  'text',
  'source_en',
  'source_zh',
  'decisionSource',
  'confidence',
  'reviewDecision',
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

function validateDraft(draft) {
  const errors = [];

  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    return ['Source draft root must be a JSON object.'];
  }

  if (draft.schemaVersion !== EXPECTED_DRAFT_SCHEMA_VERSION) {
    errors.push(`Source draft schemaVersion must be ${JSON.stringify(EXPECTED_DRAFT_SCHEMA_VERSION)}; found ${JSON.stringify(draft.schemaVersion)}.`);
  }

  if (draft.smokeTest !== true) {
    errors.push(`Source draft smokeTest must be true; found ${JSON.stringify(draft.smokeTest)}.`);
  }

  if (draft.runtimeMayConsume !== false) {
    errors.push(`Source draft runtimeMayConsume must be false; found ${JSON.stringify(draft.runtimeMayConsume)}.`);
  }

  if (draft.reviewStatus !== 'draft') {
    errors.push(`Source draft reviewStatus must be "draft"; found ${JSON.stringify(draft.reviewStatus)}.`);
  }

  if (!Array.isArray(draft.obstacles)) {
    errors.push('Source draft obstacles must be an array.');
    return errors;
  }

  draft.obstacles.forEach((obstacle, index) => {
    const label = `obstacles[${index}]`;

    if (!obstacle || typeof obstacle !== 'object' || Array.isArray(obstacle)) {
      errors.push(`${label} must be a JSON object.`);
      return;
    }

    for (const field of REQUIRED_OBSTACLE_FIELDS) {
      if (!hasOwn(obstacle, field)) {
        errors.push(`${label} is missing required field ${JSON.stringify(field)}.`);
      }
    }

    if (hasOwn(obstacle, 'reviewDecision') && obstacle.reviewDecision !== 'pending') {
      errors.push(`${label}.reviewDecision must be "pending"; found ${JSON.stringify(obstacle.reviewDecision)}.`);
    }
  });

  return errors;
}

function validateReviewReportIfPresent() {
  if (!fs.existsSync(REVIEW_REPORT_PATH_ABSOLUTE)) return;

  const reviewReport = readJson(REVIEW_REPORT_PATH_ABSOLUTE, SOURCE_REVIEW_REPORT_PATH);
  if (!reviewReport || typeof reviewReport !== 'object' || Array.isArray(reviewReport)) {
    throw new Error('Review report root must be a JSON object.');
  }

  if (reviewReport.pass !== true) {
    throw new Error(`Review report pass must be true before generating review decisions; found ${JSON.stringify(reviewReport.pass)}.`);
  }
}

function buildReviewDecisions(draft) {
  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    sourceDraftPath: SOURCE_DRAFT_PATH,
    sourceReviewReportPath: SOURCE_REVIEW_REPORT_PATH,
    generatedAt: new Date().toISOString(),
    reviewStatus: 'pending_human_review',
    runtimeMayConsume: false,
    frozenOutputGenerated: false,
    episodeId: draft.episodeId,
    learnerLevel: draft.learnerLevel,
    analyzerVersion: draft.analyzerVersion,
    smokeScope: draft.smokeScope,
    decisions: draft.obstacles.map((obstacle) => ({
      obstacleId: obstacle.obstacleId,
      type: obstacle.type,
      subtitleIndex: obstacle.subtitleIndex,
      text: obstacle.text,
      source_en: obstacle.source_en,
      source_zh: obstacle.source_zh,
      aiDecisionSource: obstacle.decisionSource,
      aiConfidence: obstacle.confidence,
      humanDecision: 'pending',
      reviewer: null,
      reviewedAt: null,
      reviewNotes: '',
    })),
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function main() {
  try {
    const draft = readJson(DRAFT_PATH_ABSOLUTE, SOURCE_DRAFT_PATH);
    validateReviewReportIfPresent();

    const validationErrors = validateDraft(draft);
    if (validationErrors.length > 0) {
      throw new Error(`Source draft validation failed:\n- ${validationErrors.join('\n- ')}`);
    }

    const reviewDecisions = buildReviewDecisions(draft);
    writeJson(OUTPUT_PATH_ABSOLUTE, reviewDecisions);

    console.log('P0-4A-2C-2 review decisions generated.');
    process.exit(0);
  } catch (error) {
    console.log(`P0-4A-2C-2 review decision generation failed: ${error.message}`);
    process.exit(1);
  }
}

main();
