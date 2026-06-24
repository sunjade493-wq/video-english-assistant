#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SOURCE_FROZEN_PATH = 'output_text/frozen/p0_5b_30_obstacle_frozen.json';
const SOURCE_VALIDATION_REPORT_PATH = 'output_text/frozen/p0_5b_30_obstacle_frozen_validation_report.json';
const RUNTIME_ARTIFACT_PATH = 'output_text/runtime/p0_5b_30_obstacle_runtime.json';
const RUNTIME_PROMOTION_REPORT_PATH = 'output_text/runtime/p0_5b_30_obstacle_runtime_promotion_report.json';

const EXPECTED_COUNT = 17;
const PRODUCTION_DEFAULT_OBSTACLE_COUNT = 48;
const ACTIVATION = Object.freeze({
  queryParam: 'runtimePilot=1',
  defaultProductionFlowUnchanged: true,
  normalUsersEnabled: false,
});
const ALLOWED_OUTPUT_PATHS = Object.freeze([
  RUNTIME_ARTIFACT_PATH,
  RUNTIME_PROMOTION_REPORT_PATH,
]);

function fail(message) {
  throw new Error(`[P0-5B-9 runtime promotion] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(filePath) {
  assert(fs.existsSync(filePath), `required input does not exist: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function statFingerprint(filePath) {
  const stat = fs.statSync(filePath);
  return {
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    ctimeMs: stat.ctimeMs,
  };
}

function assertUnchanged(filePath, before) {
  const after = statFingerprint(filePath);
  assert(after.size === before.size, `source file size changed: ${filePath}`);
  assert(after.mtimeMs === before.mtimeMs, `source file mtime changed: ${filePath}`);
  assert(after.ctimeMs === before.ctimeMs, `source file ctime changed: ${filePath}`);
}

function assertExactOutputPaths(paths) {
  const normalizedAllowed = ALLOWED_OUTPUT_PATHS.map((p) => path.normalize(p)).sort();
  const normalizedActual = paths.map((p) => path.normalize(p)).sort();
  assert(
    JSON.stringify(normalizedActual) === JSON.stringify(normalizedAllowed),
    `output paths must be exactly ${ALLOWED_OUTPUT_PATHS.join(', ')}`
  );
}

function validateFrozenValidationReport(report) {
  assert(
    report.schemaVersion === 'p0-5b-30-obstacle-frozen-validation-report.v1',
    'frozen validation report schemaVersion mismatch'
  );
  assert(report.status === 'passed', 'frozen validation report status must be passed');
  assert(report.runtimePromotionAllowed === true, 'runtimePromotionAllowed must be true');
  assert(report.nextStageAllowed === true, 'nextStageAllowed must be true');
  assert(report.summary && report.summary.frozenObstacleCount === EXPECTED_COUNT, 'frozen validation report frozenObstacleCount must be 17');
  assert(report.summary && report.summary.invalidCount === 0, 'frozen validation report invalidCount must be 0');
}

function validateFrozenArtifact(frozen) {
  assert(frozen.schemaVersion === 'p0-5b-30-obstacle-frozen.v1', 'frozen artifact schemaVersion mismatch');
  assert(frozen.reviewStatus === 'frozen', 'frozen artifact reviewStatus must be frozen');
  assert(frozen.runtimeMayConsume === false, 'frozen artifact runtimeMayConsume must be false');
  assert(frozen.promotionPolicy === 'approved-only', 'frozen artifact promotionPolicy must be approved-only');
  assert(frozen.summary && frozen.summary.frozenObstacleCount === EXPECTED_COUNT, 'frozen artifact frozenObstacleCount must be 17');
  assert(Array.isArray(frozen.obstacles), 'frozen artifact obstacles must be an array');
  assert(frozen.obstacles.length === EXPECTED_COUNT, 'frozen artifact must have exactly 17 obstacles');

  for (const obstacle of frozen.obstacles) {
    assert(obstacle.reviewStatus === 'frozen', `frozen obstacle reviewStatus must be frozen: ${obstacle.obstacleId}`);
    assert(obstacle.reviewDecision === 'approved', `frozen obstacle reviewDecision must be approved: ${obstacle.obstacleId}`);
  }
}

function toRuntimeObstacle(frozenObstacle) {
  return {
    ...frozenObstacle,
    reviewStatus: 'runtime',
    runtimeMayConsume: true,
  };
}

function buildRuntimeArtifact(frozen) {
  return {
    schemaVersion: 'p0-5b-30-obstacle-runtime.v1',
    stage: 'P0-5B-9',
    episodeId: 'tbbt-s12e01',
    learnerLevel: 'CET-4',
    sourceFrozenPath: SOURCE_FROZEN_PATH,
    sourceFrozenValidationReportPath: SOURCE_VALIDATION_REPORT_PATH,
    reviewStatus: 'runtime',
    runtimeMayConsume: true,
    runtimeScope: 'developer-opt-in',
    activation: { ...ACTIVATION },
    summary: {
      runtimeObstacleCount: EXPECTED_COUNT,
      sourceFrozenObstacleCount: frozen.summary.frozenObstacleCount,
      productionDefaultObstacleCount: PRODUCTION_DEFAULT_OBSTACLE_COUNT,
    },
    obstacles: frozen.obstacles.map(toRuntimeObstacle),
  };
}

function buildRuntimePromotionReport(runtimeArtifact) {
  return {
    schemaVersion: 'p0-5b-30-obstacle-runtime-promotion-report.v1',
    stage: 'P0-5B-9',
    sourceFrozenPath: SOURCE_FROZEN_PATH,
    sourceFrozenValidationReportPath: SOURCE_VALIDATION_REPORT_PATH,
    runtimeArtifactPath: RUNTIME_ARTIFACT_PATH,
    summary: {
      runtimeObstacleCount: runtimeArtifact.summary.runtimeObstacleCount,
      sourceFrozenObstacleCount: runtimeArtifact.summary.sourceFrozenObstacleCount,
      productionDefaultObstacleCount: runtimeArtifact.summary.productionDefaultObstacleCount,
    },
    promotedObstacleIds: runtimeArtifact.obstacles.map((obstacle) => obstacle.obstacleId),
    runtimeMayConsume: true,
    activation: { ...ACTIVATION },
    nextRecommendedStep: 'Validate runtime artifact, then verify Runtime Pilot under ?runtimePilot=1 while default / remains Production.',
  };
}

function validateRuntimeOutputs(runtimeArtifact, promotionReport) {
  assert(runtimeArtifact.runtimeMayConsume === true, 'top-level runtimeMayConsume must be true');
  assert(Array.isArray(runtimeArtifact.obstacles), 'runtime artifact obstacles must be an array');
  assert(runtimeArtifact.obstacles.length === EXPECTED_COUNT, 'runtime artifact must have exactly 17 obstacles');
  assert(runtimeArtifact.activation && runtimeArtifact.activation.queryParam === 'runtimePilot=1', 'runtime artifact activation.queryParam must be runtimePilot=1');
  assert(runtimeArtifact.activation.defaultProductionFlowUnchanged === true, 'default Production flow must remain unchanged');
  assert(runtimeArtifact.activation.normalUsersEnabled === false, 'normal users must not be enabled');
  assert(runtimeArtifact.runtimeScope === 'developer-opt-in', 'runtime artifact must be developer opt-in scoped');

  for (const obstacle of runtimeArtifact.obstacles) {
    assert(obstacle.reviewStatus === 'runtime', `runtime obstacle reviewStatus must be runtime: ${obstacle.obstacleId}`);
    assert(obstacle.reviewDecision === 'approved', `runtime obstacle reviewDecision must be approved: ${obstacle.obstacleId}`);
    assert(obstacle.runtimeMayConsume === true, `runtime obstacle runtimeMayConsume must be true: ${obstacle.obstacleId}`);
    assert(!('visualMapping' in obstacle), `runtime obstacle must not add visualMapping: ${obstacle.obstacleId}`);
    assert(!('coordinates' in obstacle), `runtime obstacle must not add coordinates: ${obstacle.obstacleId}`);
  }

  assert(promotionReport.runtimeMayConsume === true, 'runtime promotion report runtimeMayConsume must be true');
  assert(promotionReport.activation && promotionReport.activation.defaultProductionFlowUnchanged === true, 'promotion report must keep Production unchanged');
  assert(promotionReport.activation.normalUsersEnabled === false, 'promotion report must not enable normal users');
  assert(!promotionReport.productionReplacement, 'runtime promotion report must not claim Production replacement');
  assert(!promotionReport.replacesProduction, 'runtime promotion report must not replace Production');
  assert(!promotionReport.productionDefaultReplaced, 'runtime promotion report must not claim Production default replacement');
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function main() {
  assertExactOutputPaths([RUNTIME_ARTIFACT_PATH, RUNTIME_PROMOTION_REPORT_PATH]);

  const sourceFingerprints = {
    [SOURCE_FROZEN_PATH]: statFingerprint(SOURCE_FROZEN_PATH),
    [SOURCE_VALIDATION_REPORT_PATH]: statFingerprint(SOURCE_VALIDATION_REPORT_PATH),
  };

  const frozen = readJson(SOURCE_FROZEN_PATH);
  const validationReport = readJson(SOURCE_VALIDATION_REPORT_PATH);

  validateFrozenValidationReport(validationReport);
  validateFrozenArtifact(frozen);

  const runtimeArtifact = buildRuntimeArtifact(frozen);
  const promotionReport = buildRuntimePromotionReport(runtimeArtifact);

  validateRuntimeOutputs(runtimeArtifact, promotionReport);

  writeJson(RUNTIME_ARTIFACT_PATH, runtimeArtifact);
  writeJson(RUNTIME_PROMOTION_REPORT_PATH, promotionReport);

  assertUnchanged(SOURCE_FROZEN_PATH, sourceFingerprints[SOURCE_FROZEN_PATH]);
  assertUnchanged(SOURCE_VALIDATION_REPORT_PATH, sourceFingerprints[SOURCE_VALIDATION_REPORT_PATH]);

  console.log('P0-5B-9 runtime promotion complete');
  console.log(`runtime obstacles: ${runtimeArtifact.summary.runtimeObstacleCount}`);
  console.log(`runtimeMayConsume: ${runtimeArtifact.runtimeMayConsume}`);
  console.log(`activation: ${runtimeArtifact.activation.queryParam}`);
  console.log(`default Production unchanged: ${runtimeArtifact.activation.defaultProductionFlowUnchanged}`);
  console.log(`normal users enabled: ${runtimeArtifact.activation.normalUsersEnabled}`);
  console.log(`runtime artifact: ${RUNTIME_ARTIFACT_PATH}`);
  console.log(`runtime promotion report: ${RUNTIME_PROMOTION_REPORT_PATH}`);
}

main();
