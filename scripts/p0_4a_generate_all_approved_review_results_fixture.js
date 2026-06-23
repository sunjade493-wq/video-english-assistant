#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const SOURCE_REVIEW_RESULTS_PATH = 'output_text/drafts/p0_4a_obstacles_pilot_review_results.json';
const OUTPUT_FIXTURE_PATH = 'output_text/fixtures/p0_4a_obstacles_pilot_review_results_all_approved.json';

const SOURCE_REVIEW_RESULTS_PATH_ABSOLUTE = path.join(REPO_ROOT, SOURCE_REVIEW_RESULTS_PATH);
const OUTPUT_FIXTURE_PATH_ABSOLUTE = path.join(REPO_ROOT, OUTPUT_FIXTURE_PATH);

const EXPECTED_SOURCE_SCHEMA_VERSION = 'p0-4a-review-results-v1';
const OUTPUT_SCHEMA_VERSION = 'p0-4a-review-results-fixture-v1';
const GENERATED_AT = '1970-01-01T00:00:00.000Z';
const FIXTURE_REVIEW_NOTES = 'Automatically approved fixture for P0-4A-3B frozen promotion verification.';

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

  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    if (fs.existsSync(temporaryPath)) {
      fs.unlinkSync(temporaryPath);
    }
    throw error;
  }
}

function validateSourceReviewResults(reviewResults) {
  const errors = [];

  if (!reviewResults || typeof reviewResults !== 'object' || Array.isArray(reviewResults)) {
    return ['Review results root must be a JSON object.'];
  }

  if (reviewResults.schemaVersion !== EXPECTED_SOURCE_SCHEMA_VERSION) {
    errors.push(`Review results schemaVersion must be ${JSON.stringify(EXPECTED_SOURCE_SCHEMA_VERSION)}; found ${JSON.stringify(reviewResults.schemaVersion)}.`);
  }

  if (reviewResults.runtimeMayConsume !== false) {
    errors.push(`Review results runtimeMayConsume must be false; found ${JSON.stringify(reviewResults.runtimeMayConsume)}.`);
  }

  if (reviewResults.frozenOutputGenerated !== false) {
    errors.push(`Review results frozenOutputGenerated must be false; found ${JSON.stringify(reviewResults.frozenOutputGenerated)}.`);
  }

  if (!Array.isArray(reviewResults.results)) {
    errors.push('Review results results must be an array.');
  }

  return errors;
}

function buildAllApprovedFixture(reviewResults) {
  const totalObstacles = reviewResults.results.length;
  const results = reviewResults.results.map((result) => ({
    ...result,
    humanDecision: 'approved',
    reviewer: 'fixture_generator',
    reviewedAt: GENERATED_AT,
    reviewNotes: FIXTURE_REVIEW_NOTES,
  }));

  return {
    schemaVersion: OUTPUT_SCHEMA_VERSION,
    sourceReviewResultsPath: SOURCE_REVIEW_RESULTS_PATH,
    generatedAt: GENERATED_AT,
    fixtureType: 'all_approved',
    reviewStatus: 'human_review_completed',
    runtimeMayConsume: false,
    frozenOutputGenerated: false,
    episodeId: reviewResults.episodeId,
    learnerLevel: reviewResults.learnerLevel,
    analyzerVersion: reviewResults.analyzerVersion,
    smokeScope: reviewResults.smokeScope,
    summary: {
      totalObstacles,
      approvedCount: totalObstacles,
      rejectedCount: 0,
      pendingCount: 0,
    },
    results,
  };
}

function main() {
  try {
    const reviewResults = readJson(SOURCE_REVIEW_RESULTS_PATH_ABSOLUTE, SOURCE_REVIEW_RESULTS_PATH);
    const validationErrors = validateSourceReviewResults(reviewResults);

    if (validationErrors.length > 0) {
      throw new Error(`All-approved review-results fixture validation failed:\n- ${validationErrors.join('\n- ')}`);
    }

    const fixture = buildAllApprovedFixture(reviewResults);
    writeJsonAtomic(OUTPUT_FIXTURE_PATH_ABSOLUTE, fixture);

    console.log('P0-4A-3B all-approved review-results fixture generated.');
    process.exit(0);
  } catch (error) {
    console.log(`P0-4A-3B all-approved review-results fixture generation failed: ${error.message}`);
    process.exit(1);
  }
}

main();
