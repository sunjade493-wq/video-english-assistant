const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SOURCE_DRAFT_PATH = 'output_text/drafts/p0_5b_30_obstacle_ai_draft_repaired.json';
const SOURCE_DECISION_PATH = 'output_text/drafts/p0_5b_30_obstacle_human_review_decisions.json';
const REVIEWED_DRAFT_PATH = 'output_text/drafts/p0_5b_30_obstacle_reviewed_draft.json';
const APPLY_REPORT_PATH = 'output_text/drafts/p0_5b_30_obstacle_human_review_apply_report.json';

const EXPECTED = Object.freeze({
  sourceObstacleCount: 30,
  approvedCount: 17,
  rejectedCount: 12,
  needsEditCount: 1,
  pendingCount: 0,
  reviewedObstacleCount: 17,
});

function fail(message) {
  throw new Error(`P0-5B-7 human review apply failed: ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function fileHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readJson(filePath) {
  assert(fs.existsSync(filePath), `required input file does not exist: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  const directory = path.dirname(filePath);
  assert(directory === 'output_text/drafts', `refusing to write outside output_text/drafts: ${filePath}`);
  assert(!filePath.startsWith('output_text/frozen/'), `refusing frozen write: ${filePath}`);
  assert(!filePath.startsWith('output_text/runtime/'), `refusing runtime write: ${filePath}`);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function countDecisions(decisions) {
  return decisions.reduce((counts, decision) => {
    const key = decision.reviewDecision;
    if (key === 'approved') counts.approvedCount += 1;
    else if (key === 'rejected') counts.rejectedCount += 1;
    else if (key === 'needs_edit') counts.needsEditCount += 1;
    else if (key === 'pending') counts.pendingCount += 1;
    else fail(`unsupported reviewDecision ${JSON.stringify(key)} for ${decision.obstacleId}`);
    return counts;
  }, { approvedCount: 0, rejectedCount: 0, needsEditCount: 0, pendingCount: 0 });
}

function mapByObstacleId(items, label) {
  const map = new Map();
  for (const item of items) {
    assert(item && typeof item.obstacleId === 'string', `${label} contains item without string obstacleId`);
    assert(!map.has(item.obstacleId), `${label} contains duplicate obstacleId: ${item.obstacleId}`);
    map.set(item.obstacleId, item);
  }
  return map;
}

function reportEntry(obstacle, decision) {
  return {
    obstacleId: obstacle.obstacleId,
    type: obstacle.type,
    subtitleIndex: obstacle.subtitleIndex,
    text: obstacle.text,
    reviewNotes: decision.reviewNotes,
  };
}

function main() {
  const sourceDraftHashBefore = fileHash(SOURCE_DRAFT_PATH);
  const sourceDecisionHashBefore = fileHash(SOURCE_DECISION_PATH);

  const draft = readJson(SOURCE_DRAFT_PATH);
  const review = readJson(SOURCE_DECISION_PATH);

  assert(review.reviewStatus === 'human-review-completed', `decision file reviewStatus must be human-review-completed, received ${JSON.stringify(review.reviewStatus)}`);
  assert(review.nextStageAllowed === true, 'decision file nextStageAllowed must be true');
  assert(review.summary && review.summary.approvedCount === EXPECTED.approvedCount, `approvedCount must be ${EXPECTED.approvedCount}`);
  assert(review.summary.rejectedCount === EXPECTED.rejectedCount, `rejectedCount must be ${EXPECTED.rejectedCount}`);
  assert(review.summary.needsEditCount === EXPECTED.needsEditCount, `needsEditCount must be ${EXPECTED.needsEditCount}`);
  assert(review.summary.pendingCount === EXPECTED.pendingCount, `pendingCount must be ${EXPECTED.pendingCount}`);

  assert(Array.isArray(draft.obstacles), 'source draft obstacles must be an array');
  assert(Array.isArray(review.decisions), 'human review decisions must be an array');
  assert(draft.obstacles.length === EXPECTED.sourceObstacleCount, `source obstacle count must be ${EXPECTED.sourceObstacleCount}`);

  const obstacleById = mapByObstacleId(draft.obstacles, 'source draft obstacles');
  const decisionById = mapByObstacleId(review.decisions, 'human review decisions');

  for (const obstacle of draft.obstacles) {
    assert(decisionById.has(obstacle.obstacleId), `missing decision for source obstacle ${obstacle.obstacleId}`);
  }
  for (const decision of review.decisions) {
    assert(obstacleById.has(decision.obstacleId), `decision has no matching source obstacle ${decision.obstacleId}`);
  }

  const actualCounts = countDecisions(review.decisions);
  assert(actualCounts.approvedCount === EXPECTED.approvedCount, `actual approved decisions must be ${EXPECTED.approvedCount}`);
  assert(actualCounts.rejectedCount === EXPECTED.rejectedCount, `actual rejected decisions must be ${EXPECTED.rejectedCount}`);
  assert(actualCounts.needsEditCount === EXPECTED.needsEditCount, `actual needs_edit decisions must be ${EXPECTED.needsEditCount}`);
  assert(actualCounts.pendingCount === EXPECTED.pendingCount, 'pending decisions are forbidden at this stage');

  const summary = {
    sourceObstacleCount: draft.obstacles.length,
    approvedCount: actualCounts.approvedCount,
    rejectedCount: actualCounts.rejectedCount,
    needsEditCount: actualCounts.needsEditCount,
    pendingCount: actualCounts.pendingCount,
    reviewedObstacleCount: actualCounts.approvedCount,
  };

  const approved = [];
  const rejected = [];
  const needsEdit = [];
  const reviewedObstacles = [];

  for (const obstacle of draft.obstacles) {
    const decision = decisionById.get(obstacle.obstacleId);
    if (decision.reviewDecision === 'approved') {
      reviewedObstacles.push({
        ...obstacle,
        reviewStatus: 'reviewed',
        reviewDecision: 'approved',
        reviewNotes: decision.reviewNotes,
        qualityChecklist: decision.qualityChecklist,
      });
      approved.push(reportEntry(obstacle, decision));
    } else if (decision.reviewDecision === 'rejected') {
      rejected.push(reportEntry(obstacle, decision));
    } else if (decision.reviewDecision === 'needs_edit') {
      needsEdit.push(reportEntry(obstacle, decision));
    } else if (decision.reviewDecision === 'pending') {
      fail(`pending decision is forbidden: ${decision.obstacleId}`);
    }
  }

  const reviewedIds = new Set(reviewedObstacles.map((obstacle) => obstacle.obstacleId));
  assert(reviewedObstacles.length === EXPECTED.reviewedObstacleCount, `reviewed draft obstacle count must be ${EXPECTED.reviewedObstacleCount}`);
  for (const obstacle of reviewedObstacles) {
    assert(obstacle.reviewStatus === 'reviewed', `reviewed obstacle ${obstacle.obstacleId} must have reviewStatus reviewed`);
    assert(obstacle.reviewDecision === 'approved', `reviewed obstacle ${obstacle.obstacleId} must have reviewDecision approved`);
  }
  for (const entry of rejected) {
    assert(!reviewedIds.has(entry.obstacleId), `rejected obstacle appears in reviewed draft: ${entry.obstacleId}`);
  }
  for (const entry of needsEdit) {
    assert(!reviewedIds.has(entry.obstacleId), `needs_edit obstacle appears in reviewed draft: ${entry.obstacleId}`);
  }

  const reviewedDraft = {
    schemaVersion: 'p0-5b-30-obstacle-reviewed-draft.v1',
    stage: 'P0-5B-7',
    sourceDraftPath: SOURCE_DRAFT_PATH,
    sourceDecisionPath: SOURCE_DECISION_PATH,
    episodeId: 'tbbt-s12e01',
    learnerLevel: 'CET-4',
    reviewStatus: 'reviewed-draft',
    runtimeMayConsume: false,
    summary,
    obstacles: reviewedObstacles,
  };

  assert(reviewedDraft.runtimeMayConsume === false, 'reviewed draft runtimeMayConsume must be false');

  const applyReport = {
    schemaVersion: 'p0-5b-30-obstacle-human-review-apply-report.v1',
    stage: 'P0-5B-7',
    sourceDraftPath: SOURCE_DRAFT_PATH,
    sourceDecisionPath: SOURCE_DECISION_PATH,
    reviewedDraftPath: REVIEWED_DRAFT_PATH,
    summary,
    approved,
    rejected,
    needsEdit,
    nextRecommendedStep: 'Resolve needs_edit items before frozen promotion, or explicitly freeze approved-only promotion policy.',
  };

  writeJson(REVIEWED_DRAFT_PATH, reviewedDraft);
  writeJson(APPLY_REPORT_PATH, applyReport);

  assert(fileHash(SOURCE_DRAFT_PATH) === sourceDraftHashBefore, 'source repaired draft file was modified');
  assert(fileHash(SOURCE_DECISION_PATH) === sourceDecisionHashBefore, 'human review decision file was modified');

  console.log('P0-5B-7 human review applied');
  console.log(`source obstacles: ${summary.sourceObstacleCount}`);
  console.log(`approved: ${summary.approvedCount}`);
  console.log(`rejected: ${summary.rejectedCount}`);
  console.log(`needs_edit: ${summary.needsEditCount}`);
  console.log(`pending: ${summary.pendingCount}`);
  console.log(`reviewed draft obstacles: ${summary.reviewedObstacleCount}`);
  console.log(`runtimeMayConsume: ${reviewedDraft.runtimeMayConsume}`);
  console.log(`reviewed draft: ${REVIEWED_DRAFT_PATH}`);
  console.log(`apply report: ${APPLY_REPORT_PATH}`);
}

main();
