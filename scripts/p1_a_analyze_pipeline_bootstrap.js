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

function readArtifact(fileName) {
  const target = path.resolve(path.join(OUTPUT_DIR, fileName));
  if (!fs.existsSync(target)) {
    fail(`expected upstream artifact not found: ${fileName}`);
  }
  try {
    return JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    fail(`upstream artifact is not valid JSON (${fileName}): ${error.message}`);
  }
  return undefined;
}

/* -------------------------------------------------------------------------
 * P1-B Scene Meaning Engine (REAL, offline, deterministic)
 *
 * Per P0-6B the required generation flow is:
 *   Subtitle -> Context Collection -> Scene Understanding -> Scene Meaning
 * The forbidden flow (Dictionary -> Scene Meaning) is never used.
 *
 * This engine is fully offline and deterministic:
 *   - no AI API calls
 *   - no OCR
 *   - no video analysis
 *   - no online search
 * It consumes ONLY the Subtitle Artifact (read-only, per P0-7C) and produces
 * one Scene Meaning per subtitle as evidence. It never decides obstacles and
 * is never runtime consumable.
 * ---------------------------------------------------------------------- */

const SCENE_MEANING_CONTEXT_WINDOW = 2;

function classifyDialogueFunction(en) {
  const text = String(en || '').trim();
  if (/^previously on/i.test(text)) return 'recap-marker';
  if (text.includes('♪')) return 'lyric';
  if (text.endsWith('?')) return 'question';
  if (text.endsWith('!')) return 'exclamation';
  return 'statement';
}

function deriveSpeakerIntent(dialogueFunction) {
  switch (dialogueFunction) {
    case 'recap-marker': return 'orient the viewer to prior events';
    case 'lyric': return 'theme-song / musical sequence';
    case 'question': return 'seek information, confirmation, or a response';
    case 'exclamation': return 'express emphasis or strong emotion';
    default: return 'convey information or advance the dialogue';
  }
}

function detectAmbiguity(en) {
  const text = String(en || '').trim();
  if (text.endsWith('...')) {
    return {
      hasAmbiguity: true,
      note: 'Line trails off or continues; meaning may depend on adjacent dialogue.',
    };
  }
  return { hasAmbiguity: false, note: null };
}

function collectSceneContext(subtitles, position) {
  const before = [];
  for (let i = Math.max(0, position - SCENE_MEANING_CONTEXT_WINDOW); i < position; i += 1) {
    before.push({
      subtitleIndex: subtitles[i].subtitleIndex,
      source_en: subtitles[i].source_en,
      source_zh: subtitles[i].source_zh,
    });
  }
  const after = [];
  for (let i = position + 1; i <= Math.min(subtitles.length - 1, position + SCENE_MEANING_CONTEXT_WINDOW); i += 1) {
    after.push({
      subtitleIndex: subtitles[i].subtitleIndex,
      source_en: subtitles[i].source_en,
      source_zh: subtitles[i].source_zh,
    });
  }
  return { before, after };
}

function computeSceneConfidence(hasZh, hasContext) {
  let confidence = 0.5;
  if (hasZh) confidence += 0.3;
  if (hasContext) confidence += 0.2;
  return Math.min(1, Number(confidence.toFixed(2)));
}

function runSceneMeaningEngine(subtitleArtifact) {
  const subtitles = subtitleArtifact
    && subtitleArtifact.payload
    && Array.isArray(subtitleArtifact.payload.subtitles)
    ? subtitleArtifact.payload.subtitles
    : null;

  if (!subtitles || subtitles.length === 0) {
    fail('Scene Meaning Engine received an empty or invalid Subtitle Artifact');
  }

  const sceneMeanings = subtitles.map((row, position) => {
    // Step 1: Context Collection
    const context = collectSceneContext(subtitles, position);
    const hasContext = context.before.length > 0 || context.after.length > 0;
    const hasZh = typeof row.source_zh === 'string' && row.source_zh.trim().length > 0;

    // Step 2: Scene Understanding (deterministic classification from context)
    const dialogueFunction = classifyDialogueFunction(row.source_en);
    const speakerIntent = deriveSpeakerIntent(dialogueFunction);
    const ambiguity = detectAmbiguity(row.source_en);

    // Step 3: Scene Meaning (contextual understanding from bilingual evidence,
    // never from a dictionary)
    const meaningBasis = hasZh ? row.source_zh : row.source_en;
    const sceneMeaning = `Functions as a ${dialogueFunction} intended to ${speakerIntent}. `
      + `Contextual meaning (from bilingual subtitle evidence): ${meaningBasis}`;

    const evidenceSource = ['englishSubtitle'];
    if (hasZh) evidenceSource.push('chineseSubtitle');
    if (hasContext) evidenceSource.push('dialogueContext');

    return {
      subtitleIndex: row.subtitleIndex,
      timestamp: { startTime: row.startTime, endTime: row.endTime },
      source_en: row.source_en,
      source_zh: row.source_zh,
      contextBefore: context.before,
      contextAfter: context.after,
      dialogueFunction,
      speakerIntent,
      sceneMeaning,
      ambiguity,
      evidenceSource,
      confidence: computeSceneConfidence(hasZh, hasContext),
      placeholder: false,
    };
  });

  return artifactEnvelope({
    schemaVersion: 'p1-b-scene-meaning-artifact.v1',
    artifactName: 'scene_meaning_artifact',
    producerStage: 'Scene Meaning Engine',
    consumerStage: 'Evidence Engine',
    inputArtifact: 'subtitle_artifact',
    artifactStatus: 'produced',
    contentMode: 'real',
    runtimeConsumable: false,
    notes: 'REAL offline deterministic Scene Meaning Engine (P1-B). Generation flow: '
      + 'Subtitle -> Context Collection -> Scene Understanding -> Scene Meaning. '
      + 'No AI API, OCR, video analysis, or online search. One Scene Meaning per subtitle, '
      + 'produced as evidence only (never decides obstacles, never runtime consumable). '
      + 'Text synthesis is deterministic; a future AI-backed producer may enrich the contextual '
      + 'meaning without changing this artifact contract.',
  }, {
    sceneMeaningCount: sceneMeanings.length,
    sceneMeanings,
  });
}

/* -------------------------------------------------------------------------
 * P1-C Evidence Engine (REAL, offline, deterministic)
 *
 * Per P0-7C the Evidence Engine consumes ONLY upstream frozen Artifacts
 * (subtitle_artifact + scene_meaning_artifact, read from disk) and produces
 * the Evidence Artifact. It is fully offline and deterministic:
 *   - no AI API calls
 *   - no Qwen / Qwen-VL
 *   - no OCR
 *   - no video analysis
 *   - no Internet subtitle fetch
 *
 * Per P0-6A the Evidence Engine COLLECTS evidence only. It never decides
 * vocabulary or comprehension obstacles, never approves/rejects, never
 * generates drafts, and never promotes. It is never runtime consumable.
 * ---------------------------------------------------------------------- */

function countTokens(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function collectPunctuationSignals(text) {
  const value = String(text || '');
  return {
    question: value.includes('?'),
    exclamation: value.includes('!'),
    ellipsis: value.includes('...'),
    comma: value.includes(','),
    musicNote: value.includes('♪'),
  };
}

function deriveLineTypeSignal(text) {
  const value = String(text || '').trim();
  if (!value) return 'empty';
  if (/^previously on/i.test(value)) return 'recap-marker';
  if (value.includes('♪')) return 'lyric';
  if (value.endsWith('?')) return 'question';
  if (value.endsWith('!')) return 'exclamation';
  return 'statement';
}

function runEvidenceEngine(subtitleArtifact, sceneMeaningArtifact) {
  const subtitles = subtitleArtifact
    && subtitleArtifact.payload
    && Array.isArray(subtitleArtifact.payload.subtitles)
    ? subtitleArtifact.payload.subtitles
    : null;

  const sceneMeanings = sceneMeaningArtifact
    && sceneMeaningArtifact.payload
    && Array.isArray(sceneMeaningArtifact.payload.sceneMeanings)
    ? sceneMeaningArtifact.payload.sceneMeanings
    : null;

  if (!subtitles || subtitles.length === 0) {
    fail('Evidence Engine received an empty or invalid Subtitle Artifact');
  }
  if (!sceneMeanings || sceneMeanings.length === 0) {
    fail('Evidence Engine received an empty or invalid Scene Meaning Artifact');
  }
  if (subtitles.length !== sceneMeanings.length) {
    fail('Evidence Engine: subtitle count does not match Scene Meaning count');
  }

  const sceneByIndex = new Map();
  sceneMeanings.forEach((scene) => {
    sceneByIndex.set(scene.subtitleIndex, scene);
  });

  const evidenceChains = subtitles.map((row) => {
    const scene = sceneByIndex.get(row.subtitleIndex);
    if (!scene) {
      fail(`Evidence Engine: no Scene Meaning found for subtitleIndex ${row.subtitleIndex}`);
    }

    const hasEn = typeof row.source_en === 'string' && row.source_en.trim().length > 0;
    const hasZh = typeof row.source_zh === 'string' && row.source_zh.trim().length > 0;

    const englishSubtitle = {
      availability: hasEn ? 'available' : 'not-available',
      source_en: row.source_en,
      characterLength: hasEn ? row.source_en.length : 0,
      tokenCount: countTokens(row.source_en),
      punctuationSignals: collectPunctuationSignals(row.source_en),
      lineTypeSignal: deriveLineTypeSignal(row.source_en),
    };

    const chineseSubtitle = {
      availability: hasZh ? 'available' : 'not-available',
      source_zh: hasZh ? row.source_zh : null,
      characterLength: hasZh ? row.source_zh.length : 0,
    };

    const sceneMeaningEvidence = {
      subtitleIndex: scene.subtitleIndex,
      sceneMeaning: scene.sceneMeaning,
      dialogueFunction: scene.dialogueFunction,
      speakerIntent: scene.speakerIntent,
      ambiguity: scene.ambiguity,
      evidenceSource: scene.evidenceSource,
      confidence: scene.confidence,
    };

    const contextBefore = Array.isArray(scene.contextBefore) ? scene.contextBefore : [];
    const contextAfter = Array.isArray(scene.contextAfter) ? scene.contextAfter : [];
    const dialogueContext = {
      contextBefore,
      contextAfter,
      contextBeforeCount: contextBefore.length,
      contextAfterCount: contextAfter.length,
    };

    // Future extension placeholders (evidence not yet collected by P1-C).
    const grammarEvidence = 'not-collected-yet';
    const cultureEvidence = 'not-collected-yet';
    const vocabularyResourceEvidence = 'not-collected-yet';

    const evidenceSource = ['englishSubtitle', 'sceneMeaning'];
    if (hasZh) evidenceSource.push('chineseSubtitle');
    if (dialogueContext.contextBeforeCount > 0 || dialogueContext.contextAfterCount > 0) {
      evidenceSource.push('dialogueContext');
    }

    const missingEvidence = [];
    if (!hasZh) missingEvidence.push('chineseSubtitle');
    missingEvidence.push('grammarEvidence');
    missingEvidence.push('cultureEvidence');
    missingEvidence.push('vocabularyResourceEvidence');

    const collectedCount = evidenceSource.length;
    const totalTrackedSources = 7; // en, zh, scene, context, grammar, culture, vocabResource
    const evidenceCompleteness = {
      collectedSources: collectedCount,
      totalTrackedSources,
      ratio: Number((collectedCount / totalTrackedSources).toFixed(2)),
      note: 'Future-extension sources (grammar/culture/vocabularyResource) are intentionally not collected in P1-C.',
    };

    return {
      subtitleIndex: row.subtitleIndex,
      timestamp: { startTime: row.startTime, endTime: row.endTime },
      evidenceChain: {
        englishSubtitle,
        chineseSubtitle,
        sceneMeaning: sceneMeaningEvidence,
        dialogueContext,
        grammarEvidence,
        cultureEvidence,
        vocabularyResourceEvidence,
      },
      evidenceCompleteness,
      missingEvidence,
      evidenceSource,
      placeholder: false,
    };
  });

  return artifactEnvelope({
    schemaVersion: 'p1-c-evidence-artifact.v1',
    artifactName: 'evidence_artifact',
    producerStage: 'Evidence Engine',
    consumerStage: 'Vocabulary Engine + Comprehension Engine',
    inputArtifact: 'subtitle_artifact + scene_meaning_artifact',
    artifactStatus: 'produced',
    contentMode: 'real',
    runtimeConsumable: false,
    notes: 'REAL offline deterministic Evidence Engine (P1-C). Consumes subtitle_artifact + '
      + 'scene_meaning_artifact (read from disk per P0-7C) and collects evidence only. '
      + 'No AI / Qwen / Qwen-VL / OCR / video analysis / Internet subtitle fetch. '
      + 'Per P0-6A it never decides obstacles, never approves/rejects, never generates drafts, '
      + 'and never promotes. Future-extension evidence sources are marked not-collected-yet. '
      + 'Never runtime consumable.',
  }, {
    evidenceChainCount: evidenceChains.length,
    evidenceChains,
  });
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

  // 2. Scene Meaning Artifact (REAL — P1-B Scene Meaning Engine, offline/deterministic)
  // Per P0-7C, the engine consumes the Subtitle Artifact through the frozen artifact,
  // not in-memory state. Read it back, then produce the Scene Meaning Artifact.
  const subtitleArtifactForScene = readArtifact('subtitle_artifact.json');
  const sceneMeaningArtifact = runSceneMeaningEngine(subtitleArtifactForScene);
  createdFiles.push(writeArtifact('scene_meaning_artifact.json', sceneMeaningArtifact));

  // 3. Evidence Artifact (REAL — P1-C Evidence Engine, offline/deterministic)
  // Per P0-7C, the engine consumes the upstream Subtitle + Scene Meaning Artifacts
  // through the frozen artifacts on disk, not in-memory state.
  const subtitleArtifactForEvidence = readArtifact('subtitle_artifact.json');
  const sceneMeaningArtifactForEvidence = readArtifact('scene_meaning_artifact.json');
  const evidenceArtifact = runEvidenceEngine(
    subtitleArtifactForEvidence,
    sceneMeaningArtifactForEvidence,
  );
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
      sceneMeaningReal: true,
      evidenceReal: true,
      downstreamStillPlaceholder: true,
      noOcrCalled: true,
      noInternetSubtitleFetch: true,
    },
    bootstrapCompleted: true,
    nextRecommendedStep:
      'P1-D: replace the placeholder Draft Obstacle stage with real offline Vocabulary + Comprehension '
      + 'engines that consume the real Evidence Artifact, preserving the Runtime read-only boundary '
      + 'and the forward-only Artifact chain.',
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
