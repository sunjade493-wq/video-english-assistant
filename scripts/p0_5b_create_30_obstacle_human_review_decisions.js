const fs = require('fs');
const path = require('path');

const SOURCE_DRAFT_PATH = 'output_text/drafts/p0_5b_30_obstacle_ai_draft_repaired.json';
const SOURCE_VALIDATION_REPORT_PATH = 'output_text/drafts/p0_5b_30_obstacle_ai_draft_repaired_validation_report.json';
const OUTPUT_PATH = 'output_text/drafts/p0_5b_30_obstacle_human_review_decisions.json';
const EXPECTED_OBSTACLE_COUNT = 30;
const ALLOWED_DECISION_VALUES = ['approved', 'rejected', 'needs_edit', 'pending'];

function fail(message) {
  throw new Error(`P0-5B-6 human review decision template creation failed: ${message}`);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`required input file does not exist: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertPreconditions(draft, validationReport) {
  if (validationReport.status !== 'passed') {
    fail(`validation report status must be passed, received: ${validationReport.status}`);
  }
  if (validationReport.nextStageAllowed !== true) {
    fail(`validation report nextStageAllowed must be true, received: ${validationReport.nextStageAllowed}`);
  }
  if (validationReport.summary?.invalidCount !== 0) {
    fail(`validation report invalidCount must be 0, received: ${validationReport.summary?.invalidCount}`);
  }
  if (validationReport.summary?.actualObstacleCount !== EXPECTED_OBSTACLE_COUNT) {
    fail(`validation report actualObstacleCount must be ${EXPECTED_OBSTACLE_COUNT}, received: ${validationReport.summary?.actualObstacleCount}`);
  }
  if (draft.reviewStatus !== 'draft') {
    fail(`repaired draft reviewStatus must be draft, received: ${draft.reviewStatus}`);
  }
  if (draft.runtimeMayConsume !== false) {
    fail(`repaired draft runtimeMayConsume must be false, received: ${draft.runtimeMayConsume}`);
  }
  if (!Array.isArray(draft.obstacles)) {
    fail('repaired draft obstacles must be an array');
  }
  if (draft.obstacles.length !== EXPECTED_OBSTACLE_COUNT) {
    fail(`repaired draft obstacles length must be ${EXPECTED_OBSTACLE_COUNT}, received: ${draft.obstacles.length}`);
  }
}

function createDisplay(obstacle) {
  return {
    word: obstacle.word ?? '',
    partOfSpeech: obstacle.partOfSpeech ?? '',
    sentenceMeaning: obstacle.sentenceMeaning ?? '',
    literal: obstacle.literal ?? '',
    actual: obstacle.actual ?? '',
    grammar: obstacle.grammar ?? '',
  };
}

function createDecision(obstacle) {
  return {
    obstacleId: obstacle.obstacleId,
    type: obstacle.type,
    subtitleIndex: obstacle.subtitleIndex,
    source_en: obstacle.source_en,
    source_zh: obstacle.source_zh,
    text: obstacle.text,
    display: createDisplay(obstacle),
    reviewDecision: 'pending',
    reviewNotes: '',
    allowedDecisionValues: ALLOWED_DECISION_VALUES,
    qualityChecklist: {
      realLearningObstacle: null,
      levelAppropriate: null,
      notDuplicate: null,
      boundaryCorrect: null,
      explanationUseful: null,
      sentenceMeaningGood: null,
    },
  };
}

function createHumanReviewDecisionTemplate(draft) {
  const decisions = draft.obstacles.map(createDecision);

  return {
    schemaVersion: 'p0-5b-30-obstacle-human-review-decisions.v1',
    stage: 'P0-5B-6',
    sourceDraftPath: SOURCE_DRAFT_PATH,
    sourceValidationReportPath: SOURCE_VALIDATION_REPORT_PATH,
    reviewStatus: 'pending-human-review',
    reviewerInstruction: 'Human reviewer: manually inspect each obstacle and set reviewDecision to approved, rejected, needs_edit, or pending. Do not change obstacle content in this file except reviewDecision, reviewNotes, and qualityChecklist fields. This template starts with all decisions pending and nextStageAllowed false.',
    summary: {
      obstacleCount: EXPECTED_OBSTACLE_COUNT,
      approvedCount: 0,
      rejectedCount: 0,
      needsEditCount: 0,
      pendingCount: EXPECTED_OBSTACLE_COUNT,
    },
    decisions,
    nextStageAllowed: false,
  };
}

function validateTemplate(template, draft) {
  if (!Array.isArray(template.decisions)) {
    fail('decisions must be an array');
  }
  if (template.decisions.length !== draft.obstacles.length) {
    fail(`decisions length must equal obstacles length, received ${template.decisions.length} and ${draft.obstacles.length}`);
  }

  template.decisions.forEach((decision, index) => {
    const obstacle = draft.obstacles[index];
    if (decision.obstacleId !== obstacle.obstacleId) {
      fail(`decision obstacleId mismatch at index ${index}: ${decision.obstacleId} !== ${obstacle.obstacleId}`);
    }
    if (decision.reviewDecision !== 'pending') {
      fail(`decision ${decision.obstacleId} must start pending`);
    }
  });

  if (template.summary.pendingCount !== EXPECTED_OBSTACLE_COUNT) {
    fail(`summary pendingCount must be ${EXPECTED_OBSTACLE_COUNT}, received: ${template.summary.pendingCount}`);
  }
  if (template.nextStageAllowed !== false) {
    fail(`nextStageAllowed must be false before human review is completed, received: ${template.nextStageAllowed}`);
  }
}

const draft = readJson(SOURCE_DRAFT_PATH);
const validationReport = readJson(SOURCE_VALIDATION_REPORT_PATH);
assertPreconditions(draft, validationReport);

const template = createHumanReviewDecisionTemplate(draft);
validateTemplate(template, draft);

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(template, null, 2)}\n`);

console.log('P0-5B-6 human review decision template created');
console.log(`obstacle count: ${template.summary.obstacleCount}`);
console.log(`pending decisions: ${template.summary.pendingCount}`);
console.log(`approved: ${template.summary.approvedCount}`);
console.log(`rejected: ${template.summary.rejectedCount}`);
console.log(`needs_edit: ${template.summary.needsEditCount}`);
console.log(`next stage allowed: ${template.nextStageAllowed}`);
console.log(`output: ${OUTPUT_PATH}`);
