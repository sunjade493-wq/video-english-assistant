#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const SOURCE_FROZEN_PATH = 'output_text/frozen/p0_4a_obstacles_pilot_frozen.json';
const OUTPUT_PATH = 'output_text/runtime/p0_4a_obstacles_pilot_runtime.json';

const SOURCE_FROZEN_PATH_ABSOLUTE = path.join(REPO_ROOT, SOURCE_FROZEN_PATH);
const OUTPUT_PATH_ABSOLUTE = path.join(REPO_ROOT, OUTPUT_PATH);

const FROZEN_SCHEMA_VERSION = 'p0-4a-frozen-obstacles-pilot-v1';
const RUNTIME_SCHEMA_VERSION = 'p0-4a-runtime-obstacles-pilot-v1';

const REQUIRED_TOP_LEVEL_FIELDS = [
  'schemaVersion',
  'sourceFrozenPath',
  'generatedAt',
  'runtimeMayConsume',
  'episodeId',
  'learnerLevel',
  'smokeScope',
  'summary',
  'obstacles',
];

const ALLOWED_TOP_LEVEL_FIELDS = new Set(REQUIRED_TOP_LEVEL_FIELDS);

const FORBIDDEN_TOP_LEVEL_FIELDS = [
  'frozenStatus',
  'runtimePromotionRequired',
  'sourceReviewResultsPath',
  'sourceReviewReportPath',
  'sourceDraftPath',
  'reviewResultsInputKind',
  'frozenSource',
  'reviewedAt',
  'reviewer',
  'reviewNotes',
];

const COMMON_RUNTIME_FIELDS = [
  'obstacleId',
  'type',
  'subtitleIndex',
  'startTime',
  'endTime',
  'source_en',
  'source_zh',
  'text',
  'markerStart',
  'markerEnd',
  'decisionSource',
  'confidence',
];

const VOCABULARY_FIELDS = [
  'word',
  'lemma',
  'phonetic',
  'partOfSpeech',
  'sentenceMeaning',
  'translation',
  'difficultyLevel',
  'difficultyEvidence',
];

const COMPREHENSION_FIELDS = [
  'phrase',
  'literal',
  'actual',
  'grammar',
  'explanationWhy',
  'transferableUsage',
  'comprehensionCategory',
];

const FORBIDDEN_OBSTACLE_FIELDS = [
  'reviewDecision',
  'humanDecision',
  'reviewStatus',
  'reviewer',
  'reviewedAt',
  'reviewNotes',
  'frozenAt',
  'frozenSource',
  'provenance',
  'runtimePromotionRequired',
];

function hasOwn(object, field) {
  return Object.prototype.hasOwnProperty.call(object, field);
}

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
    try {
      if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
    } catch (cleanupError) {
      error.message = `${error.message}; additionally failed to remove temporary file ${temporaryPath}: ${cleanupError.message}`;
    }

    throw error;
  }
}

function requireObject(value, label, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${label} must be a JSON object.`);
    return false;
  }

  return true;
}

function validateFrozenInput(frozen) {
  const errors = [];

  if (!requireObject(frozen, 'Frozen root', errors)) {
    return errors;
  }

  if (frozen.schemaVersion !== FROZEN_SCHEMA_VERSION) {
    errors.push(`Frozen schemaVersion must be ${JSON.stringify(FROZEN_SCHEMA_VERSION)}; found ${JSON.stringify(frozen.schemaVersion)}.`);
  }

  if (frozen.frozenStatus !== 'frozen_pilot') {
    errors.push(`Frozen frozenStatus must be "frozen_pilot"; found ${JSON.stringify(frozen.frozenStatus)}.`);
  }

  if (frozen.runtimeMayConsume !== false) {
    errors.push(`Frozen runtimeMayConsume must be false; found ${JSON.stringify(frozen.runtimeMayConsume)}.`);
  }

  if (frozen.runtimePromotionRequired !== true) {
    errors.push(`Frozen runtimePromotionRequired must be true; found ${JSON.stringify(frozen.runtimePromotionRequired)}.`);
  }

  if (!Array.isArray(frozen.obstacles)) {
    errors.push('Frozen obstacles must be an array.');
  }

  return errors;
}

function copyFields(source, fields) {
  const target = {};

  for (const field of fields) {
    if (hasOwn(source, field)) {
      target[field] = source[field];
    }
  }

  return target;
}

function buildRuntimeObstacle(frozenObstacle) {
  const typeSpecificFields = frozenObstacle.type === 'vocabulary' ? VOCABULARY_FIELDS : COMPREHENSION_FIELDS;
  return {
    ...copyFields(frozenObstacle, COMMON_RUNTIME_FIELDS),
    ...copyFields(frozenObstacle, typeSpecificFields),
  };
}

function validateFrozenObstaclesAndBuildRuntime(frozenObstacles) {
  const errors = [];
  const runtimeObstacles = [];
  let rejectedCount = 0;
  let skippedCount = 0;

  frozenObstacles.forEach((obstacle, index) => {
    const label = `obstacles[${index}]`;

    if (!requireObject(obstacle, label, errors)) {
      skippedCount += 1;
      return;
    }

    if (obstacle.humanDecision === 'pending') {
      errors.push(`${label} obstacleId ${JSON.stringify(obstacle.obstacleId)} has pending humanDecision; runtime promotion requires completed decisions.`);
      return;
    }

    if (obstacle.reviewStatus !== 'approved') {
      errors.push(`${label} obstacleId ${JSON.stringify(obstacle.obstacleId)} reviewStatus must be "approved"; found ${JSON.stringify(obstacle.reviewStatus)}.`);
      return;
    }

    if (obstacle.humanDecision === 'rejected') {
      rejectedCount += 1;
      return;
    }

    if (obstacle.humanDecision !== 'approved') {
      errors.push(`${label} obstacleId ${JSON.stringify(obstacle.obstacleId)} humanDecision must be "approved", "rejected", or "pending"; found ${JSON.stringify(obstacle.humanDecision)}.`);
      return;
    }

    runtimeObstacles.push(buildRuntimeObstacle(obstacle));
  });

  return { errors, runtimeObstacles, rejectedCount, skippedCount };
}

function validateAllowedKeys(object, allowedFields, label, errors) {
  for (const field of Object.keys(object)) {
    if (!allowedFields.has(field)) {
      errors.push(`${label} contains disallowed field ${JSON.stringify(field)}.`);
    }
  }
}

function validateRequiredFields(object, requiredFields, label, errors) {
  for (const field of requiredFields) {
    if (!hasOwn(object, field) || object[field] === undefined) {
      errors.push(`${label} is missing required field ${JSON.stringify(field)}.`);
    }
  }
}

function validateRuntimeObstacle(obstacle, index, errors) {
  const label = `runtime obstacles[${index}]`;

  if (!requireObject(obstacle, label, errors)) return;

  for (const field of FORBIDDEN_OBSTACLE_FIELDS) {
    if (hasOwn(obstacle, field)) {
      errors.push(`${label} obstacleId ${JSON.stringify(obstacle.obstacleId)} contains forbidden field ${JSON.stringify(field)}.`);
    }
  }

  if (obstacle.type !== 'vocabulary' && obstacle.type !== 'comprehension') {
    errors.push(`${label} obstacleId ${JSON.stringify(obstacle.obstacleId)} type must be "vocabulary" or "comprehension"; found ${JSON.stringify(obstacle.type)}.`);
    return;
  }

  const typeSpecificFields = obstacle.type === 'vocabulary' ? VOCABULARY_FIELDS : COMPREHENSION_FIELDS;
  validateAllowedKeys(obstacle, new Set([...COMMON_RUNTIME_FIELDS, ...typeSpecificFields]), label, errors);
  validateRequiredFields(obstacle, COMMON_RUNTIME_FIELDS, label, errors);
  validateRequiredFields(obstacle, typeSpecificFields, label, errors);

  if (typeof obstacle.source_en !== 'string') {
    errors.push(`${label} obstacleId ${JSON.stringify(obstacle.obstacleId)} source_en must be a string.`);
    return;
  }

  if (!Number.isInteger(obstacle.markerStart) || !Number.isInteger(obstacle.markerEnd)) {
    errors.push(`${label} obstacleId ${JSON.stringify(obstacle.obstacleId)} markerStart and markerEnd must be integers.`);
    return;
  }

  if (!(0 <= obstacle.markerStart && obstacle.markerStart < obstacle.markerEnd && obstacle.markerEnd <= obstacle.source_en.length)) {
    errors.push(`${label} obstacleId ${JSON.stringify(obstacle.obstacleId)} has invalid marker bounds: 0 <= markerStart < markerEnd <= source_en.length required; markerStart=${JSON.stringify(obstacle.markerStart)}, markerEnd=${JSON.stringify(obstacle.markerEnd)}, source_en.length=${obstacle.source_en.length}.`);
  }
}

function validateRuntimeOutput(runtimeOutput) {
  const errors = [];

  validateAllowedKeys(runtimeOutput, ALLOWED_TOP_LEVEL_FIELDS, 'Runtime output root', errors);
  validateRequiredFields(runtimeOutput, REQUIRED_TOP_LEVEL_FIELDS, 'Runtime output root', errors);

  for (const field of FORBIDDEN_TOP_LEVEL_FIELDS) {
    if (hasOwn(runtimeOutput, field)) {
      errors.push(`Runtime output root contains forbidden field ${JSON.stringify(field)}.`);
    }
  }

  if (runtimeOutput.schemaVersion !== RUNTIME_SCHEMA_VERSION) {
    errors.push(`Runtime schemaVersion must be ${JSON.stringify(RUNTIME_SCHEMA_VERSION)}; found ${JSON.stringify(runtimeOutput.schemaVersion)}.`);
  }

  if (runtimeOutput.sourceFrozenPath !== SOURCE_FROZEN_PATH) {
    errors.push(`Runtime sourceFrozenPath must be ${JSON.stringify(SOURCE_FROZEN_PATH)}; found ${JSON.stringify(runtimeOutput.sourceFrozenPath)}.`);
  }

  if (runtimeOutput.runtimeMayConsume !== true) {
    errors.push(`Runtime runtimeMayConsume must be true; found ${JSON.stringify(runtimeOutput.runtimeMayConsume)}.`);
  }

  if (!Array.isArray(runtimeOutput.obstacles)) {
    errors.push('Runtime obstacles must be an array.');
  } else {
    runtimeOutput.obstacles.forEach((obstacle, index) => validateRuntimeObstacle(obstacle, index, errors));
  }

  return errors;
}

function buildRuntimeOutput(frozen, runtimeObstacles, rejectedCount, skippedCount) {
  return {
    schemaVersion: RUNTIME_SCHEMA_VERSION,
    sourceFrozenPath: SOURCE_FROZEN_PATH,
    generatedAt: new Date().toISOString(),
    runtimeMayConsume: true,
    episodeId: frozen.episodeId,
    learnerLevel: frozen.learnerLevel,
    smokeScope: frozen.smokeScope,
    summary: {
      totalFrozenObstacles: frozen.obstacles.length,
      promotedCount: runtimeObstacles.length,
      rejectedCount,
      skippedCount,
    },
    obstacles: runtimeObstacles,
  };
}

function main() {
  const frozen = readJson(SOURCE_FROZEN_PATH_ABSOLUTE, SOURCE_FROZEN_PATH);
  const frozenErrors = validateFrozenInput(frozen);
  if (frozenErrors.length > 0) {
    throw new Error(`Runtime pilot obstacle promotion validation failed for ${SOURCE_FROZEN_PATH}:\n- ${frozenErrors.join('\n- ')}`);
  }

  const promotionResult = validateFrozenObstaclesAndBuildRuntime(frozen.obstacles);
  if (promotionResult.errors.length > 0) {
    throw new Error(`Runtime pilot obstacle promotion validation failed for frozen obstacles:\n- ${promotionResult.errors.join('\n- ')}`);
  }

  const runtimeOutput = buildRuntimeOutput(
    frozen,
    promotionResult.runtimeObstacles,
    promotionResult.rejectedCount,
    promotionResult.skippedCount
  );
  const runtimeErrors = validateRuntimeOutput(runtimeOutput);
  if (runtimeErrors.length > 0) {
    throw new Error(`Runtime pilot obstacle output validation failed; refusing to write ${OUTPUT_PATH}:\n- ${runtimeErrors.join('\n- ')}`);
  }

  writeJsonAtomic(OUTPUT_PATH_ABSOLUTE, runtimeOutput);
  console.log('P0-4A-5 runtime pilot obstacles generated.');
}

try {
  main();
} catch (error) {
  console.error(`P0-4A-5 runtime pilot obstacle promotion failed: ${error.message}`);
  process.exit(1);
}
