#!/usr/bin/env node

/**
 * P1-A First End-to-End Analyze Pipeline Bootstrap
 *
 * This is a bootstrap WIRING test for the Analyze Pipeline architecture frozen by:
 *   - docs/P0_7A_PIPELINE_SKELETON_FREEZE.md   (stage order)
 *   - docs/P0_7B_ARTIFACT_PIPELINE_FREEZE.md   (artifact chain)
 *   - docs/P0_7C_ENGINE_INTEGRATION_FREEZE.md  (engine collaboration)
 *   - docs/P0_7D_PIPELINE_CONSTITUTION_FREEZE.md (supreme law)
 *
 * It reads the EXISTING TBBT S12E01 bilingual subtitle data already stored in
 * the repository and produces placeholder-but-structured pipeline artifacts.
 *
 * IT DOES NOT:
 *   - call AI APIs
 *   - OCR or extract subtitles from video
 *   - search online or invent subtitle text
 *   - generate real Scene Meaning / Vocabulary / Comprehension analysis
 *   - promote anything to real Runtime
 *   - set runtimeMayConsume true for production Runtime
 *   - modify any existing Runtime / frozen / UI / production file
 *
 * Forward-only Artifact chain (P0-7B):
 *   Subtitle -> Scene Meaning -> Evidence -> Draft Obstacle -> Review
 *            -> Frozen Candidate -> Runtime Candidate
 */

const fs = require('fs');
const path = require('path');

const STAGE = 'P1-A';
const EPISODE_ID = 'tbbt-s12e01';
const LEARNER_LEVEL = 'CET-4';

const SOURCE_PATH = 'output_text/v28d_bilingual_subtitles.json';
const OUTPUT_DIR = 'output_text/p1_a';

// Fixed small P1-A scope: first ~30 subtitle entries OR ~first 2 minutes.
const MAX_SUBTITLE_ENTRIES = 30;
const MAX_SCOPE_SECONDS = 120; // ~00:02:00

const START_FIELDS = ['startTime', 'start', 'timeStart'];
const END_FIELDS = ['endTime', 'end', 'timeEnd'];
const ENGLISH_FIELDS = ['source_en', 'en', 'english', 'text_en', 'text'];
const CHINESE_FIELDS = ['source_zh', 'zh', 'chinese', 'text_zh'];

function fail(message) {
  throw new Error(`${STAGE} bootstrap failed: ${message}`);
}

function pickField(row, fieldNames) {
  for (const fieldName of fieldNames) {
    if (
      Object.prototype.hasOwnProperty.call(row, fieldName)
      && row[fieldName] !== null
      && row[fieldName] !== undefined
    ) {
      return row[fieldName];
    }
  }
  return undefined;
}

function parseTimeToSeconds(value, label) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    fail(`${label} must be a string or finite number`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    fail(`${label} must not be empty`);
  }
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  const parts = trimmed.split(':');
  if (parts.length === 2 || parts.length === 3) {
    const numericParts = parts.map((part) => Number(part));
    if (numericParts.every((part) => Number.isFinite(part))) {
      if (parts.length === 2) {
        return numericParts[0] * 60 + numericParts[1];
      }
      return numericParts[0] * 3600 + numericParts[1] * 60 + numericParts[2];
    }
  }
  fail(`${label} has an unrecognized time format: ${value}`);
  return undefined;
}

function readSubtitleSource() {
  const absolute = path.resolve(SOURCE_PATH);
  if (!fs.existsSync(absolute)) {
    fail(`subtitle source not found at ${SOURCE_PATH}`);
  }
  const raw = fs.readFileSync(absolute, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(`subtitle source is not valid JSON: ${error.message}`);
  }
  const rows = Array.isArray(parsed) ? parsed : parsed.subtitles;
  if (!Array.isArray(rows) || rows.length === 0) {
    fail('subtitle source did not contain a non-empty subtitles array');
  }
  return rows;
}

function buildScopedSubtitles(rows) {
  const scoped = [];
  for (let index = 0; index < rows.length; index += 1) {
    if (scoped.length >= MAX_SUBTITLE_ENTRIES) {
      break;
    }
    const row = rows[index];
    const startRaw = pickField(row, START_FIELDS);
    const endRaw = pickField(row, END_FIELDS);
    const en = pickField(row, ENGLISH_FIELDS);
    const zh = pickField(row, CHINESE_FIELDS);

    if (typeof en !== 'string' || !en.trim()) {
      fail(`subtitle row ${index} is missing English text`);
    }

    const startSeconds = parseTimeToSeconds(startRaw, `subtitle row ${index} start`);
    const endSeconds = parseTimeToSeconds(endRaw, `subtitle row ${index} end`);

    // Stop once the row begins beyond the fixed time scope.
    if (startSeconds > MAX_SCOPE_SECONDS) {
      break;
    }

    scoped.push({
      subtitleIndex: index,
      startTime: String(startRaw),
      endTime: String(endRaw),
      startSeconds,
      endSeconds,
      source_en: en,
      source_zh: typeof zh === 'string' ? zh : null,
    });
  }

  if (scoped.length === 0) {
    fail('no subtitle rows fell within the fixed P1-A scope');
  }
  return scoped;
}

function artifactEnvelope(meta, payload) {
  return {
    schemaVersion: meta.schemaVersion,
    stage: STAGE,
    artifactName: meta.artifactName,
    episodeId: EPISODE_ID,
    learnerLevel: LEARNER_LEVEL,
    producerStage: meta.producerStage,
    consumerStage: meta.consumerStage,
    inputArtifact: meta.inputArtifact,
    outputArtifact: meta.artifactName,
    artifactStatus: meta.artifactStatus, // produced
    contentMode: meta.contentMode, // placeholder | real
    runtimeConsumable: meta.runtimeConsumable, // boolean
    notes: meta.notes,
    payload,
  };
}

function writeArtifact(fileName, artifact) {
  const target = path.join(OUTPUT_DIR, fileName);
  fs.writeFileSync(path.resolve(target), `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return target.replace(/\\/g, '/');
}

function main() {
  const sourceRows = readSubtitleSource();
  const scoped = buildScopedSubtitles(sourceRows);

  fs.mkdirSync(path.resolve(OUTPUT_DIR), { recursive: true });

  const createdFiles = [];

  // 1. Subtitle Artifact
  const subtitleArtifact = artifactEnvelope({
    schemaVersion: 'p1-a-subtitle-artifact.v1',
    artifactName: 'subtitle_artifact',
    producerStage: 'Subtitle Input',
    consumerStage: 'Scene Meaning Engine',
    inputArtifact: SOURCE_PATH,
    artifactStatus: 'produced',
    contentMode: 'real',
    runtimeConsumable: false,
    notes: 'Scoped subtitle input derived from existing bilingual subtitle data. Forward-only chain head.',
  }, {
    sourcePath: SOURCE_PATH,
    scope: {
      maxSubtitleEntries: MAX_SUBTITLE_ENTRIES,
      maxScopeSeconds: MAX_SCOPE_SECONDS,
      appliedEntryCount: scoped.length,
    },
    subtitles: scoped.map((row) => ({
      subtitleIndex: row.subtitleIndex,
      startTime: row.startTime,
      endTime: row.endTime,
      source_en: row.source_en,
      source_zh: row.source_zh,
    })),
  });
  createdFiles.push(writeArtifact('subtitle_artifact.json', subtitleArtifact));

  // 2. Scene Meaning Artifact (placeholder — P0-6B owns real generation)
  const sceneMeaningArtifact = artifactEnvelope({
    schemaVersion: 'p1-a-scene-meaning-artifact.v1',
    artifactName: 'scene_meaning_artifact',
    producerStage: 'Scene Meaning Engine',
    consumerStage: 'Evidence Engine',
    inputArtifact: 'subtitle_artifact',
    artifactStatus: 'produced',
    contentMode: 'placeholder',
    runtimeConsumable: false,
    notes: 'PLACEHOLDER. Real Scene Meaning generation is owned by P0-6B and not performed in this bootstrap. One Scene Meaning per subtitle.',
  }, {
    sceneMeanings: scoped.map((row) => ({
      subtitleIndex: row.subtitleIndex,
      source_en: row.source_en,
      source_zh: row.source_zh,
      sceneMeaning: null,
      placeholder: true,
    })),
  });
  createdFiles.push(writeArtifact('scene_meaning_artifact.json', sceneMeaningArtifact));

  // 3. Evidence Artifact (placeholder Evidence Chain — P0-6A owns real collection)
  const evidenceArtifact = artifactEnvelope({
    schemaVersion: 'p1-a-evidence-artifact.v1',
    artifactName: 'evidence_artifact',
    producerStage: 'Evidence Engine',
    consumerStage: 'Vocabulary Engine + Comprehension Engine',
    inputArtifact: 'subtitle_artifact + scene_meaning_artifact',
    artifactStatus: 'produced',
    contentMode: 'placeholder',
    runtimeConsumable: false,
    notes: 'PLACEHOLDER Evidence Chain. Real evidence collection/prioritization is owned by P0-6A and not performed in this bootstrap.',
  }, {
    evidenceChains: scoped.map((row) => ({
      subtitleIndex: row.subtitleIndex,
      evidenceChain: {
        frozenContract: 'not-available',
        dictionary: 'not-available',
        pos: 'not-available',
        grammar: 'not-available',
        englishSubtitle: 'checked',
        chineseSubtitle: row.source_zh ? 'checked' : 'not-available',
        sceneMeaning: 'not-available',
        dialogueContext: 'not-available',
      },
      placeholder: true,
    })),
  });
  createdFiles.push(writeArtifact('evidence_artifact.json', evidenceArtifact));

  // 4. Draft Obstacle Artifact (placeholder — no real Vocabulary/Comprehension analysis)
  const draftObstacleArtifact = artifactEnvelope({
    schemaVersion: 'p1-a-draft-obstacle-artifact.v1',
    artifactName: 'draft_obstacle_artifact',
    producerStage: 'Draft Obstacle Assembly (Vocabulary Engine + Comprehension Engine)',
    consumerStage: 'AI Review',
    inputArtifact: 'evidence_artifact + scene_meaning_artifact',
    artifactStatus: 'produced',
    contentMode: 'placeholder',
    runtimeConsumable: false,
    notes: 'PLACEHOLDER. No real Vocabulary or Comprehension analysis performed in this bootstrap. Empty candidate set is intentional.',
  }, {
    draftObstacles: [],
    candidateCount: 0,
    placeholder: true,
  });
  createdFiles.push(writeArtifact('draft_obstacle_artifact.json', draftObstacleArtifact));

  // 5. Review Artifact (placeholder — P0-6A AI Review owns real decisions)
  const reviewArtifact = artifactEnvelope({
    schemaVersion: 'p1-a-review-artifact.v1',
    artifactName: 'review_artifact',
    producerStage: 'AI Review + Human Review',
    consumerStage: 'Frozen Promotion',
    inputArtifact: 'draft_obstacle_artifact',
    artifactStatus: 'produced',
    contentMode: 'placeholder',
    runtimeConsumable: false,
    notes: 'PLACEHOLDER. No real evidence-driven review performed in this bootstrap. No decisions to record because draft is empty.',
  }, {
    reviewedObstacles: [],
    decisionCounts: { frozen: 0, reject: 0, needs_human: 0 },
    placeholder: true,
  });
  createdFiles.push(writeArtifact('review_artifact.json', reviewArtifact));

  // 6. Frozen Candidate Artifact (placeholder — NOT the real frozen artifact)
  const frozenCandidateArtifact = artifactEnvelope({
    schemaVersion: 'p1-a-frozen-candidate-artifact.v1',
    artifactName: 'frozen_candidate_artifact',
    producerStage: 'Frozen Promotion',
    consumerStage: 'Runtime Promotion',
    inputArtifact: 'review_artifact',
    artifactStatus: 'produced',
    contentMode: 'placeholder',
    runtimeConsumable: false,
    notes: 'PLACEHOLDER frozen CANDIDATE only. This is a bootstrap wiring artifact and is NOT a real frozen artifact. reviewStatus is not set to frozen.',
  }, {
    reviewStatus: 'bootstrap-placeholder',
    frozenObstacles: [],
    placeholder: true,
  });
  createdFiles.push(writeArtifact('frozen_candidate_artifact.json', frozenCandidateArtifact));

  // 7. Runtime Candidate Artifact (placeholder — explicitly NOT runtime consumable)
  const runtimeCandidateArtifact = artifactEnvelope({
    schemaVersion: 'p1-a-runtime-candidate-artifact.v1',
    artifactName: 'runtime_candidate_artifact',
    producerStage: 'Runtime Promotion',
    consumerStage: 'Runtime (read-only) — NOT CONNECTED in bootstrap',
    inputArtifact: 'frozen_candidate_artifact',
    artifactStatus: 'produced',
    contentMode: 'placeholder',
    runtimeConsumable: false,
    notes: 'PLACEHOLDER runtime CANDIDATE only. runtimeMayConsume is intentionally false. This bootstrap never promotes to real Runtime and never modifies any existing Runtime artifact.',
  }, {
    runtimeMayConsume: false,
    runtimeObstacles: [],
    placeholder: true,
  });
  createdFiles.push(writeArtifact('runtime_candidate_artifact.json', runtimeCandidateArtifact));

  // 8. Pipeline Bootstrap Report
  const expectedOrder = [
    'subtitle_artifact',
    'scene_meaning_artifact',
    'evidence_artifact',
    'draft_obstacle_artifact',
    'review_artifact',
    'frozen_candidate_artifact',
    'runtime_candidate_artifact',
  ];

  const report = {
    schemaVersion: 'p1-a-pipeline-bootstrap-report.v1',
    stage: STAGE,
    episodeId: EPISODE_ID,
    learnerLevel: LEARNER_LEVEL,
    subtitleSource: SOURCE_PATH,
    usedExistingBilingualSubtitles: true,
    scope: {
      maxSubtitleEntries: MAX_SUBTITLE_ENTRIES,
      maxScopeSeconds: MAX_SCOPE_SECONDS,
      appliedEntryCount: scoped.length,
      firstSubtitleIndex: scoped[0].subtitleIndex,
      lastSubtitleIndex: scoped[scoped.length - 1].subtitleIndex,
    },
    artifactOrder: expectedOrder,
    forwardOnlyOrderPreserved: true,
    artifactsCreated: createdFiles,
    verification: {
      existingBilingualSubtitlesUsed: true,
      fixedScopeApplied: true,
      allExpectedArtifactsCreated: createdFiles.length === expectedOrder.length,
      forwardOnlyOrder: true,
      runtimeUntouched: true,
      noUiFilesModified: true,
      noProductionFilesModified: true,
      noAiApiCalled: true,
      runtimeConsumable: false,
    },
    bootstrapCompleted: true,
    nextRecommendedStep:
      'P1-B: replace placeholder Scene Meaning and Evidence stages with real engine producers (offline only), one stage at a time, preserving Runtime read-only boundary.',
  };
  createdFiles.push(writeArtifact('pipeline_bootstrap_report.json', report));

  // Console summary
  process.stdout.write(`${STAGE} bootstrap completed.\n`);
  process.stdout.write(`Subtitle source: ${SOURCE_PATH}\n`);
  process.stdout.write(`Subtitle entries processed: ${scoped.length}\n`);
  process.stdout.write(`Artifacts created: ${createdFiles.length}\n`);
  createdFiles.forEach((file) => process.stdout.write(`  - ${file}\n`));
  process.stdout.write('Runtime untouched: true | UI untouched: true | runtimeMayConsume: false\n');
}

main();
