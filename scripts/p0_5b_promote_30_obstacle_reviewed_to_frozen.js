#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SOURCE_REVIEWED_DRAFT_PATH = 'output_text/drafts/p0_5b_30_obstacle_reviewed_draft.json';
const SOURCE_APPLY_REPORT_PATH = 'output_text/drafts/p0_5b_30_obstacle_human_review_apply_report.json';
const FROZEN_ARTIFACT_PATH = 'output_text/frozen/p0_5b_30_obstacle_frozen.json';
const PROMOTION_REPORT_PATH = 'output_text/frozen/p0_5b_30_obstacle_frozen_promotion_report.json';
const ALLOWED_OUTPUT_PATHS = new Set([FROZEN_ARTIFACT_PATH, PROMOTION_REPORT_PATH]);

const EXPECTED = Object.freeze({
  sourceObstacleCount: 30,
  approvedCount: 17,
  rejectedCount: 12,
  needsEditCount: 1,
  pendingCount: 0,
  reviewedObstacleCount: 17,
});

function fail(message) {
  throw new Error(`P0-5B-8 frozen promotion failed: ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function assertExactOutputPath(outputPath) {
  assert(ALLOWED_OUTPUT_PATHS.has(outputPath), `output path is not allowed: ${outputPath}`);
  assert(!outputPath.startsWith('output_text/runtime/'), `runtime writes are forbidden: ${outputPath}`);
}

function readJson(readPath) {
  assert(fs.existsSync(readPath), `required source file does not exist: ${readPath}`);
  return JSON.parse(fs.readFileSync(readPath, 'utf8'));
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function assertSummaryValue(summary, key, expectedValue, label) {
  assert(summary && summary[key] === expectedValue, `${label} summary.${key} expected ${expectedValue}, got ${summary && summary[key]}`);
}

function assertExpectedSummary(summary, label) {
  for (const [key, expectedValue] of Object.entries(EXPECTED)) {
    assertSummaryValue(summary, key, expectedValue, label);
  }
}

function obstacleIdList(items, label) {
  assert(Array.isArray(items), `${label} must be an array`);
  return items.map((item, index) => {
    assert(item && typeof item.obstacleId === 'string', `${label}[${index}].obstacleId must be a string`);
    return item.obstacleId;
  });
}

function assertNoRuntimeMayConsumeTrue(value, location) {
  if (!value || typeof value !== 'object') return;
  if (value.runtimeMayConsume === true) fail(`nested runtimeMayConsume true forbidden at ${location}`);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoRuntimeMayConsumeTrue(item, `${location}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key !== 'runtimeMayConsume') assertNoRuntimeMayConsumeTrue(child, `${location}.${key}`);
  }
}

function validateReviewedDraft(reviewedDraft) {
  assert(reviewedDraft.schemaVersion === 'p0-5b-30-obstacle-reviewed-draft.v1', 'reviewed draft schemaVersion mismatch');
  assert(reviewedDraft.reviewStatus === 'reviewed-draft', 'reviewed draft reviewStatus mismatch');
  assert(reviewedDraft.runtimeMayConsume === false, 'reviewed draft runtimeMayConsume must be false');
  assertExpectedSummary(reviewedDraft.summary, 'reviewed draft');
  assert(Array.isArray(reviewedDraft.obstacles), 'reviewed draft obstacles must be an array');
  assert(reviewedDraft.obstacles.length === EXPECTED.reviewedObstacleCount, `reviewed draft obstacles.length expected ${EXPECTED.reviewedObstacleCount}`);
}

function validateApplyReport(applyReport) {
  assert(applyReport.schemaVersion === 'p0-5b-30-obstacle-human-review-apply-report.v1', 'apply report schemaVersion mismatch');
  assertExpectedSummary(applyReport.summary, 'apply report');
  assert(Array.isArray(applyReport.approved), 'apply report approved must be an array');
  assert(Array.isArray(applyReport.rejected), 'apply report rejected must be an array');
  assert(Array.isArray(applyReport.needsEdit), 'apply report needsEdit must be an array');
  assert(applyReport.approved.length === EXPECTED.approvedCount, `apply report approved.length expected ${EXPECTED.approvedCount}`);
  assert(applyReport.rejected.length === EXPECTED.rejectedCount, `apply report rejected.length expected ${EXPECTED.rejectedCount}`);
  assert(applyReport.needsEdit.length === EXPECTED.needsEditCount, `apply report needsEdit.length expected ${EXPECTED.needsEditCount}`);
}

function validateFrozenArtifact(frozenArtifact, excludedIds) {
  assert(frozenArtifact.runtimeMayConsume === false, 'frozen artifact runtimeMayConsume must be false');
  assert(Array.isArray(frozenArtifact.obstacles), 'frozen artifact obstacles must be an array');
  assert(frozenArtifact.obstacles.length === EXPECTED.approvedCount, `frozen artifact obstacles.length expected ${EXPECTED.approvedCount}`);

  const frozenIds = new Set();
  for (const obstacle of frozenArtifact.obstacles) {
    assert(obstacle.reviewStatus === 'frozen', `frozen obstacle ${obstacle.obstacleId} reviewStatus must be frozen`);
    assert(obstacle.reviewDecision === 'approved', `frozen obstacle ${obstacle.obstacleId} reviewDecision must be approved`);
    assert(obstacle.runtimeMayConsume !== true, `nested runtimeMayConsume true forbidden ${obstacle.obstacleId}`);
    frozenIds.add(obstacle.obstacleId);
  }

  for (const id of excludedIds.rejected) assert(!frozenIds.has(id), `rejected obstacle appears in frozen artifact: ${id}`);
  for (const id of excludedIds.needsEdit) assert(!frozenIds.has(id), `needs_edit obstacle appears in frozen artifact: ${id}`);
  for (const id of excludedIds.pending) assert(!frozenIds.has(id), `pending obstacle appears in frozen artifact: ${id}`);
  assertNoRuntimeMayConsumeTrue(frozenArtifact.obstacles, 'frozenArtifact.obstacles');
}

function writeJson(outputPath, data) {
  assertExactOutputPath(outputPath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`);
}

function main() {
  assertExactOutputPath(FROZEN_ARTIFACT_PATH);
  assertExactOutputPath(PROMOTION_REPORT_PATH);

  const sourceHashesBefore = {
    reviewedDraft: sha256(SOURCE_REVIEWED_DRAFT_PATH),
    applyReport: sha256(SOURCE_APPLY_REPORT_PATH),
  };

  const reviewedDraft = readJson(SOURCE_REVIEWED_DRAFT_PATH);
  const applyReport = readJson(SOURCE_APPLY_REPORT_PATH);
  validateReviewedDraft(reviewedDraft);
  validateApplyReport(applyReport);

  const excludedIds = {
    rejected: obstacleIdList(applyReport.rejected, 'apply report rejected'),
    needsEdit: obstacleIdList(applyReport.needsEdit, 'apply report needsEdit'),
    pending: [],
  };
  const approvedIds = obstacleIdList(applyReport.approved, 'apply report approved');
  const approvedIdSet = new Set(approvedIds);

  const frozenObstacles = reviewedDraft.obstacles
    .filter((obstacle) => obstacle.reviewStatus === 'reviewed' && obstacle.reviewDecision === 'approved')
    .map((obstacle) => ({ ...obstacle, reviewStatus: 'frozen' }));

  assert(frozenObstacles.length === EXPECTED.approvedCount, `approved reviewed obstacle count expected ${EXPECTED.approvedCount}, got ${frozenObstacles.length}`);
  for (const obstacle of frozenObstacles) {
    assert(approvedIdSet.has(obstacle.obstacleId), `frozen obstacle is not listed as approved in apply report: ${obstacle.obstacleId}`);
  }

  const summary = {
    sourceObstacleCount: EXPECTED.sourceObstacleCount,
    frozenObstacleCount: EXPECTED.approvedCount,
    approvedPromotedCount: EXPECTED.approvedCount,
    rejectedExcludedCount: EXPECTED.rejectedCount,
    needsEditExcludedCount: EXPECTED.needsEditCount,
    pendingExcludedCount: EXPECTED.pendingCount,
  };

  const frozenArtifact = {
    schemaVersion: 'p0-5b-30-obstacle-frozen.v1',
    stage: 'P0-5B-8',
    episodeId: 'tbbt-s12e01',
    learnerLevel: 'CET-4',
    sourceReviewedDraftPath: SOURCE_REVIEWED_DRAFT_PATH,
    sourceApplyReportPath: SOURCE_APPLY_REPORT_PATH,
    reviewStatus: 'frozen',
    runtimeMayConsume: false,
    promotionPolicy: 'approved-only',
    summary,
    obstacles: frozenObstacles,
  };

  const promotionReport = {
    schemaVersion: 'p0-5b-30-obstacle-frozen-promotion-report.v1',
    stage: 'P0-5B-8',
    sourceReviewedDraftPath: SOURCE_REVIEWED_DRAFT_PATH,
    sourceApplyReportPath: SOURCE_APPLY_REPORT_PATH,
    frozenArtifactPath: FROZEN_ARTIFACT_PATH,
    summary,
    promotedObstacleIds: frozenObstacles.map((obstacle) => obstacle.obstacleId),
    excluded: excludedIds,
    runtimePromotionAllowed: false,
    nextRecommendedStep: 'Run frozen artifact validation before runtime promotion.',
  };

  validateFrozenArtifact(frozenArtifact, excludedIds);
  assert(promotionReport.runtimePromotionAllowed === false, 'promotion report runtimePromotionAllowed must be false');

  assert(sourceHashesBefore.reviewedDraft === sha256(SOURCE_REVIEWED_DRAFT_PATH), 'reviewed draft changed before write');
  assert(sourceHashesBefore.applyReport === sha256(SOURCE_APPLY_REPORT_PATH), 'apply report changed before write');

  writeJson(FROZEN_ARTIFACT_PATH, frozenArtifact);
  writeJson(PROMOTION_REPORT_PATH, promotionReport);

  assert(sourceHashesBefore.reviewedDraft === sha256(SOURCE_REVIEWED_DRAFT_PATH), 'reviewed draft source file was modified');
  assert(sourceHashesBefore.applyReport === sha256(SOURCE_APPLY_REPORT_PATH), 'apply report source file was modified');

  console.log('P0-5B-8 frozen promotion complete');
  console.log('source obstacles: 30');
  console.log('frozen obstacles: 17');
  console.log('approved promoted: 17');
  console.log('rejected excluded: 12');
  console.log('needs_edit excluded: 1');
  console.log('pending excluded: 0');
  console.log('runtimeMayConsume: false');
  console.log(`frozen artifact: ${FROZEN_ARTIFACT_PATH}`);
  console.log(`promotion report: ${PROMOTION_REPORT_PATH}`);
}

main();
