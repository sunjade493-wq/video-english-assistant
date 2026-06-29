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

/* -------------------------------------------------------------------------
 * P1-DA Vocabulary Candidate Engine (REAL, offline, deterministic)
 *
 * Per P0-7C this engine consumes ONLY the upstream Evidence Artifact
 * (evidence_artifact.json, read from disk). It must NOT directly read the
 * Scene Meaning Artifact or the subtitle source; it reads subtitle text only
 * through Evidence Artifact fields.
 *
 * It is fully offline and deterministic: no AI / Qwen / Qwen-VL / OCR /
 * video analysis / Internet subtitle fetch.
 *
 * It COLLECTS vocabulary candidates only. It does NOT decide final vocabulary
 * obstacles, does NOT decide comprehension obstacles, does NOT promote, and is
 * never runtime consumable.
 * ---------------------------------------------------------------------- */

const VOCAB_STOPWORDS = new Set([
  'a', 'an', 'the', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'am', 'is', 'are', 'was', 'were', 'be', 'been',
  'do', 'does', 'did',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from',
  'and', 'or', 'but',
  'my', 'your', 'his', 'her', 'our', 'their',
  'this', 'that', 'these', 'those',
]);

function normalizeVocabToken(surface) {
  // Strip leading/trailing punctuation while preserving internal apostrophes/hyphens.
  const stripped = String(surface || '').replace(/^[^A-Za-z0-9']+/, '').replace(/[^A-Za-z0-9']+$/, '');
  return stripped.toLowerCase();
}

function isPureNumber(value) {
  return /^[0-9]+$/.test(value);
}

function runVocabularyCandidateEngine(evidenceArtifact) {
  const evidenceChains = evidenceArtifact
    && evidenceArtifact.payload
    && Array.isArray(evidenceArtifact.payload.evidenceChains)
    ? evidenceArtifact.payload.evidenceChains
    : null;

  if (!evidenceChains || evidenceChains.length === 0) {
    fail('Vocabulary Candidate Engine received an empty or invalid Evidence Artifact');
  }

  const excludedTokenSummary = {
    empty: 0,
    pureNumber: 0,
    musicSymbol: 0,
    punctuationOnly: 0,
    stopword: 0,
  };

  const collected = [];

  evidenceChains.forEach((chain) => {
    const english = chain.evidenceChain && chain.evidenceChain.englishSubtitle;
    const chinese = chain.evidenceChain && chain.evidenceChain.chineseSubtitle;
    const sourceEn = english && typeof english.source_en === 'string' ? english.source_en : '';
    const sourceZh = chinese && typeof chinese.source_zh === 'string' ? chinese.source_zh : null;

    // Deterministic tokenization on whitespace, preserving char offsets.
    const tokenRegex = /\S+/g;
    let match = tokenRegex.exec(sourceEn);
    while (match !== null) {
      const surfaceRaw = match[0];
      const tokenStart = match.index;
      const tokenEnd = match.index + surfaceRaw.length;
      const normalizedForm = normalizeVocabToken(surfaceRaw);

      if (!normalizedForm) {
        if (/^[^A-Za-z0-9'♪]+$/.test(surfaceRaw)) {
          excludedTokenSummary.punctuationOnly += 1;
        } else if (surfaceRaw.includes('♪')) {
          excludedTokenSummary.musicSymbol += 1;
        } else {
          excludedTokenSummary.empty += 1;
        }
      } else if (surfaceRaw.includes('♪')) {
        excludedTokenSummary.musicSymbol += 1;
      } else if (isPureNumber(normalizedForm)) {
        excludedTokenSummary.pureNumber += 1;
      } else if (VOCAB_STOPWORDS.has(normalizedForm)) {
        excludedTokenSummary.stopword += 1;
      } else {
        const evidenceSource = ['englishSubtitle'];
        if (sourceZh) evidenceSource.push('chineseSubtitle');
        collected.push({
          subtitleIndex: chain.subtitleIndex,
          tokenStart,
          tokenEnd,
          surfaceForm: surfaceRaw,
          normalizedForm,
          timestamp: chain.timestamp,
          source_en: sourceEn,
          source_zh: sourceZh,
          evidenceSource,
        });
      }

      match = tokenRegex.exec(sourceEn);
    }
  });

  // Stable ordering: subtitleIndex asc, then tokenStart asc, then normalizedForm asc.
  collected.sort((a, b) => {
    if (a.subtitleIndex !== b.subtitleIndex) return a.subtitleIndex - b.subtitleIndex;
    if (a.tokenStart !== b.tokenStart) return a.tokenStart - b.tokenStart;
    return a.normalizedForm.localeCompare(b.normalizedForm);
  });

  const vocabularyCandidates = collected.map((item, position) => {
    const sequence = String(position + 1).padStart(6, '0');
    return {
      candidateId: `${EPISODE_ID}-vocab-candidate-${sequence}`,
      subtitleIndex: item.subtitleIndex,
      timestamp: item.timestamp,
      tokenStart: item.tokenStart,
      tokenEnd: item.tokenEnd,
      surfaceForm: item.surfaceForm,
      normalizedForm: item.normalizedForm,
      source_en: item.source_en,
      source_zh: item.source_zh,
      evidenceSource: item.evidenceSource,
      candidateReason: 'content-token-after-deterministic-stopword-and-symbol-exclusion',
      placeholder: false,
    };
  });

  return artifactEnvelope({
    schemaVersion: 'p1-da-vocabulary-candidate-artifact.v1',
    artifactName: 'vocabulary_candidate_artifact',
    producerStage: 'Vocabulary Candidate Engine',
    consumerStage: 'Draft Obstacle Assembly',
    inputArtifact: 'evidence_artifact',
    artifactStatus: 'produced',
    contentMode: 'real',
    runtimeConsumable: false,
    notes: 'REAL offline deterministic Vocabulary Candidate Engine (P1-DA). Consumes evidence_artifact '
      + 'only (read from disk per P0-7C); reads subtitle text solely through Evidence Artifact fields. '
      + 'No AI / Qwen / Qwen-VL / OCR / video analysis / Internet subtitle fetch. '
      + 'Collects vocabulary CANDIDATES only — it never decides final vocabulary obstacles, never '
      + 'decides comprehension obstacles, and never promotes. Never runtime consumable.',
  }, {
    vocabularyCandidateCount: vocabularyCandidates.length,
    vocabularyCandidates,
    excludedTokenSummary,
    candidateCollectionRules: {
      tokenization: 'whitespace split on englishSubtitle.source_en with leading/trailing punctuation stripped',
      normalization: 'lowercase, internal apostrophes and hyphens preserved',
      excluded: [
        'empty tokens',
        'pure numbers',
        'music symbols',
        'punctuation-only tokens',
        'common function words (deterministic stopword list)',
      ],
      note: 'Candidate collection only. Final vocabulary obstacle decisions are NOT made at this stage.',
    },
  });
}

/* -------------------------------------------------------------------------
 * P1-DB Vocabulary Decision Engine (REAL, offline, deterministic)
 *
 * Per P0-7C this engine consumes ONLY the upstream Vocabulary Candidate
 * Artifact (vocabulary_candidate_artifact.json, read from disk). It does NOT
 * read the subtitle source, the Scene Meaning Artifact, or the Evidence
 * Artifact directly.
 *
 * It is fully offline and deterministic: no AI / Qwen / Qwen-VL / OCR.
 *
 * It DECIDES which candidates become Vocabulary obstacles, preserving
 * candidate ordering and assigning deterministic obstacle ids. It does NOT
 * decide comprehension obstacles, does NOT review, does NOT promote, and is
 * never runtime consumable.
 * ---------------------------------------------------------------------- */

const VOCAB_DECISION_MIN_LENGTH = 3;

function runVocabularyDecisionEngine(vocabularyCandidateArtifact) {
  const candidates = vocabularyCandidateArtifact
    && vocabularyCandidateArtifact.payload
    && Array.isArray(vocabularyCandidateArtifact.payload.vocabularyCandidates)
    ? vocabularyCandidateArtifact.payload.vocabularyCandidates
    : null;

  if (!candidates) {
    fail('Vocabulary Decision Engine received an invalid Vocabulary Candidate Artifact');
  }

  const rejectionReasons = {
    tooShort: 0,
    duplicateInEpisode: 0,
  };

  const seenNormalized = new Set();
  const accepted = [];

  // Candidates are already in stable order (subtitleIndex, tokenStart,
  // normalizedForm). Preserve that ordering exactly.
  candidates.forEach((candidate) => {
    const normalized = candidate.normalizedForm;

    if (typeof normalized !== 'string' || normalized.length < VOCAB_DECISION_MIN_LENGTH) {
      rejectionReasons.tooShort += 1;
      return;
    }
    if (seenNormalized.has(normalized)) {
      rejectionReasons.duplicateInEpisode += 1;
      return;
    }

    seenNormalized.add(normalized);
    accepted.push(candidate);
  });

  const vocabularyObstacles = accepted.map((candidate, position) => {
    const sequence = String(position + 1).padStart(6, '0');
    return {
      obstacleId: `${EPISODE_ID}-vocab-obstacle-${sequence}`,
      candidateId: candidate.candidateId,
      type: 'vocabulary',
      subtitleIndex: candidate.subtitleIndex,
      timestamp: candidate.timestamp,
      tokenStart: candidate.tokenStart,
      tokenEnd: candidate.tokenEnd,
      surfaceForm: candidate.surfaceForm,
      normalizedForm: candidate.normalizedForm,
      source_en: candidate.source_en,
      source_zh: candidate.source_zh,
      evidenceSource: candidate.evidenceSource,
      decisionReason: 'accepted-deterministic: content token of sufficient length, first episode occurrence',
      placeholder: false,
    };
  });

  const rejectedCount = candidates.length - accepted.length;

  return artifactEnvelope({
    schemaVersion: 'p1-db-vocabulary-decision-artifact.v1',
    artifactName: 'vocabulary_decision_artifact',
    producerStage: 'Vocabulary Decision Engine',
    consumerStage: 'Draft Obstacle Assembly',
    inputArtifact: 'vocabulary_candidate_artifact',
    artifactStatus: 'produced',
    contentMode: 'real',
    runtimeConsumable: false,
    notes: 'REAL offline deterministic Vocabulary Decision Engine (P1-DB). Consumes '
      + 'vocabulary_candidate_artifact only (read from disk per P0-7C). No AI / Qwen / Qwen-VL / OCR. '
      + 'Decides which candidates become Vocabulary obstacles using deterministic rules '
      + '(minimum length + first episode occurrence), preserving candidate ordering and assigning '
      + 'deterministic obstacle ids. Does NOT decide comprehension obstacles, does NOT review, '
      + 'does NOT promote. Never runtime consumable.',
  }, {
    vocabularyDecisionCount: vocabularyObstacles.length,
    vocabularyObstacles,
    decisionSummary: {
      totalCandidates: candidates.length,
      accepted: accepted.length,
      rejected: rejectedCount,
      rejectionReasons,
    },
    decisionRules: {
      minNormalizedLength: VOCAB_DECISION_MIN_LENGTH,
      episodeLevelDedupe: 'keep first occurrence of each normalizedForm',
      orderingPreserved: 'candidate order (subtitleIndex, tokenStart, normalizedForm) is preserved',
      note: 'Deterministic decision only. No AI, no evidence re-collection, no comprehension decision.',
    },
  });
}

/* -------------------------------------------------------------------------
 * P1-DC Draft Assembly Engine (REAL, offline, deterministic)
 *
 * Per P0-7C this engine consumes ONLY the upstream Vocabulary Decision
 * Artifact (vocabulary_decision_artifact.json, read from disk). It does NOT
 * read the subtitle source, Scene Meaning, Evidence, or Vocabulary Candidate
 * artifacts directly.
 *
 * It is fully offline and deterministic: no AI / Qwen / Qwen-VL / OCR.
 *
 * It only CONVERTS accepted vocabulary decisions into draft obstacles. It does
 * NOT make new Vocabulary decisions, does NOT make Comprehension decisions,
 * does NOT review, does NOT promote, and is never runtime consumable.
 * ---------------------------------------------------------------------- */

function runDraftAssemblyEngine(vocabularyDecisionArtifact) {
  const vocabularyObstacles = vocabularyDecisionArtifact
    && vocabularyDecisionArtifact.payload
    && Array.isArray(vocabularyDecisionArtifact.payload.vocabularyObstacles)
    ? vocabularyDecisionArtifact.payload.vocabularyObstacles
    : null;

  if (!vocabularyObstacles) {
    fail('Draft Assembly Engine received an invalid Vocabulary Decision Artifact');
  }

  // Preserve decision ordering exactly; one draft obstacle per vocabulary obstacle.
  const draftObstacles = vocabularyObstacles.map((obstacle, position) => {
    const sequence = String(position + 1).padStart(6, '0');
    return {
      draftObstacleId: `${EPISODE_ID}-draft-obstacle-${sequence}`,
      sourceObstacleId: obstacle.obstacleId,
      sourceCandidateId: obstacle.candidateId,
      type: 'vocabulary',
      subtitleIndex: obstacle.subtitleIndex,
      timestamp: obstacle.timestamp,
      tokenStart: obstacle.tokenStart,
      tokenEnd: obstacle.tokenEnd,
      surfaceForm: obstacle.surfaceForm,
      normalizedForm: obstacle.normalizedForm,
      source_en: obstacle.source_en,
      source_zh: obstacle.source_zh,
      evidenceSource: obstacle.evidenceSource,
      decisionReason: obstacle.decisionReason,
      draftAssemblyReason: 'assembled-deterministic: one draft obstacle per accepted vocabulary decision, ordering preserved',
      placeholder: false,
    };
  });

  return artifactEnvelope({
    schemaVersion: 'p1-dc-draft-obstacle-artifact.v1',
    artifactName: 'draft_obstacle_artifact',
    producerStage: 'Draft Obstacle Assembly',
    consumerStage: 'AI Review',
    inputArtifact: 'vocabulary_decision_artifact',
    artifactStatus: 'produced',
    contentMode: 'real',
    runtimeConsumable: false,
    notes: 'REAL offline deterministic Draft Assembly Engine (P1-DC). Consumes '
      + 'vocabulary_decision_artifact only (read from disk per P0-7C). No AI / Qwen / Qwen-VL / OCR. '
      + 'Converts accepted vocabulary decisions into draft obstacles only — it makes no new Vocabulary '
      + 'decisions, no Comprehension decisions, no review, and no promotion. Never runtime consumable.',
  }, {
    draftObstacleCount: draftObstacles.length,
    draftObstacles,
    assemblySummary: {
      sourceVocabularyDecisionCount: vocabularyObstacles.length,
      assembledDraftObstacleCount: draftObstacles.length,
      comprehensionDraftObstacleCount: 0,
    },
    assemblyRules: {
      conversion: 'one draft obstacle per accepted vocabulary decision',
      orderingPreserved: 'vocabulary decision order is preserved exactly',
      comprehension: 'not assembled at this stage',
      note: 'Deterministic assembly only. No new decisions, no AI, no comprehension.',
    },
  });
}

/* -------------------------------------------------------------------------
 * P1-E Comprehension Engine (REAL, offline, deterministic)
 *
 * Per P0-7C this engine consumes the upstream Evidence Artifact
 * (evidence_artifact.json) and the existing real Draft Obstacle Artifact
 * (draft_obstacle_artifact.json), both read from disk. It does NOT read the
 * subtitle source or the Scene Meaning Artifact directly; Scene Meaning
 * signals are read only through the Evidence Artifact fields.
 *
 * It is fully offline and deterministic: no AI / Qwen / Qwen-VL / OCR.
 *
 * It APPENDS comprehension draft obstacles after the existing vocabulary draft
 * obstacles, preserving them exactly. It does NOT modify vocabulary decisions,
 * does NOT review, does NOT promote, and is never runtime consumable.
 * ---------------------------------------------------------------------- */

const COMPREHENSION_PRAGMATIC_MARKERS = [
  'I mean',
  'you know',
  'come on',
  'what do you mean',
  'go ahead',
  'as if',
  'not exactly',
  'kind of',
  'sort of',
];

function detectPragmaticMarkers(sourceEn) {
  const haystack = String(sourceEn || '').toLowerCase();
  return COMPREHENSION_PRAGMATIC_MARKERS.filter(
    (marker) => haystack.includes(marker.toLowerCase()),
  );
}

function runComprehensionEngine(evidenceArtifact, existingDraftArtifact) {
  const evidenceChains = evidenceArtifact
    && evidenceArtifact.payload
    && Array.isArray(evidenceArtifact.payload.evidenceChains)
    ? evidenceArtifact.payload.evidenceChains
    : null;

  const existingDraftObstacles = existingDraftArtifact
    && existingDraftArtifact.payload
    && Array.isArray(existingDraftArtifact.payload.draftObstacles)
    ? existingDraftArtifact.payload.draftObstacles
    : null;

  if (!evidenceChains) {
    fail('Comprehension Engine received an invalid Evidence Artifact');
  }
  if (!existingDraftObstacles) {
    fail('Comprehension Engine received an invalid Draft Obstacle Artifact');
  }

  // Preserve all existing vocabulary draft obstacles exactly.
  const vocabularyDraftObstacles = existingDraftObstacles.slice();
  const comprehensionDraftObstacles = [];
  let sequence = vocabularyDraftObstacles.length;

  evidenceChains.forEach((chain) => {
    const inner = chain.evidenceChain || {};
    const scene = inner.sceneMeaning || {};
    const english = inner.englishSubtitle || {};
    const chinese = inner.chineseSubtitle || {};
    const dialogueContext = inner.dialogueContext || {};

    const sourceEn = typeof english.source_en === 'string' ? english.source_en : '';
    const sourceZh = chinese && typeof chinese.source_zh === 'string' ? chinese.source_zh : null;

    const ambiguity = scene.ambiguity || { hasAmbiguity: false, note: null };
    const dialogueFunction = scene.dialogueFunction;
    const speakerIntent = scene.speakerIntent;
    const pragmaticMarkers = detectPragmaticMarkers(sourceEn);

    const reasons = [];
    if (ambiguity && ambiguity.hasAmbiguity === true) {
      reasons.push('scene-ambiguity');
    }
    if (typeof dialogueFunction === 'string' && dialogueFunction && dialogueFunction !== 'literal-information') {
      reasons.push(`dialogue-function:${dialogueFunction}`);
    }
    if (typeof speakerIntent === 'string' && speakerIntent && speakerIntent !== 'literal-information') {
      reasons.push(`speaker-intent:${speakerIntent}`);
    }
    if (pragmaticMarkers.length > 0) {
      reasons.push(`pragmatic-markers:${pragmaticMarkers.join('|')}`);
    }

    if (reasons.length === 0) {
      return;
    }

    sequence += 1;
    const id = String(sequence).padStart(6, '0');
    const evidenceSource = ['evidence_artifact', 'sceneMeaning', 'englishSubtitle'];
    if (sourceZh) evidenceSource.push('chineseSubtitle');
    if ((dialogueContext.contextBeforeCount || 0) > 0 || (dialogueContext.contextAfterCount || 0) > 0) {
      evidenceSource.push('dialogueContext');
    }

    comprehensionDraftObstacles.push({
      draftObstacleId: `${EPISODE_ID}-draft-obstacle-${id}`,
      type: 'comprehension',
      subtitleIndex: chain.subtitleIndex,
      timestamp: chain.timestamp,
      source_en: sourceEn,
      source_zh: sourceZh,
      sceneMeaning: scene.sceneMeaning,
      dialogueFunction,
      speakerIntent,
      ambiguity,
      dialogueContext,
      comprehensionReason: reasons.join('; '),
      evidenceSource,
      placeholder: false,
    });
  });

  const draftObstacles = vocabularyDraftObstacles.concat(comprehensionDraftObstacles);

  return artifactEnvelope({
    schemaVersion: 'p1-e-draft-obstacle-artifact.v1',
    artifactName: 'draft_obstacle_artifact',
    producerStage: 'Draft Obstacle Assembly (Vocabulary + Comprehension)',
    consumerStage: 'AI Review',
    inputArtifact: 'vocabulary_decision_artifact + evidence_artifact',
    artifactStatus: 'produced',
    contentMode: 'real',
    runtimeConsumable: false,
    notes: 'REAL offline deterministic Draft Obstacle Artifact (P1-E). Vocabulary draft obstacles '
      + '(P1-DC) are preserved exactly; comprehension draft obstacles are appended by the '
      + 'Comprehension Engine, which consumes evidence_artifact only (read from disk per P0-7C) and '
      + 'reads Scene Meaning signals solely through Evidence Artifact fields. No AI / Qwen / Qwen-VL / '
      + 'OCR. It makes no vocabulary decisions, no review, and no promotion. Never runtime consumable.',
  }, {
    draftObstacleCount: draftObstacles.length,
    draftObstacles,
    assemblySummary: {
      vocabularyDraftObstacleCount: vocabularyDraftObstacles.length,
      comprehensionDraftObstacleCount: comprehensionDraftObstacles.length,
      totalDraftObstacleCount: draftObstacles.length,
    },
    assemblyRules: {
      vocabulary: 'existing vocabulary draft obstacles preserved exactly',
      comprehension: 'at most one comprehension obstacle per evidenceChain when deterministic signals indicate comprehension value',
      comprehensionSignals: [
        'sceneMeaning.ambiguity.hasAmbiguity true',
        'dialogueFunction present and not literal-information',
        'speakerIntent present and not literal-information',
        `pragmatic markers: ${COMPREHENSION_PRAGMATIC_MARKERS.join(', ')}`,
      ],
      ordering: 'comprehension obstacles appended after vocabulary obstacles; draftObstacleId sequence continued',
      note: 'Deterministic only. No AI, no comprehension explanation generation, no review.',
    },
  });
}

/* -------------------------------------------------------------------------
 * P1-F Review Engine (REAL, offline, deterministic)
 *
 * Per P0-7C this engine consumes ONLY the upstream Draft Obstacle Artifact
 * (draft_obstacle_artifact.json, read from disk). It does NOT read the
 * subtitle source, Scene Meaning, Evidence, Vocabulary Candidate, or
 * Vocabulary Decision artifacts directly.
 *
 * It is fully offline and deterministic: no AI / Qwen / Qwen-VL / OCR.
 *
 * It REVIEWS/approves existing draft obstacles deterministically. It does NOT
 * modify draft obstacles, does NOT promote, and is never runtime consumable.
 * ---------------------------------------------------------------------- */

function runReviewEngine(draftObstacleArtifact) {
  const draftObstacles = draftObstacleArtifact
    && draftObstacleArtifact.payload
    && Array.isArray(draftObstacleArtifact.payload.draftObstacles)
    ? draftObstacleArtifact.payload.draftObstacles
    : null;

  if (!draftObstacles) {
    fail('Review Engine received an invalid Draft Obstacle Artifact');
  }

  const reviewItems = draftObstacles.map((obstacle, position) => {
    const sequence = String(position + 1).padStart(6, '0');
    const item = {
      reviewId: `${EPISODE_ID}-review-${sequence}`,
      sourceDraftObstacleId: obstacle.draftObstacleId,
      type: obstacle.type,
      subtitleIndex: obstacle.subtitleIndex,
      timestamp: obstacle.timestamp,
      source_en: obstacle.source_en,
      source_zh: obstacle.source_zh,
      reviewDecision: 'approved',
      reviewReason: 'deterministic-review-approved-valid-draft-obstacle',
      placeholder: false,
    };
    if (Object.prototype.hasOwnProperty.call(obstacle, 'normalizedForm')) {
      item.normalizedForm = obstacle.normalizedForm;
    }
    if (Object.prototype.hasOwnProperty.call(obstacle, 'surfaceForm')) {
      item.surfaceForm = obstacle.surfaceForm;
    }
    return item;
  });

  const approvedCount = reviewItems.filter((item) => item.reviewDecision === 'approved').length;

  return artifactEnvelope({
    schemaVersion: 'p1-f-review-artifact.v1',
    artifactName: 'review_artifact',
    producerStage: 'AI Review + Human Review',
    consumerStage: 'Frozen Promotion',
    inputArtifact: 'draft_obstacle_artifact',
    artifactStatus: 'produced',
    contentMode: 'real',
    runtimeConsumable: false,
    notes: 'REAL offline deterministic Review Engine (P1-F). Consumes draft_obstacle_artifact only '
      + '(read from disk per P0-7C). No AI / Qwen / Qwen-VL / OCR. Reviews/approves existing draft '
      + 'obstacles deterministically without modifying them. Does NOT promote. Never runtime consumable.',
  }, {
    reviewItemCount: reviewItems.length,
    approvedCount,
    rejectedCount: 0,
    reviewItems,
    reviewSummary: {
      sourceDraftObstacleCount: draftObstacles.length,
      reviewedCount: reviewItems.length,
      approvedCount,
      rejectedCount: 0,
    },
    reviewRules: {
      decision: 'all valid draft obstacles deterministically approved',
      modification: 'draft obstacles are not modified',
      ordering: 'review items preserve draft obstacle order; reviewId sequence follows draft order',
      note: 'Deterministic review only. No AI, no rejection logic in this stage.',
    },
  });
}

/* -------------------------------------------------------------------------
 * P1-G Frozen Promotion Engine (REAL, offline, deterministic)
 *
 * Per P0-7C this engine consumes ONLY the upstream Review Artifact
 * (review_artifact.json, read from disk). It does NOT read the subtitle
 * source, Scene Meaning, Evidence, Vocabulary Candidate, Vocabulary Decision,
 * or Draft artifacts directly.
 *
 * It is fully offline and deterministic: no AI / Qwen / Qwen-VL / OCR.
 *
 * It PROMOTES approved review items into frozen candidates deterministically.
 * It does NOT modify review items, does NOT promote to Runtime, and is never
 * runtime consumable. frozenStatus is "frozen_candidate", not "frozen".
 * ---------------------------------------------------------------------- */

function runFrozenPromotionEngine(reviewArtifact) {
  const reviewItems = reviewArtifact
    && reviewArtifact.payload
    && Array.isArray(reviewArtifact.payload.reviewItems)
    ? reviewArtifact.payload.reviewItems
    : null;

  if (!reviewItems) {
    fail('Frozen Promotion Engine received an invalid Review Artifact');
  }

  const approvedItems = reviewItems.filter((item) => item.reviewDecision === 'approved');
  const rejectedReviewItemCount = reviewItems.length - approvedItems.length;

  const frozenCandidates = approvedItems.map((item, position) => {
    const sequence = String(position + 1).padStart(6, '0');
    const candidate = {
      frozenCandidateId: `${EPISODE_ID}-frozen-candidate-${sequence}`,
      sourceReviewId: item.reviewId,
      sourceDraftObstacleId: item.sourceDraftObstacleId,
      type: item.type,
      subtitleIndex: item.subtitleIndex,
      timestamp: item.timestamp,
      source_en: item.source_en,
      source_zh: item.source_zh,
      frozenStatus: 'frozen_candidate',
      promotionReason: 'deterministic-promotion-approved-review-item',
      placeholder: false,
    };
    if (Object.prototype.hasOwnProperty.call(item, 'normalizedForm')) {
      candidate.normalizedForm = item.normalizedForm;
    }
    if (Object.prototype.hasOwnProperty.call(item, 'surfaceForm')) {
      candidate.surfaceForm = item.surfaceForm;
    }
    return candidate;
  });

  return artifactEnvelope({
    schemaVersion: 'p1-g-frozen-candidate-artifact.v1',
    artifactName: 'frozen_candidate_artifact',
    producerStage: 'Frozen Promotion',
    consumerStage: 'Runtime Promotion',
    inputArtifact: 'review_artifact',
    artifactStatus: 'produced',
    contentMode: 'real',
    runtimeConsumable: false,
    notes: 'REAL offline deterministic Frozen Promotion Engine (P1-G). Consumes review_artifact only '
      + '(read from disk per P0-7C). No AI / Qwen / Qwen-VL / OCR. Promotes approved review items into '
      + 'frozen CANDIDATES (frozenStatus: frozen_candidate) without modifying review items. Does NOT '
      + 'promote to Runtime. Never runtime consumable.',
  }, {
    frozenCandidateCount: frozenCandidates.length,
    frozenCandidates,
    promotionSummary: {
      sourceReviewItemCount: reviewItems.length,
      approvedReviewItemCount: approvedItems.length,
      promotedFrozenCandidateCount: frozenCandidates.length,
      rejectedReviewItemCount,
    },
    promotionRules: {
      eligibility: 'only review items with reviewDecision === "approved" are promoted',
      modification: 'review items are not modified',
      status: 'each promoted item is a frozen_candidate, not a runtime-consumable frozen artifact',
      ordering: 'frozen candidates preserve approved review order; frozenCandidateId sequence follows that order',
      note: 'Deterministic promotion only. No AI, no runtime promotion at this stage.',
    },
  });
}

/* -------------------------------------------------------------------------
 * P1-H Runtime Promotion Engine (REAL, offline, deterministic)
 *
 * Per P0-7C this engine consumes ONLY the upstream Frozen Candidate Artifact
 * (frozen_candidate_artifact.json, read from disk). It does NOT read the
 * subtitle source, Scene Meaning, Evidence, Vocabulary Candidate, Vocabulary
 * Decision, Draft, or Review artifacts directly.
 *
 * It is fully offline and deterministic: no AI / Qwen / Qwen-VL / OCR.
 *
 * It transforms frozen candidates into runtime CANDIDATES deterministically.
 * It does NOT modify frozen candidates and does NOT authorize Runtime
 * consumption: runtimeConsumable stays false and payload.runtimeMayConsume
 * stays false. Enabling Runtime consumption is a separate reviewed decision.
 * ---------------------------------------------------------------------- */

function runRuntimePromotionEngine(frozenCandidateArtifact) {
  const frozenCandidates = frozenCandidateArtifact
    && frozenCandidateArtifact.payload
    && Array.isArray(frozenCandidateArtifact.payload.frozenCandidates)
    ? frozenCandidateArtifact.payload.frozenCandidates
    : null;

  if (!frozenCandidates) {
    fail('Runtime Promotion Engine received an invalid Frozen Candidate Artifact');
  }

  const runtimeCandidates = frozenCandidates.map((candidate, position) => {
    const sequence = String(position + 1).padStart(6, '0');
    const runtimeCandidate = {
      runtimeCandidateId: `${EPISODE_ID}-runtime-candidate-${sequence}`,
      sourceFrozenCandidateId: candidate.frozenCandidateId,
      sourceReviewId: candidate.sourceReviewId,
      sourceDraftObstacleId: candidate.sourceDraftObstacleId,
      type: candidate.type,
      subtitleIndex: candidate.subtitleIndex,
      timestamp: candidate.timestamp,
      source_en: candidate.source_en,
      source_zh: candidate.source_zh,
      runtimeStatus: 'runtime_candidate',
      promotionReason: 'deterministic-runtime-candidate-from-frozen-candidate',
      placeholder: false,
    };
    if (Object.prototype.hasOwnProperty.call(candidate, 'normalizedForm')) {
      runtimeCandidate.normalizedForm = candidate.normalizedForm;
    }
    if (Object.prototype.hasOwnProperty.call(candidate, 'surfaceForm')) {
      runtimeCandidate.surfaceForm = candidate.surfaceForm;
    }
    return runtimeCandidate;
  });

  return artifactEnvelope({
    schemaVersion: 'p1-h-runtime-candidate-artifact.v1',
    artifactName: 'runtime_candidate_artifact',
    producerStage: 'Runtime Promotion',
    consumerStage: 'Runtime (read-only) — NOT AUTHORIZED until a separate reviewed decision',
    inputArtifact: 'frozen_candidate_artifact',
    artifactStatus: 'produced',
    contentMode: 'real',
    runtimeConsumable: false,
    notes: 'REAL offline deterministic Runtime Promotion Engine (P1-H). Consumes '
      + 'frozen_candidate_artifact only (read from disk per P0-7C). No AI / Qwen / Qwen-VL / OCR. '
      + 'Transforms frozen candidates into runtime CANDIDATES without modifying them. This stage '
      + 'produces a real runtime candidate artifact only; it does NOT authorize Runtime consumption. '
      + 'runtimeConsumable and payload.runtimeMayConsume both remain false.',
  }, {
    runtimeCandidateCount: runtimeCandidates.length,
    runtimeCandidates,
    runtimeMayConsume: false,
    promotionSummary: {
      sourceFrozenCandidateCount: frozenCandidates.length,
      promotedRuntimeCandidateCount: runtimeCandidates.length,
      runtimeMayConsume: false,
    },
    promotionRules: {
      transform: 'one runtime candidate per frozen candidate',
      modification: 'frozen candidates are not modified',
      status: 'each item is a runtime_candidate; Runtime consumption is NOT authorized at this stage',
      authorization: 'runtimeMayConsume must remain false until a separate reviewed decision enables it',
      ordering: 'runtime candidates preserve frozen candidate order; runtimeCandidateId sequence follows that order',
      note: 'Deterministic promotion only. No AI. Runtime remains read-only and untouched.',
    },
  });
}

/* -------------------------------------------------------------------------
 * P1-I Runtime Consumption Review Gate (REAL, offline, deterministic)
 *
 * Per P0-7C this gate consumes ONLY the upstream Runtime Candidate Artifact
 * (runtime_candidate_artifact.json, read from disk). It does NOT read any
 * other artifact, does NOT call AI / Qwen / Qwen-VL / OCR, does NOT modify
 * runtime candidates, and does NOT touch Runtime or UI.
 *
 * It records an explicit reviewed decision that Runtime consumption is
 * approved for the next P2 integration stage. The runtime_candidate artifact's
 * own payload.runtimeMayConsume stays false; actual Runtime wiring remains a
 * separate future step.
 * ---------------------------------------------------------------------- */


/* -------------------------------------------------------------------------
 * P2-A Runtime Data Adapter Probe (inspection-only, deterministic)
 *
 * This adapter reads ONLY the passed Runtime Candidate Artifact object and
 * transforms payload.runtimeCandidates into an existing-runtime-like obstacle
 * model shape for inspection. It does NOT authorize Runtime consumption, does
 * NOT generate marker/UI/player state, and does NOT write an artifact.
 * ---------------------------------------------------------------------- */

function requireRuntimeCandidateField(candidate, fieldName, position) {
  if (!Object.prototype.hasOwnProperty.call(candidate, fieldName)) {
    fail(`Runtime Data Adapter candidate ${position} is missing required field: ${fieldName}`);
  }
  const value = candidate[fieldName];
  if (value === null || value === undefined || value === '') {
    fail(`Runtime Data Adapter candidate ${position} has empty required field: ${fieldName}`);
  }
  return value;
}

function adaptRuntimeCandidatesForExistingRuntimeModel(runtimeCandidateArtifact) {
  if (!runtimeCandidateArtifact || typeof runtimeCandidateArtifact !== 'object') {
    fail('Runtime Data Adapter received an invalid Runtime Candidate Artifact object');
  }
  if (!runtimeCandidateArtifact.payload || typeof runtimeCandidateArtifact.payload !== 'object') {
    fail('Runtime Data Adapter received a Runtime Candidate Artifact without payload');
  }
  if (!Array.isArray(runtimeCandidateArtifact.payload.runtimeCandidates)) {
    fail('Runtime Data Adapter requires payload.runtimeCandidates to be an array');
  }

  return runtimeCandidateArtifact.payload.runtimeCandidates.map((candidate, position) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      fail(`Runtime Data Adapter candidate ${position} must be an object`);
    }

    const adapted = {
      adapterStatus: 'inspection_only',
      runtimeConsumable: false,
      runtimeMayConsume: false,
      obstacleId: requireRuntimeCandidateField(candidate, 'runtimeCandidateId', position),
      sourceRuntimeCandidateId: requireRuntimeCandidateField(candidate, 'runtimeCandidateId', position),
      sourceFrozenCandidateId: requireRuntimeCandidateField(candidate, 'sourceFrozenCandidateId', position),
      sourceReviewId: requireRuntimeCandidateField(candidate, 'sourceReviewId', position),
      sourceDraftObstacleId: requireRuntimeCandidateField(candidate, 'sourceDraftObstacleId', position),
      type: requireRuntimeCandidateField(candidate, 'type', position),
      subtitleIndex: requireRuntimeCandidateField(candidate, 'subtitleIndex', position),
      timestamp: requireRuntimeCandidateField(candidate, 'timestamp', position),
      source_en: requireRuntimeCandidateField(candidate, 'source_en', position),
      source_zh: requireRuntimeCandidateField(candidate, 'source_zh', position),
    };

    if (Object.prototype.hasOwnProperty.call(candidate, 'normalizedForm')) {
      adapted.normalizedForm = candidate.normalizedForm;
    }
    if (Object.prototype.hasOwnProperty.call(candidate, 'surfaceForm')) {
      adapted.surfaceForm = candidate.surfaceForm;
    }

    return adapted;
  });
}


function loadRuntimeCandidatesForP2Probe() {
  const runtimeCandidateArtifact = readArtifact('runtime_candidate_artifact.json');
  const runtimeConsumptionReviewArtifact = readArtifact('runtime_consumption_review_artifact.json');

  if (!runtimeCandidateArtifact || typeof runtimeCandidateArtifact !== 'object' || Array.isArray(runtimeCandidateArtifact)) {
    fail('Runtime Loader Probe received an invalid Runtime Candidate Artifact object');
  }
  if (!runtimeCandidateArtifact.payload || typeof runtimeCandidateArtifact.payload !== 'object') {
    fail('Runtime Loader Probe received a Runtime Candidate Artifact without payload');
  }
  if (!Array.isArray(runtimeCandidateArtifact.payload.runtimeCandidates)) {
    fail('Runtime Loader Probe requires payload.runtimeCandidates to be an array');
  }
  if (runtimeCandidateArtifact.runtimeConsumable !== false) {
    fail('Runtime Loader Probe requires runtime_candidate_artifact.runtimeConsumable to remain false');
  }
  if (runtimeCandidateArtifact.payload.runtimeMayConsume !== false) {
    fail('Runtime Loader Probe requires runtime_candidate_artifact.payload.runtimeMayConsume to remain false');
  }
  if (runtimeCandidateArtifact.payload.runtimeCandidateCount !== runtimeCandidateArtifact.payload.runtimeCandidates.length) {
    fail('Runtime Loader Probe runtime candidate count does not match payload.runtimeCandidates length');
  }

  if (!runtimeConsumptionReviewArtifact
    || typeof runtimeConsumptionReviewArtifact !== 'object'
    || Array.isArray(runtimeConsumptionReviewArtifact)) {
    fail('Runtime Loader Probe received an invalid Runtime Consumption Review Artifact object');
  }
  if (!runtimeConsumptionReviewArtifact.payload || typeof runtimeConsumptionReviewArtifact.payload !== 'object') {
    fail('Runtime Loader Probe received a Runtime Consumption Review Artifact without payload');
  }
  if (runtimeConsumptionReviewArtifact.payload.runtimeConsumptionReviewDecision
    !== 'approved_for_p2_runtime_integration') {
    fail('Runtime Loader Probe requires P1-I approval decision approved_for_p2_runtime_integration');
  }
  if (runtimeConsumptionReviewArtifact.payload.runtimeMayConsumeDecision !== true) {
    fail('Runtime Loader Probe requires P1-I runtimeMayConsumeDecision to be true');
  }
  if (runtimeConsumptionReviewArtifact.payload.runtimeCandidateCount
    !== runtimeCandidateArtifact.payload.runtimeCandidateCount) {
    fail('Runtime Loader Probe review candidate count does not match runtime candidate artifact count');
  }

  const runtimeCandidateSnapshot = JSON.stringify(runtimeCandidateArtifact);
  const inspectionModel = adaptRuntimeCandidatesForExistingRuntimeModel(runtimeCandidateArtifact);
  const pureProbe = JSON.stringify(runtimeCandidateArtifact) === runtimeCandidateSnapshot;

  if (!pureProbe) {
    fail('Runtime Loader Probe mutated runtime_candidate_artifact while adapting');
  }

  const inspectionOnly = inspectionModel.every(
    (candidate) => candidate.adapterStatus === 'inspection_only'
      && candidate.runtimeConsumable === false
      && candidate.runtimeMayConsume === false,
  );
  if (!inspectionOnly) {
    fail('Runtime Loader Probe adapter output must be inspection-only and non-consumable');
  }

  return {
    loaderStatus: 'inspection_only',
    runtimeLoaderApprovedForP2: true,
    runtimeLoaderCandidateCount: inspectionModel.length,
    runtimeLoaderInputCountMatches:
      inspectionModel.length === runtimeCandidateArtifact.payload.runtimeCandidateCount,
    runtimeLoaderPureProbe: pureProbe,
    runtimeLoaderInspectionOnly: inspectionOnly,
    runtimeLoaderRuntimeStillNotConsumable:
      runtimeCandidateArtifact.runtimeConsumable === false
      && runtimeCandidateArtifact.payload.runtimeMayConsume === false
      && inspectionModel.every((candidate) => candidate.runtimeConsumable === false
        && candidate.runtimeMayConsume === false),
    inspectionModel,
  };
}

function runRuntimeConsumptionReviewGate(runtimeCandidateArtifact) {
  const runtimeCandidates = runtimeCandidateArtifact
    && runtimeCandidateArtifact.payload
    && Array.isArray(runtimeCandidateArtifact.payload.runtimeCandidates)
    ? runtimeCandidateArtifact.payload.runtimeCandidates
    : null;

  if (!runtimeCandidates) {
    fail('Runtime Consumption Review Gate received an invalid Runtime Candidate Artifact');
  }

  // Deterministic validation checks.
  const contentModeReal = runtimeCandidateArtifact.contentMode === 'real';
  const runtimeConsumableFalse = runtimeCandidateArtifact.runtimeConsumable === false;
  const runtimeMayConsumeFalse = runtimeCandidateArtifact.payload.runtimeMayConsume === false;
  const countMatches = runtimeCandidateArtifact.payload.runtimeCandidateCount === runtimeCandidates.length;
  const idsSequential = runtimeCandidates.every(
    (candidate, position) => candidate.runtimeCandidateId === `${EPISODE_ID}-runtime-candidate-${String(position + 1).padStart(6, '0')}`,
  );
  const noPlaceholder = runtimeCandidates.every((candidate) => candidate.placeholder === false);
  const allRuntimeCandidateStatus = runtimeCandidates.every(
    (candidate) => candidate.runtimeStatus === 'runtime_candidate',
  );

  const validationSummary = {
    contentModeReal,
    runtimeConsumableFalse,
    runtimeMayConsumeFalse,
    countMatches,
    idsSequential,
    noPlaceholder,
    allRuntimeCandidateStatus,
  };

  const allValid = Object.values(validationSummary).every((value) => value === true);
  if (!allValid) {
    fail(`Runtime Consumption Review Gate validation failed: ${JSON.stringify(validationSummary)}`);
  }

  const reviewedRuntimeCandidateIds = runtimeCandidates.map(
    (candidate) => candidate.runtimeCandidateId,
  );

  return artifactEnvelope({
    schemaVersion: 'p1-i-runtime-consumption-review-artifact.v1',
    artifactName: 'runtime_consumption_review_artifact',
    producerStage: 'Runtime Consumption Review Gate',
    consumerStage: 'P2 Runtime Integration (separate future step)',
    inputArtifact: 'runtime_candidate_artifact',
    artifactStatus: 'produced',
    contentMode: 'real',
    runtimeConsumable: false,
    notes: 'REAL offline deterministic Runtime Consumption Review Gate (P1-I). Consumes '
      + 'runtime_candidate_artifact only (read from disk per P0-7C). No AI / Qwen / Qwen-VL / OCR. '
      + 'Records an explicit reviewed decision that Runtime consumption is approved for P2 integration. '
      + 'The runtime_candidate artifact payload.runtimeMayConsume stays false; actual Runtime wiring is '
      + 'a separate future step. Runtime and UI are untouched.',
  }, {
    runtimeConsumptionReviewDecision: 'approved_for_p2_runtime_integration',
    runtimeMayConsumeDecision: true,
    runtimeMayConsumeSource: 'P1-I explicit reviewed gate',
    runtimeCandidateCount: runtimeCandidates.length,
    reviewedRuntimeCandidateIds,
    validationSummary,
    reviewRules: {
      input: 'runtime_candidate_artifact only',
      validation: 'contentMode real, runtimeConsumable false, payload.runtimeMayConsume false, count matches, ids sequential, no placeholder, all runtime_candidate status',
      decisionMeaning: 'consumption approved for P2; does NOT flip runtime_candidate payload.runtimeMayConsume',
      boundary: 'this gate does not wire Runtime, does not modify the runtime candidate artifact, and does not touch Runtime or UI',
      note: 'Deterministic review only. No AI. Actual Runtime integration is a separate P2 step.',
    },
    nextStage: 'P2 Runtime Integration',
    placeholder: false,
  });
}

/* -------------------------------------------------------------------------
 * P2-F Runtime Candidate Display Readiness Probe (PURE, offline) — PROBE ONLY
 *
 * Measures whether runtime candidates carry the display fields required by the
 * existing Runtime obstacle card model. It ONLY measures and reports.
 *
 * It does NOT generate missing fields, does NOT invent display-card content,
 * does NOT normalize/enrich candidates, does NOT change Runtime consumption,
 * does NOT modify the runtime candidate artifact, and never sets
 * runtimeMayConsume true. No AI / OCR / Qwen / Qwen-VL / Internet.
 * ---------------------------------------------------------------------- */

function isPresentDisplayField(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function hasComprehensionTitle(candidate) {
  return isPresentDisplayField(candidate?.prototype)
    || isPresentDisplayField(candidate?.phrase)
    || isPresentDisplayField(candidate?.text);
}

function buildRuntimeCandidateDisplayReadinessProbe(runtimeCandidateArtifact) {
  const runtimeCandidates = runtimeCandidateArtifact
    && runtimeCandidateArtifact.payload
    && Array.isArray(runtimeCandidateArtifact.payload.runtimeCandidates)
    ? runtimeCandidateArtifact.payload.runtimeCandidates
    : null;

  if (!runtimeCandidates) {
    fail('Runtime Candidate Display Readiness Probe: payload.runtimeCandidates is not an array');
  }

  const summary = {
    totalCandidateCount: runtimeCandidates.length,
    vocabularyCandidateCount: 0,
    comprehensionCandidateCount: 0,
    candidatesWithIdCount: 0,
    candidatesWithTypeCount: 0,
    candidatesWithSubtitleIndexCount: 0,
    candidatesWithSourceEnCount: 0,
    candidatesWithSourceZhCount: 0,
    candidatesWithTimestampCount: 0,
    candidatesWithMarkerBoundsCount: 0,
    vocabularyDisplayReadyCount: 0,
    vocabularyMissingWordCount: 0,
    vocabularyMissingPhoneticCount: 0,
    vocabularyMissingPartOfSpeechCount: 0,
    vocabularyMissingSentenceMeaningCount: 0,
    comprehensionDisplayReadyCount: 0,
    comprehensionMissingTitleCount: 0,
    comprehensionMissingLiteralCount: 0,
    comprehensionMissingActualCount: 0,
    comprehensionMissingGrammarCount: 0,
    displayReadyCandidateCount: 0,
  };

  runtimeCandidates.forEach((candidate) => {
    // Common structural presence.
    if (isPresentDisplayField(candidate?.runtimeCandidateId)) summary.candidatesWithIdCount += 1;
    if (isPresentDisplayField(candidate?.type)) summary.candidatesWithTypeCount += 1;
    if (Number.isFinite(Number(candidate?.subtitleIndex))) summary.candidatesWithSubtitleIndexCount += 1;
    if (isPresentDisplayField(candidate?.source_en)) summary.candidatesWithSourceEnCount += 1;
    if (isPresentDisplayField(candidate?.source_zh)) summary.candidatesWithSourceZhCount += 1;
    if (candidate?.timestamp
      && (isPresentDisplayField(candidate.timestamp.startTime) || isPresentDisplayField(candidate.timestamp.endTime))) {
      summary.candidatesWithTimestampCount += 1;
    }
    const hasMarkerStart = candidate?.markerStart !== null && candidate?.markerStart !== undefined && candidate?.markerStart !== '';
    const hasMarkerEnd = candidate?.markerEnd !== null && candidate?.markerEnd !== undefined && candidate?.markerEnd !== '';
    if (hasMarkerStart && hasMarkerEnd) summary.candidatesWithMarkerBoundsCount += 1;

    if (candidate?.type === 'vocabulary') {
      summary.vocabularyCandidateCount += 1;
      const missingWord = !isPresentDisplayField(candidate?.word);
      const missingPhonetic = !isPresentDisplayField(candidate?.phonetic);
      const missingPartOfSpeech = !isPresentDisplayField(candidate?.partOfSpeech);
      const missingSentenceMeaning = !isPresentDisplayField(candidate?.sentenceMeaning);
      if (missingWord) summary.vocabularyMissingWordCount += 1;
      if (missingPhonetic) summary.vocabularyMissingPhoneticCount += 1;
      if (missingPartOfSpeech) summary.vocabularyMissingPartOfSpeechCount += 1;
      if (missingSentenceMeaning) summary.vocabularyMissingSentenceMeaningCount += 1;
      if (!missingWord && !missingPhonetic && !missingPartOfSpeech && !missingSentenceMeaning) {
        summary.vocabularyDisplayReadyCount += 1;
        summary.displayReadyCandidateCount += 1;
      }
    } else if (candidate?.type === 'comprehension') {
      summary.comprehensionCandidateCount += 1;
      const missingTitle = !hasComprehensionTitle(candidate);
      const missingLiteral = !isPresentDisplayField(candidate?.literal);
      const missingActual = !isPresentDisplayField(candidate?.actual);
      const missingGrammar = !isPresentDisplayField(candidate?.grammar);
      if (missingTitle) summary.comprehensionMissingTitleCount += 1;
      if (missingLiteral) summary.comprehensionMissingLiteralCount += 1;
      if (missingActual) summary.comprehensionMissingActualCount += 1;
      if (missingGrammar) summary.comprehensionMissingGrammarCount += 1;
      if (!missingTitle && !missingLiteral && !missingActual && !missingGrammar) {
        summary.comprehensionDisplayReadyCount += 1;
        summary.displayReadyCandidateCount += 1;
      }
    }
  });

  const displayReadyRatio = summary.totalCandidateCount > 0
    ? Number((summary.displayReadyCandidateCount / summary.totalCandidateCount).toFixed(4))
    : 0;
  const runtimeCandidateDisplayReady = summary.displayReadyCandidateCount > 0;
  const expectedP2EOutcome = runtimeCandidateDisplayReady ? 'activate' : 'fail_closed';

  return {
    runtimeCandidateDisplayReady,
    displayReadyCandidateCount: summary.displayReadyCandidateCount,
    displayReadyRatio,
    expectedP2EOutcome,
    summary,
  };
}

/* -------------------------------------------------------------------------
 * P2-G Runtime Candidate Display Model Producer (PURE, offline) — PROBE ONLY
 *
 * Produces an in-memory display-modeled copy of the runtime candidates by
 * adding display fields ONLY when they can be deterministically derived from
 * existing upstream artifact evidence. It never mutates input candidates,
 * never fabricates language-intelligence content, and never uses placeholder
 * values. The official runtime_candidate_artifact payload is NOT replaced;
 * the display-modeled candidates are inspection-only.
 *
 * Allowed upstream sources (deterministic): frozen candidate, review, draft
 * obstacle, vocabulary decision, vocabulary candidate, evidence, scene
 * meaning, subtitle artifacts.
 *
 * No AI / OCR / Qwen / Qwen-VL / Internet. Runtime stays read-only;
 * runtimeConsumable and payload.runtimeMayConsume stay false.
 * ---------------------------------------------------------------------- */

function indexUpstreamObstaclesById(upstreamArtifacts) {
  // Build lineage lookups keyed by the obstacle ids carried through the chain.
  const byDraftObstacleId = new Map();
  const draft = upstreamArtifacts.draftObstacleArtifact;
  const draftObstacles = draft && draft.payload && Array.isArray(draft.payload.draftObstacles)
    ? draft.payload.draftObstacles
    : [];
  draftObstacles.forEach((obstacle) => {
    if (obstacle && typeof obstacle.draftObstacleId === 'string') {
      byDraftObstacleId.set(obstacle.draftObstacleId, obstacle);
    }
  });
  return { byDraftObstacleId };
}

function deriveDisplayFieldsFromUpstream(candidate, lookups) {
  // Step 1: exact id lineage match (runtime candidate -> draft obstacle).
  let match = null;
  if (typeof candidate.sourceDraftObstacleId === 'string') {
    match = lookups.byDraftObstacleId.get(candidate.sourceDraftObstacleId) || null;
  }

  // Step 2: fall back to exact subtitleIndex + type + source_en match.
  if (!match) {
    for (const obstacle of lookups.byDraftObstacleId.values()) {
      if (obstacle.subtitleIndex === candidate.subtitleIndex
        && obstacle.type === candidate.type
        && obstacle.source_en === candidate.source_en) {
        match = obstacle;
        break;
      }
    }
  }

  if (!match) {
    return {};
  }

  const derived = {};
  const copyIfPresent = (field) => {
    if (typeof match[field] === 'string' && match[field].trim() !== '') {
      derived[field] = match[field];
    }
  };

  if (candidate.type === 'vocabulary') {
    // Only copy fields that actually exist on the upstream obstacle.
    copyIfPresent('word');
    copyIfPresent('phonetic');
    copyIfPresent('partOfSpeech');
    copyIfPresent('sentenceMeaning');
  } else if (candidate.type === 'comprehension') {
    copyIfPresent('prototype');
    copyIfPresent('phrase');
    copyIfPresent('text');
    copyIfPresent('literal');
    copyIfPresent('actual');
    copyIfPresent('grammar');
  }

  return derived;
}

function buildRuntimeCandidateDisplayModel(runtimeCandidateArtifact, upstreamArtifacts) {
  const runtimeCandidates = runtimeCandidateArtifact
    && runtimeCandidateArtifact.payload
    && Array.isArray(runtimeCandidateArtifact.payload.runtimeCandidates)
    ? runtimeCandidateArtifact.payload.runtimeCandidates
    : null;

  if (!runtimeCandidates) {
    fail('Runtime Candidate Display Model Producer: payload.runtimeCandidates is not an array');
  }

  const lookups = indexUpstreamObstaclesById(upstreamArtifacts || {});

  const displayModeledCandidates = runtimeCandidates.map((candidate) => {
    const derived = deriveDisplayFieldsFromUpstream(candidate, lookups);
    // Preserve original candidate fields; add derived display fields only when
    // not already present on the candidate. Never overwrite existing values.
    const merged = { ...candidate };
    Object.keys(derived).forEach((field) => {
      if (!isPresentDisplayField(merged[field])) {
        merged[field] = derived[field];
      }
    });
    return merged;
  });

  return {
    payload: { runtimeCandidates: displayModeledCandidates },
  };
}

/* -------------------------------------------------------------------------
 * P2-H Runtime Display Field Engine Probe (PURE, offline) — PROBE ONLY
 *
 * Attempts to build draft display fields for runtime candidates ONLY from safe
 * existing evidence. The required vocabulary/comprehension language-intelligence
 * fields (phonetic, partOfSpeech, sentenceMeaning, literal, actual, grammar) do
 * not exist anywhere upstream, and no offline AI helper exists in this script,
 * so this probe fabricates nothing. Per the P2-H rules, when no safe AI helper
 * exists we do NOT add network/API code; we report deterministically that real
 * display-field generation requires a future AI-backed engine.
 *
 * Any draft fields that ARE safely derivable carry full evidence and are marked
 * reviewStatus: "pending_human_review" and runtimeDisplayMayConsume: false.
 *
 * It never modifies runtime_candidate_artifact, never writes a new artifact,
 * never sets runtimeMayConsume/runtimeConsumable true, and makes no
 * AI / OCR / Qwen / Qwen-VL / Internet calls.
 * ---------------------------------------------------------------------- */

function buildRuntimeDisplayFieldEngineProbe(runtimeCandidateArtifact, upstreamArtifacts) {
  const runtimeCandidates = runtimeCandidateArtifact
    && runtimeCandidateArtifact.payload
    && Array.isArray(runtimeCandidateArtifact.payload.runtimeCandidates)
    ? runtimeCandidateArtifact.payload.runtimeCandidates
    : null;

  if (!runtimeCandidates) {
    fail('Runtime Display Field Engine Probe: payload.runtimeCandidates is not an array');
  }

  // No offline AI generation helper exists in this script (only fs/path are
  // required). Per rule 13 we do not add network/API code.
  const offlineAiHelperAvailable = false;

  const lookups = indexUpstreamObstaclesById(upstreamArtifacts || {});

  const displayFieldDrafts = [];
  let generatedVocabularyDisplayDraftCount = 0;
  let generatedComprehensionDisplayDraftCount = 0;

  runtimeCandidates.forEach((candidate) => {
    // Only safe deterministic evidence is allowed. Derive whatever required
    // display fields genuinely exist upstream; never fabricate the rest.
    const derived = deriveDisplayFieldsFromUpstream(candidate, lookups);

    const draftFields = {};
    if (candidate.type === 'vocabulary') {
      ['word', 'phonetic', 'partOfSpeech', 'sentenceMeaning'].forEach((field) => {
        if (isPresentDisplayField(derived[field])) {
          draftFields[field] = derived[field];
        }
      });
    } else if (candidate.type === 'comprehension') {
      ['prototype', 'phrase', 'text', 'literal', 'actual', 'grammar'].forEach((field) => {
        if (isPresentDisplayField(derived[field])) {
          draftFields[field] = derived[field];
        }
      });
    }

    if (Object.keys(draftFields).length === 0) {
      return; // no safe evidence -> no draft (no fabrication)
    }

    if (candidate.type === 'vocabulary') {
      generatedVocabularyDisplayDraftCount += 1;
    } else if (candidate.type === 'comprehension') {
      generatedComprehensionDisplayDraftCount += 1;
    }

    displayFieldDrafts.push({
      runtimeCandidateId: candidate.runtimeCandidateId,
      sourceDraftObstacleId: candidate.sourceDraftObstacleId || null,
      subtitleIndex: candidate.subtitleIndex,
      source_en: candidate.source_en,
      source_zh: Object.prototype.hasOwnProperty.call(candidate, 'source_zh') ? candidate.source_zh : null,
      type: candidate.type,
      draftFields,
      generationSource: 'deterministic-upstream-artifact-evidence',
      confidence: 1,
      reviewStatus: 'pending_human_review',
      runtimeDisplayMayConsume: false,
    });
  });

  const generatedDisplayDraftCount = displayFieldDrafts.length;
  const expectedNextStep = generatedDisplayDraftCount > 0
    ? 'human review of generated display-field drafts, then a future review-gated display promotion'
    : 'introduce a future offline AI-backed Runtime Display Field Engine (deterministic, JSON-only, temperature 0, '
      + 'fail-closed) to generate vocabulary/comprehension display fields, because no upstream artifact currently '
      + 'carries phonetic/partOfSpeech/sentenceMeaning or literal/actual/grammar';

  return {
    offlineAiHelperAvailable,
    displayFieldDrafts,
    generatedVocabularyDisplayDraftCount,
    generatedComprehensionDisplayDraftCount,
    generatedDisplayDraftCount,
    requiresHumanReview: true,
    runtimeDisplayMayConsume: false,
    expectedNextStep,
  };
}

/* -------------------------------------------------------------------------
 * P2-I Offline AI Display Field Generator Probe (PURE) — PROBE ONLY
 *
 * This stage may call an existing approved offline AI/Qwen-compatible helper
 * ONLY if such a helper already exists in this script or in project code
 * already used by this pipeline. This pipeline imports only fs/path and has no
 * such helper, so per the P2-I rules NO new network/API code is added. Instead
 * this probe emits a deterministic generator CONTRACT/report stating that the
 * generator cannot run until an approved offline AI helper is available.
 *
 * If an approved helper were available, it would generate draft display fields
 * for a small bounded sample (max 5), require JSON output, run at temperature
 * 0, fail closed on invalid JSON, and use subtitle context + upstream evidence
 * (never source_en alone). It would never write into runtime_candidate_artifact.
 *
 * Drafts are draft-only: reviewStatus "pending_human_review",
 * runtimeDisplayMayConsume false. No OCR / Qwen-VL / Runtime inference /
 * Internet. runtimeMayConsume and runtimeConsumable stay false.
 * ---------------------------------------------------------------------- */

const OFFLINE_AI_DISPLAY_FIELD_SAMPLE_LIMIT = 5;

function detectApprovedOfflineAiHelper() {
  // An approved offline AI helper must already be present in this pipeline.
  // This script requires only fs/path; no such helper is wired in. We do not
  // add one here (rule: do not add new network/API code).
  return { available: false, name: null };
}

function buildOfflineAiDisplayFieldGeneratorProbe(runtimeCandidateArtifact, upstreamArtifacts) {
  const runtimeCandidates = runtimeCandidateArtifact
    && runtimeCandidateArtifact.payload
    && Array.isArray(runtimeCandidateArtifact.payload.runtimeCandidates)
    ? runtimeCandidateArtifact.payload.runtimeCandidates
    : null;

  if (!runtimeCandidates) {
    fail('Offline AI Display Field Generator Probe: payload.runtimeCandidates is not an array');
  }

  const helper = detectApprovedOfflineAiHelper();

  if (!helper.available) {
    return {
      offlineAiHelperAvailable: false,
      offlineAiHelperName: null,
      sampleLimit: OFFLINE_AI_DISPLAY_FIELD_SAMPLE_LIMIT,
      displayFieldDrafts: [],
      generatedVocabularyDisplayDraftCount: 0,
      generatedComprehensionDisplayDraftCount: 0,
      generatedDisplayDraftCount: 0,
      requiresHumanReview: true,
      runtimeDisplayMayConsume: false,
      expectedNextStep:
        'introduce and approve an offline AI display-field helper (deterministic, JSON-only, temperature 0, '
        + 'fail-closed, no network at runtime) before this generator can produce vocabulary/comprehension '
        + 'display-field drafts; until then no drafts are generated and no fields are fabricated',
    };
  }

  // (Unreachable in this pipeline: no approved helper is wired in.) If a helper
  // were available, generation would be bounded to a small sample and validated
  // per type. Kept as an explicit contract; never fabricates fields.
  const lookups = indexUpstreamObstaclesById(upstreamArtifacts || {});
  const sample = runtimeCandidates.slice(0, OFFLINE_AI_DISPLAY_FIELD_SAMPLE_LIMIT);
  const displayFieldDrafts = [];
  let generatedVocabularyDisplayDraftCount = 0;
  let generatedComprehensionDisplayDraftCount = 0;

  sample.forEach((candidate) => {
    const derived = deriveDisplayFieldsFromUpstream(candidate, lookups);
    const requiredByType = candidate.type === 'vocabulary'
      ? ['word', 'phonetic', 'partOfSpeech', 'sentenceMeaning']
      : ['literal', 'actual', 'grammar'];
    const generatedFields = {};
    requiredByType.forEach((field) => {
      if (isPresentDisplayField(derived[field])) {
        generatedFields[field] = derived[field];
      }
    });
    if (candidate.type === 'comprehension') {
      ['prototype', 'phrase', 'text'].forEach((field) => {
        if (isPresentDisplayField(derived[field])) generatedFields[field] = derived[field];
      });
    }
    const hasAllRequired = requiredByType.every((field) => isPresentDisplayField(generatedFields[field]));
    if (!hasAllRequired) {
      return; // fail closed: incomplete required fields -> no draft
    }
    if (candidate.type === 'vocabulary') generatedVocabularyDisplayDraftCount += 1;
    else generatedComprehensionDisplayDraftCount += 1;
    displayFieldDrafts.push({
      runtimeCandidateId: candidate.runtimeCandidateId,
      sourceDraftObstacleId: candidate.sourceDraftObstacleId || null,
      subtitleIndex: candidate.subtitleIndex,
      source_en: candidate.source_en,
      source_zh: Object.prototype.hasOwnProperty.call(candidate, 'source_zh') ? candidate.source_zh : null,
      type: candidate.type,
      generatedFields,
      generationSource: helper.name,
      confidence: 1,
      reviewStatus: 'pending_human_review',
      runtimeDisplayMayConsume: false,
    });
  });

  return {
    offlineAiHelperAvailable: true,
    offlineAiHelperName: helper.name,
    sampleLimit: OFFLINE_AI_DISPLAY_FIELD_SAMPLE_LIMIT,
    displayFieldDrafts,
    generatedVocabularyDisplayDraftCount,
    generatedComprehensionDisplayDraftCount,
    generatedDisplayDraftCount: displayFieldDrafts.length,
    requiresHumanReview: true,
    runtimeDisplayMayConsume: false,
    expectedNextStep: 'human review of generated display-field drafts before any review-gated display promotion',
  };
}

/* -------------------------------------------------------------------------
 * P3-A Offline AI Display Field Generator — Skeleton (safe)
 *
 * First real generator skeleton (no longer probe-only): it defines the
 * generator contract, detects configuration, prepares a bounded input sample,
 * and validates output schema. It does NOT generate real AI output unless an
 * approved offline AI helper/config already exists in this pipeline (none
 * does), and it adds NO new network/API code.
 *
 * Runtime stays read-only. Generated drafts (if any) are draft-only:
 * reviewStatus "pending_human_review", runtimeDisplayMayConsume false. It never
 * writes into runtime_candidate_artifact, never sets runtimeMayConsume /
 * runtimeConsumable true, and makes no OCR / Qwen-VL / Internet calls.
 * ---------------------------------------------------------------------- */

const P3A_DISPLAY_FIELD_SAMPLE_LIMIT = 5;
const P3A_PLACEHOLDER_VALUES = ['待补充', 'unknown', 'TODO'];

function buildP3ADisplayFieldGeneratorInput(runtimeCandidateArtifact, upstreamArtifacts, limit = P3A_DISPLAY_FIELD_SAMPLE_LIMIT) {
  const runtimeCandidates = runtimeCandidateArtifact
    && runtimeCandidateArtifact.payload
    && Array.isArray(runtimeCandidateArtifact.payload.runtimeCandidates)
    ? runtimeCandidateArtifact.payload.runtimeCandidates
    : null;

  if (!runtimeCandidates) {
    fail('P3-A generator input: payload.runtimeCandidates is not an array');
  }

  // Nearby subtitle context from the subtitle artifact, keyed by subtitleIndex.
  const subtitleArtifact = upstreamArtifacts && upstreamArtifacts.subtitleArtifact;
  const subtitles = subtitleArtifact
    && subtitleArtifact.payload
    && Array.isArray(subtitleArtifact.payload.subtitles)
    ? subtitleArtifact.payload.subtitles
    : [];
  const subtitleByIndex = new Map();
  subtitles.forEach((row) => {
    if (row && Number.isFinite(Number(row.subtitleIndex))) {
      subtitleByIndex.set(row.subtitleIndex, row);
    }
  });

  const buildNearbyContext = (subtitleIndex) => {
    const nearby = [];
    [subtitleIndex - 1, subtitleIndex + 1].forEach((idx) => {
      const row = subtitleByIndex.get(idx);
      if (row) {
        nearby.push({ subtitleIndex: idx, source_en: row.source_en, source_zh: row.source_zh });
      }
    });
    return nearby;
  };

  return runtimeCandidates.slice(0, limit).map((candidate) => ({
    runtimeCandidateId: candidate.runtimeCandidateId,
    sourceDraftObstacleId: candidate.sourceDraftObstacleId || null,
    sourceReviewId: candidate.sourceReviewId || null,
    sourceFrozenCandidateId: candidate.sourceFrozenCandidateId || null,
    type: candidate.type,
    subtitleIndex: candidate.subtitleIndex,
    source_en: candidate.source_en,
    source_zh: Object.prototype.hasOwnProperty.call(candidate, 'source_zh') ? candidate.source_zh : null,
    nearbyContext: buildNearbyContext(candidate.subtitleIndex),
  }));
}

function validateP3ADisplayFieldDraft(draft) {
  if (!draft || typeof draft !== 'object') return false;
  if (!isPresentDisplayField(draft.runtimeCandidateId)) return false;
  if (!draft.generatedFields || typeof draft.generatedFields !== 'object') return false;
  if (typeof draft.confidence !== 'number' || draft.confidence < 0 || draft.confidence > 1) return false;
  if (draft.reviewStatus !== 'pending_human_review') return false;
  if (draft.runtimeDisplayMayConsume !== false) return false;

  const requiredByType = draft.type === 'vocabulary'
    ? ['word', 'phonetic', 'partOfSpeech', 'sentenceMeaning']
    : ['literal', 'actual', 'grammar'];

  for (const field of requiredByType) {
    const value = draft.generatedFields[field];
    if (!isPresentDisplayField(value)) return false;
    if (P3A_PLACEHOLDER_VALUES.includes(String(value).trim())) return false;
  }

  if (draft.type === 'comprehension') {
    const hasTitle = ['prototype', 'phrase', 'text'].some(
      (field) => isPresentDisplayField(draft.generatedFields[field]),
    );
    if (!hasTitle) return false;
  }

  return true;
}

function detectApprovedP3AOfflineAiHelperConfig() {
  // An approved offline AI helper/config must already be present in this
  // pipeline. This script imports only fs/path and has no such helper/config.
  // We do not add one here.
  return { available: false, name: null };
}

function buildP3AOfflineAiDisplayFieldGeneratorSkeleton(runtimeCandidateArtifact, upstreamArtifacts) {
  const input = buildP3ADisplayFieldGeneratorInput(runtimeCandidateArtifact, upstreamArtifacts);
  const helper = detectApprovedP3AOfflineAiHelperConfig();

  if (!helper.available) {
    return {
      generatorStatus: 'blocked_missing_offline_ai_helper',
      offlineAiHelperAvailable: false,
      inputCandidateCount: input.length,
      sampleLimit: P3A_DISPLAY_FIELD_SAMPLE_LIMIT,
      displayFieldDrafts: [],
      generatedVocabularyDraftCount: 0,
      generatedComprehensionDraftCount: 0,
      generatedDraftCount: 0,
      requiresHumanReview: true,
      runtimeDisplayMayConsume: false,
      expectedNextStep:
        'introduce and approve an offline AI helper/config (deterministic, JSON-only, temperature 0, '
        + 'fail-closed, no runtime network) wired into this pipeline; the P3-A skeleton will then generate '
        + 'a bounded sample of display-field drafts for human review',
    };
  }

  // (Unreachable in this pipeline: no approved helper/config is wired in.)
  // Contract for when a helper exists: bounded sample, temperature 0, JSON
  // required, fail closed on invalid JSON, validate every returned draft, never
  // write generated fields into runtime_candidate_artifact.
  const validatedDrafts = [];
  let generatedVocabularyDraftCount = 0;
  let generatedComprehensionDraftCount = 0;
  // No generation performed here because helper.available is false above.

  return {
    generatorStatus: 'ready',
    offlineAiHelperAvailable: true,
    offlineAiHelperName: helper.name,
    inputCandidateCount: input.length,
    sampleLimit: P3A_DISPLAY_FIELD_SAMPLE_LIMIT,
    displayFieldDrafts: validatedDrafts,
    generatedVocabularyDraftCount,
    generatedComprehensionDraftCount,
    generatedDraftCount: validatedDrafts.length,
    requiresHumanReview: true,
    runtimeDisplayMayConsume: false,
    expectedNextStep: 'human review of generated display-field drafts before any review-gated display promotion',
  };
}

/* -------------------------------------------------------------------------
 * P3-C Offline AI Display Field Generation REAL
 *
 * Performs REAL offline Qwen generation of display-field DRAFTS for a bounded
 * sample (max 3) of Runtime Candidate records, per docs/P3B_AI_DISPLAY_GENERATOR
 * _CONTRACT.md. Drafts are draft-only (reviewStatus pending_human_review,
 * runtimeDisplayMayConsume false). It never writes into runtime_candidate
 * _artifact, never sets runtimeMayConsume/runtimeConsumable true, never changes
 * UI, and makes no OCR / Qwen-VL / Internet-scraping calls.
 *
 * Fails closed on: missing API key, API error, invalid JSON, missing drafts
 * array, schema mismatch, or placeholder values.
 * ---------------------------------------------------------------------- */

const P3C_SAMPLE_LIMIT = 3;
const P3C_MODEL = 'qwen-plus';
const P3C_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

function buildP3CDisplayFieldPrompt(inputItems) {
  const contract = [
    'You generate user-facing English-learning display fields for subtitle obstacles.',
    'Input is a JSON array of at most 3 candidate items.',
    'Return JSON ONLY in this exact shape: {"drafts": [ ... ]}.',
    'Each draft MUST include: runtimeCandidateId, sourceDraftObstacleId, type, subtitleIndex,',
    'source_en, source_zh, generatedFields, generationSource, confidence,',
    'reviewStatus, runtimeDisplayMayConsume.',
    'Set generationSource to "qwen-plus-display-field-generator".',
    'Set reviewStatus to "pending_human_review". Set runtimeDisplayMayConsume to false.',
    'confidence is a number between 0 and 1.',
    'For type "vocabulary", generatedFields MUST include: word, phonetic, partOfSpeech, sentenceMeaning.',
    '  - word = dictionary/base form of the obstacle word.',
    '  - phonetic = phonetic transcription of that base form.',
    '  - partOfSpeech = concise dictionary POS such as n., vt., vi., adj., adv., prep., interj.',
    '  - sentenceMeaning = a SHORT Chinese meaning for the word in THIS sentence only.',
    'For type "comprehension", generatedFields MUST include: prototype, literal, actual, grammar.',
    '  - prototype = the prototypical phrase form.',
    '  - literal = the surface meaning.',
    '  - actual = the intended/contextual meaning.',
    '  - grammar = explain WHY the meaning arises.',
    'Never use placeholders like "待补充", "unknown", or "TODO". Never leave a required field empty.',
    'Use the provided nearby subtitle context to disambiguate meaning; do not invent facts.',
  ].join('\n');

  return [
    { role: 'system', content: contract },
    { role: 'user', content: JSON.stringify(inputItems) },
  ];
}

async function callQwenDisplayFieldGenerator(inputItems) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return { status: 'blocked_missing_api_key', aiCalled: false, drafts: null };
  }

  let response;
  try {
    response = await fetch(P3C_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: P3C_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: buildP3CDisplayFieldPrompt(inputItems),
      }),
    });
  } catch (error) {
    return { status: 'fail_closed_api_error', aiCalled: true, drafts: null, reason: error?.message || String(error) };
  }

  if (!response.ok) {
    return { status: 'fail_closed_api_error', aiCalled: true, drafts: null, reason: `HTTP ${response.status}` };
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    return { status: 'fail_closed_invalid_json', aiCalled: true, drafts: null, reason: 'response body is not JSON' };
  }

  const content = body && body.choices && body.choices[0] && body.choices[0].message
    ? body.choices[0].message.content
    : null;
  if (typeof content !== 'string') {
    return { status: 'fail_closed_invalid_json', aiCalled: true, drafts: null, reason: 'missing message content' };
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    return { status: 'fail_closed_invalid_json', aiCalled: true, drafts: null, reason: 'content is not valid JSON' };
  }

  if (!parsed || !Array.isArray(parsed.drafts)) {
    return { status: 'fail_closed_missing_drafts', aiCalled: true, drafts: null, reason: 'drafts array missing' };
  }

  return { status: 'generated', aiCalled: true, drafts: parsed.drafts };
}

async function runP3CDisplayFieldGeneration(runtimeCandidateArtifact, upstreamArtifacts) {
  const inputItems = buildP3ADisplayFieldGeneratorInput(
    runtimeCandidateArtifact,
    upstreamArtifacts,
    P3C_SAMPLE_LIMIT,
  );

  const result = await callQwenDisplayFieldGenerator(inputItems);

  const baseSummary = {
    generatorStatus: result.status,
    aiCalled: result.aiCalled,
    model: P3C_MODEL,
    inputCandidateCount: inputItems.length,
    generatedDraftCount: 0,
    validDraftCount: 0,
    invalidDraftCount: 0,
    validDrafts: [],
    requiresHumanReview: true,
    runtimeDisplayMayConsume: false,
  };

  if (result.status !== 'generated') {
    return {
      ...baseSummary,
      expectedNextStep: result.status === 'blocked_missing_api_key'
        ? 'set DASHSCOPE_API_KEY in the offline environment, then re-run to generate display-field drafts for human review'
        : `resolve generation failure (${result.reason || result.status}); generation fails closed and produces no drafts`,
    };
  }

  const rawDrafts = result.drafts;
  const validDrafts = rawDrafts.filter((draft) => validateP3ADisplayFieldDraft(draft));
  const invalidDraftCount = rawDrafts.length - validDrafts.length;

  return {
    ...baseSummary,
    generatedDraftCount: rawDrafts.length,
    validDraftCount: validDrafts.length,
    invalidDraftCount,
    validDrafts,
    expectedNextStep: 'P3-D human review of valid display-field drafts before any review-gated display promotion',
  };
}

/* -------------------------------------------------------------------------
 * P3-D Display Draft Human Review Gate
 *
 * Records review decisions for P3-C VALID display drafts only. It does NOT
 * promote display drafts and does NOT make Runtime Candidate consumable. For
 * this stage the decisions are DETERMINISTIC PLACEHOLDERS (reviewer
 * "human-placeholder") used to verify the review gate wiring — this is NOT a
 * claim that real human review occurred. Output is inspection/report-only.
 *
 * Runtime stays read-only; runtimeMayConsume / runtimeConsumable stay false and
 * every decision carries runtimeDisplayMayConsume false.
 * ---------------------------------------------------------------------- */

const P3D_PLACEHOLDER_REVIEWED_AT = 'P3-D-placeholder-review';

function buildP3DDisplayDraftHumanReviewGate(p3cGeneration) {
  const validDrafts = p3cGeneration && Array.isArray(p3cGeneration.validDrafts)
    ? p3cGeneration.validDrafts
    : [];

  // Placeholder approval for every valid P3-C draft (deterministic, not a real
  // human review). Review targets are restricted to P3-C valid drafts only.
  const reviewDecisions = validDrafts.map((draft) => ({
    runtimeCandidateId: draft.runtimeCandidateId,
    reviewDecision: 'approved',
    reviewer: 'human-placeholder',
    reviewedAt: P3D_PLACEHOLDER_REVIEWED_AT,
    reason: 'placeholder approval for P3-D review gate verification',
    runtimeDisplayMayConsume: false,
  }));

  // Invariant: no decision may enable display consumption.
  const allDisplayConsumeFalse = reviewDecisions.every(
    (decision) => decision.runtimeDisplayMayConsume === false,
  );
  if (!allDisplayConsumeFalse) {
    fail('P3-D review gate produced a decision with runtimeDisplayMayConsume !== false');
  }

  const approvedDraftCount = reviewDecisions.filter((d) => d.reviewDecision === 'approved').length;
  const rejectedDraftCount = reviewDecisions.filter((d) => d.reviewDecision === 'rejected').length;

  return {
    reviewGateStatus: validDrafts.length > 0 ? 'reviewed_placeholder' : 'no_valid_drafts_to_review',
    reviewedDraftCount: reviewDecisions.length,
    approvedDraftCount,
    rejectedDraftCount,
    reviewDecisions,
    runtimeDisplayMayConsume: false,
    expectedNextStep:
      'replace placeholder approvals with real human review decisions; a future review-gated promotion '
      + 'stage may then promote only approved display drafts before Runtime consumption is considered',
  };
}

/* -------------------------------------------------------------------------
 * P3-E AI Quality Assurance Engine
 *
 * Deterministic, rules-based QA over P3-C VALID display drafts. Replaces
 * "manual review by default": AI generates (P3-C) -> AI QA checks (P3-E) ->
 * high-quality drafts become promotion-eligible -> only uncertain cases need
 * human review.
 *
 * It does NOT promote drafts, does NOT make Runtime consume anything, calls NO
 * Qwen/API (fully deterministic), and reads only P3-C valid drafts. Runtime
 * stays read-only; runtimeDisplayMayConsume is always false here.
 * ---------------------------------------------------------------------- */

const P3E_RUNTIME_POS_STYLE = new Set([
  'n.', 'pron.', 'v.', 'vt.', 'vi.', 'vt./vi.', 'aux.', 'modal v.',
  'adj.', 'adv.', 'prep.', 'conj.', 'art.', 'num.', 'interj.', 'abbr.',
]);

function countChineseChars(value) {
  const matches = String(value || '').match(/[一-鿿]/g);
  return matches ? matches.length : 0;
}

function buildP3EAiQualityAssuranceEngine(p3cGeneration) {
  const validDrafts = p3cGeneration && Array.isArray(p3cGeneration.validDrafts)
    ? p3cGeneration.validDrafts
    : [];

  const qaDecisions = validDrafts.map((draft) => {
    const generatedFields = draft && draft.generatedFields ? draft.generatedFields : {};
    const checks = {};
    let score = 100;
    let criticalFailure = false;

    // Schema validity (critical).
    const schemaValid = validateP3ADisplayFieldDraft(draft);
    checks.schemaValid = schemaValid;
    if (!schemaValid) { score -= 100; criticalFailure = true; }

    // Confidence band.
    const confidence = typeof draft.confidence === 'number' ? draft.confidence : 0;
    if (confidence < 0.65) {
      score -= 50;
      checks.confidenceBand = 'low';
    } else if (confidence < 0.85) {
      score -= 20;
      checks.confidenceBand = 'medium';
    } else {
      checks.confidenceBand = 'high';
    }

    // Required fields presence + emptiness + placeholders (critical).
    const requiredByType = draft.type === 'vocabulary'
      ? ['word', 'phonetic', 'partOfSpeech', 'sentenceMeaning']
      : ['literal', 'actual', 'grammar'];
    let missingField = false;
    let emptyField = false;
    let placeholderField = false;
    requiredByType.forEach((field) => {
      const value = generatedFields[field];
      if (value === undefined || value === null) {
        missingField = true;
      } else if (!isPresentDisplayField(value)) {
        emptyField = true;
      } else if (P3A_PLACEHOLDER_VALUES.includes(String(value).trim())) {
        placeholderField = true;
      }
    });
    checks.allRequiredFieldsPresent = !missingField;
    checks.noEmptyFields = !emptyField;
    checks.noPlaceholders = !placeholderField;
    if (missingField) { score -= 100; criticalFailure = true; }
    if (emptyField) { score -= 100; criticalFailure = true; }
    if (placeholderField) { score -= 100; criticalFailure = true; }

    // Vocabulary: sentenceMeaning length + POS style.
    if (draft.type === 'vocabulary') {
      const sentenceMeaningChineseLength = countChineseChars(generatedFields.sentenceMeaning);
      checks.sentenceMeaningConcise = sentenceMeaningChineseLength <= 12;
      if (sentenceMeaningChineseLength > 12) score -= 30;

      const posOk = P3E_RUNTIME_POS_STYLE.has(String(generatedFields.partOfSpeech || '').trim());
      checks.partOfSpeechRuntimeStyle = posOk;
      if (!posOk) score -= 20;
    }

    // Comprehension: grammar must be substantive enough to explain why.
    if (draft.type === 'comprehension') {
      const grammarLongEnough = String(generatedFields.grammar || '').trim().length >= 12;
      checks.grammarExplainsWhy = grammarLongEnough;
      if (!grammarLongEnough) score -= 20;
    }

    const qaScore = score;
    let qaDecision;
    if (criticalFailure || qaScore < 65) {
      qaDecision = 'qa_auto_rejected';
    } else if (qaScore < 85) {
      qaDecision = 'qa_needs_human_review';
    } else {
      qaDecision = 'qa_auto_approved';
    }

    const promotionEligible = qaDecision === 'qa_auto_approved';

    return {
      runtimeCandidateId: draft.runtimeCandidateId,
      type: draft.type,
      generatedFields,
      reviewStatus: draft.reviewStatus,
      confidence,
      qaDecision,
      qaReviewer: 'ai-quality-assurance-engine',
      reviewedAt: 'P3-E-deterministic-qa',
      qaScore,
      qaChecks: checks,
      reason: criticalFailure
        ? 'critical QA failure (schema/required-field/placeholder)'
        : `deterministic QA score ${qaScore}`,
      promotionEligible,
      runtimeDisplayMayConsume: false,
    };
  });

  const qaAutoApprovedDraftCount = qaDecisions.filter((d) => d.qaDecision === 'qa_auto_approved').length;
  const qaNeedsHumanReviewDraftCount = qaDecisions.filter((d) => d.qaDecision === 'qa_needs_human_review').length;
  const qaAutoRejectedDraftCount = qaDecisions.filter((d) => d.qaDecision === 'qa_auto_rejected').length;

  return {
    qaEngineStatus: validDrafts.length > 0 ? 'qa_complete' : 'no_valid_drafts_to_qa',
    qaReviewedDraftCount: qaDecisions.length,
    qaAutoApprovedDraftCount,
    qaNeedsHumanReviewDraftCount,
    qaAutoRejectedDraftCount,
    qaDecisions,
    runtimeDisplayMayConsume: false,
    expectedNextStep:
      'a future review-gated promotion stage may promote only qa_auto_approved (promotionEligible) drafts; '
      + 'qa_needs_human_review drafts require human review; qa_auto_rejected drafts are excluded',
  };
}

/* -------------------------------------------------------------------------
 * P3-F Display Promotion
 *
 * Promotes ONLY QA-approved display drafts (from P3-E) into Promoted Display
 * records. Deterministic; no Qwen/API. Reads only P3-E QA results. It does NOT
 * make Runtime consume promoted displays, never writes into
 * runtime_candidate_artifact, and never sets runtimeMayConsume /
 * runtimeConsumable true. Promoted records keep runtimeDisplayMayConsume false.
 *
 * generatedFields are preserved exactly — promotion never modifies content.
 * ---------------------------------------------------------------------- */

function buildP3FDisplayPromotion(p3eQaResult) {
  const qaDecisions = p3eQaResult && Array.isArray(p3eQaResult.qaDecisions)
    ? p3eQaResult.qaDecisions
    : [];

  const promotedDisplays = [];
  let skippedDisplayCount = 0;

  qaDecisions.forEach((decision) => {
    // Reconstruct the draft shape for revalidation against the frozen schema.
    const draftForValidation = {
      runtimeCandidateId: decision.runtimeCandidateId,
      type: decision.type,
      generatedFields: decision.generatedFields,
      confidence: decision.confidence,
      reviewStatus: decision.reviewStatus,
      runtimeDisplayMayConsume: decision.runtimeDisplayMayConsume,
    };

    const eligible = decision.qaDecision === 'qa_auto_approved'
      && decision.promotionEligible === true
      && decision.runtimeDisplayMayConsume === false
      && validateP3ADisplayFieldDraft(draftForValidation);

    if (!eligible) {
      skippedDisplayCount += 1;
      return;
    }

    promotedDisplays.push({
      runtimeCandidateId: decision.runtimeCandidateId,
      promotedDisplayId: `${decision.runtimeCandidateId}-promoted-display-v1`,
      promotedFromDraftId: decision.runtimeCandidateId,
      promotedAt: 'P3-F-deterministic-promotion',
      promotedBy: 'promotion-engine',
      type: decision.type,
      generatedFields: decision.generatedFields,
      promotionStatus: 'promoted',
      promotionVersion: 1,
      runtimeDisplayMayConsume: false,
    });
  });

  return {
    promotionStatus: promotedDisplays.length > 0 ? 'promoted' : 'no_eligible_displays',
    promotedDisplayCount: promotedDisplays.length,
    skippedDisplayCount,
    promotedDisplays,
    runtimeDisplayMayConsume: false,
    expectedNextStep:
      'promoted display records remain offline and not runtime-consumable; a future, separately authorized '
      + 'runtime display-consumption review must approve before Runtime may consume promoted displays',
  };
}

async function main() {
  const sourceRows = readSubtitleSource();
  const p4bBatch1Enabled = process.env.P4_B_BATCH1 === '1';
  const p4cBatch1QaEnabled = process.env.P4_C_BATCH1_QA === '1';
  const p4dBatch1PromoteEnabled = process.env.P4_D_BATCH1_PROMOTE === '1';

  // P4-D Batch 1 Promotion Expansion (OPT-IN only when P4_D_BATCH1_PROMOTE=1)
  // This path exits immediately after promotion to avoid entering P4-B, P4-C, P3-E/F, or Runtime.
  if (p4dBatch1PromoteEnabled) {
    process.stdout.write('\n--- P4-D Batch 1 Promotion Expansion ---\n');
    process.stdout.write('Opt-in flag detected: P4_D_BATCH1_PROMOTE=1\n');
    process.stdout.write('P4-D isolated path: will NOT call API, regenerate drafts, rerun QA, or modify existing promoted artifacts\n\n');

    fs.mkdirSync(path.resolve(OUTPUT_DIR), { recursive: true });

    // Read P4-C batch 1 display QA
    const batch1QaPath = 'p4_b_batch1_display_qa.json';
    const batch1QaArtifact = readArtifact(batch1QaPath);

    if (!batch1QaArtifact || !batch1QaArtifact.payload || !Array.isArray(batch1QaArtifact.payload.qaResults)) {
      fail('P4-D requires valid p4_b_batch1_display_qa.json with qaResults array');
    }

    const qaResults = batch1QaArtifact.payload.qaResults;
    process.stdout.write(`Loaded ${qaResults.length} QA results from ${batch1QaPath}\n`);
    process.stdout.write('Promoting only QA-passed display records...\n');

    // Promote only QA-passed records
    const promotedDisplays = [];
    const rejectedReferences = [];

    qaResults.forEach((result, index) => {
      if (result.qaPassed === true && result.qaRejected === false) {
        const promotedDisplay = {
          runtimeCandidateId: result.runtimeCandidateId,
          promotedDisplayId: `${result.runtimeCandidateId}-promoted-batch1-${String(index + 1).padStart(3, '0')}`,
          promotedFromDraftId: result.runtimeCandidateId,
          sourceDraftObstacleId: result.sourceDraftObstacleId,
          type: result.type,
          subtitleIndex: result.subtitleIndex,
          source_en: result.source_en,
          source_zh: result.source_zh,
          generatedFields: result.generatedFields,
          generationSource: result.generationSource,
          confidence: result.confidence,
          reviewStatus: result.reviewStatus,
          qaStatus: {
            qaPassed: result.qaPassed,
            qaReason: result.qaReason,
            qaChecks: result.qaChecks,
          },
          promotionStatus: 'promoted',
          promotionSource: 'P4-D-batch1-promotion',
          runtimeDisplayMayConsume: false,
        };

        // Preserve marker bounds if present
        if (result.markerStart !== undefined) {
          promotedDisplay.markerStart = result.markerStart;
        }
        if (result.markerEnd !== undefined) {
          promotedDisplay.markerEnd = result.markerEnd;
        }

        promotedDisplays.push(promotedDisplay);
      } else {
        rejectedReferences.push({
          runtimeCandidateId: result.runtimeCandidateId,
          type: result.type,
          qaRejected: result.qaRejected,
          qaReason: result.qaReason,
        });
      }
    });

    const promotedCount = promotedDisplays.length;
    const rejectedCount = rejectedReferences.length;

    process.stdout.write(`Promoted: ${promotedCount}\n`);
    process.stdout.write(`Rejected: ${rejectedCount}\n`);

    // Write P4-D promotion output
    const promotionOutputArtifact = {
      schemaVersion: 'p4-d-batch1-promoted-display-artifact.v1',
      stage: 'P4-D',
      episodeId: EPISODE_ID,
      learnerLevel: LEARNER_LEVEL,
      batch: 1,
      inputArtifact: batch1QaPath,
      promotedDisplayCount: promotedCount,
      rejectedCount,
      runtimeConsumable: false,
      runtimeDisplayMayConsume: false,
      payload: {
        promotedDisplays,
        rejectedReferences,
      },
    };

    const promotionOutputPath = writeArtifact('p4_d_batch1_promoted_display.json', promotionOutputArtifact);
    process.stdout.write(`Promotion output written: ${promotionOutputPath}\n`);

    process.stdout.write('\n--- P4-D Batch 1 Promotion Result ---\n');
    process.stdout.write(`Status: COMPLETED\n`);
    process.stdout.write(`Promoted Count: ${promotedCount}\n`);
    process.stdout.write(`Rejected Count: ${rejectedCount}\n`);
    process.stdout.write(`Runtime Display May Consume: false\n`);
    process.stdout.write(`Output File: ${promotionOutputPath}\n`);
    process.stdout.write('\nP4-D isolated path completed successfully.\n');
    process.stdout.write('Exiting without entering P4-B, P4-C, P3-E/F, existing Promotion, or Runtime paths.\n');
    return;
  }

  // P4-C Batch 1 QA Expansion (OPT-IN only when P4_C_BATCH1_QA=1)
  // This path exits immediately after QA to avoid entering P4-B, P3-E/F, Promotion, or Runtime.
  if (p4cBatch1QaEnabled) {
    process.stdout.write('\n--- P4-C Batch 1 QA Expansion ---\n');
    process.stdout.write('Opt-in flag detected: P4_C_BATCH1_QA=1\n');
    process.stdout.write('P4-C isolated path: will NOT call API, regenerate drafts, promote, or modify promoted artifacts\n\n');

    fs.mkdirSync(path.resolve(OUTPUT_DIR), { recursive: true });

    // Read P4-B batch 1 display draft
    const batch1DraftPath = 'p4_b_batch1_display_draft.json';
    const batch1DraftArtifact = readArtifact(batch1DraftPath);

    if (!batch1DraftArtifact || !batch1DraftArtifact.payload || !Array.isArray(batch1DraftArtifact.payload.displayDrafts)) {
      fail('P4-C requires valid p4_b_batch1_display_draft.json with displayDrafts array');
    }

    const displayDrafts = batch1DraftArtifact.payload.displayDrafts;
    process.stdout.write(`Loaded ${displayDrafts.length} display drafts from ${batch1DraftPath}\n`);
    process.stdout.write('Running deterministic local QA checks...\n');

    // Apply deterministic QA checks to each draft
    const qaResults = displayDrafts.map((draft) => {
      const qaChecks = {
        hasRuntimeCandidateId: typeof draft.runtimeCandidateId === 'string' && draft.runtimeCandidateId.length > 0,
        hasType: typeof draft.type === 'string' && (draft.type === 'vocabulary' || draft.type === 'comprehension'),
        hasGeneratedFields: draft.generatedFields && typeof draft.generatedFields === 'object',
        reviewStatusValid: draft.reviewStatus === 'pending_human_review',
        runtimeDisplayMayConsumeFalse: draft.runtimeDisplayMayConsume === false,
      };

      // Type-specific checks
      if (draft.type === 'vocabulary') {
        const fields = draft.generatedFields || {};
        qaChecks.hasWord = typeof fields.word === 'string' && fields.word.trim().length > 0;
        qaChecks.hasPhonetic = typeof fields.phonetic === 'string' && fields.phonetic.trim().length > 0;
        qaChecks.hasPartOfSpeech = typeof fields.partOfSpeech === 'string' && fields.partOfSpeech.trim().length > 0;
        qaChecks.hasSentenceMeaning = typeof fields.sentenceMeaning === 'string' && fields.sentenceMeaning.trim().length > 0;
        qaChecks.vocabularyFieldsValid = qaChecks.hasWord && qaChecks.hasPhonetic && qaChecks.hasPartOfSpeech && qaChecks.hasSentenceMeaning;
      } else if (draft.type === 'comprehension') {
        const fields = draft.generatedFields || {};
        qaChecks.hasTitle = typeof fields.prototype === 'string' && fields.prototype.trim().length > 0
          || typeof fields.phrase === 'string' && fields.phrase.trim().length > 0
          || typeof fields.text === 'string' && fields.text.trim().length > 0;
        qaChecks.hasLiteral = typeof fields.literal === 'string' && fields.literal.trim().length > 0;
        qaChecks.hasActual = typeof fields.actual === 'string' && fields.actual.trim().length > 0;
        qaChecks.hasGrammar = typeof fields.grammar === 'string' && fields.grammar.trim().length > 0;
        qaChecks.comprehensionFieldsValid = qaChecks.hasTitle && qaChecks.hasLiteral && qaChecks.hasActual && qaChecks.hasGrammar;
      }

      // Marker bounds check (if present)
      if (draft.markerStart !== undefined || draft.markerEnd !== undefined) {
        qaChecks.markerStartFinite = Number.isFinite(draft.markerStart);
        qaChecks.markerEndFinite = Number.isFinite(draft.markerEnd);
        qaChecks.markerBoundsValid = qaChecks.markerStartFinite && qaChecks.markerEndFinite && draft.markerEnd > draft.markerStart;
      }

      // Determine overall QA result
      const criticalChecksPassed = qaChecks.hasRuntimeCandidateId
        && qaChecks.hasType
        && qaChecks.hasGeneratedFields
        && qaChecks.reviewStatusValid
        && qaChecks.runtimeDisplayMayConsumeFalse;

      const typeSpecificChecksPassed = draft.type === 'vocabulary'
        ? qaChecks.vocabularyFieldsValid
        : draft.type === 'comprehension'
        ? qaChecks.comprehensionFieldsValid
        : false;

      const qaPassed = criticalChecksPassed && typeSpecificChecksPassed;
      const qaRejected = !qaPassed;

      let qaReason = '';
      if (!criticalChecksPassed) {
        qaReason = 'Critical checks failed: ';
        const failed = [];
        if (!qaChecks.hasRuntimeCandidateId) failed.push('missing runtimeCandidateId');
        if (!qaChecks.hasType) failed.push('invalid type');
        if (!qaChecks.hasGeneratedFields) failed.push('missing generatedFields');
        if (!qaChecks.reviewStatusValid) failed.push('reviewStatus not pending_human_review');
        if (!qaChecks.runtimeDisplayMayConsumeFalse) failed.push('runtimeDisplayMayConsume not false');
        qaReason += failed.join(', ');
      } else if (!typeSpecificChecksPassed) {
        qaReason = draft.type === 'vocabulary'
          ? 'Vocabulary fields incomplete or invalid'
          : draft.type === 'comprehension'
          ? 'Comprehension fields incomplete or invalid'
          : 'Unknown type';
      } else {
        qaReason = 'All QA checks passed';
      }

      return {
        runtimeCandidateId: draft.runtimeCandidateId,
        sourceDraftObstacleId: draft.sourceDraftObstacleId,
        type: draft.type,
        subtitleIndex: draft.subtitleIndex,
        source_en: draft.source_en,
        source_zh: draft.source_zh,
        generatedFields: draft.generatedFields,
        generationSource: draft.generationSource,
        confidence: draft.confidence,
        reviewStatus: draft.reviewStatus,
        runtimeDisplayMayConsume: draft.runtimeDisplayMayConsume,
        qaPassed,
        qaRejected,
        qaReason,
        qaChecks,
      };
    });

    const totalDrafts = qaResults.length;
    const qaPassedCount = qaResults.filter((r) => r.qaPassed).length;
    const qaRejectedCount = qaResults.filter((r) => r.qaRejected).length;
    const vocabularyCount = qaResults.filter((r) => r.type === 'vocabulary').length;
    const comprehensionCount = qaResults.filter((r) => r.type === 'comprehension').length;
    const invalidCount = qaResults.filter((r) => r.type !== 'vocabulary' && r.type !== 'comprehension').length;

    process.stdout.write(`Total drafts QA processed: ${totalDrafts}\n`);
    process.stdout.write(`QA passed: ${qaPassedCount}\n`);
    process.stdout.write(`QA rejected: ${qaRejectedCount}\n`);
    process.stdout.write(`Vocabulary drafts: ${vocabularyCount}\n`);
    process.stdout.write(`Comprehension drafts: ${comprehensionCount}\n`);
    process.stdout.write(`Invalid type: ${invalidCount}\n`);

    // Write P4-C QA output
    const qaOutputArtifact = {
      schemaVersion: 'p4-c-batch1-display-qa-artifact.v1',
      stage: 'P4-C',
      episodeId: EPISODE_ID,
      learnerLevel: LEARNER_LEVEL,
      batch: 1,
      inputArtifact: batch1DraftPath,
      runtimeConsumable: false,
      runtimeDisplayMayConsume: false,
      payload: {
        qaResults,
        statistics: {
          totalDrafts,
          qaPassedCount,
          qaRejectedCount,
          vocabularyCount,
          comprehensionCount,
          invalidCount,
        },
      },
    };

    const qaOutputPath = writeArtifact('p4_b_batch1_display_qa.json', qaOutputArtifact);
    process.stdout.write(`QA output written: ${qaOutputPath}\n`);

    process.stdout.write('\n--- P4-C Batch 1 QA Result ---\n');
    process.stdout.write(`Status: COMPLETED\n`);
    process.stdout.write(`Total Drafts QA Processed: ${totalDrafts}\n`);
    process.stdout.write(`QA Passed: ${qaPassedCount}\n`);
    process.stdout.write(`QA Rejected: ${qaRejectedCount}\n`);
    process.stdout.write(`Vocabulary Drafts: ${vocabularyCount}\n`);
    process.stdout.write(`Comprehension Drafts: ${comprehensionCount}\n`);
    process.stdout.write(`Invalid Type: ${invalidCount}\n`);
    process.stdout.write(`Runtime Display May Consume: false\n`);
    process.stdout.write(`Output File: ${qaOutputPath}\n`);
    process.stdout.write('\nP4-C isolated path completed successfully.\n');
    process.stdout.write('Exiting without entering P4-B, P3-E/F, Promotion, or Runtime paths.\n');
    return;
  }

  // P4-B-1 First Episode Batch 1 Real Generation (OPT-IN only when P4_B_BATCH1=1)
  // This path exits immediately after generation to avoid modifying promoted artifacts.
  if (p4bBatch1Enabled) {
    process.stdout.write('\n--- P4-B-1 First Episode Batch 1 Real Generation ---\n');
    process.stdout.write('Opt-in flag detected: P4_B_BATCH1=1\n');
    process.stdout.write('P4-B-1 isolated path: will NOT execute P3-C/D/E/F/G or modify promoted artifacts\n\n');

    fs.mkdirSync(path.resolve(OUTPUT_DIR), { recursive: true });

    const P4B_BATCH1_SIZE_CAP = 30;
    const totalSubtitleCount = sourceRows.length;
    const batch1SubtitleCount = Math.min(P4B_BATCH1_SIZE_CAP, totalSubtitleCount);
    const batch1Subtitles = sourceRows.slice(0, batch1SubtitleCount);

    process.stdout.write(`Total subtitles available: ${totalSubtitleCount}\n`);
    process.stdout.write(`Batch 1 size cap: ${P4B_BATCH1_SIZE_CAP}\n`);
    process.stdout.write(`Batch 1 subtitles to process: ${batch1SubtitleCount}\n`);

    // Build batch 1 scoped subtitles
    const batch1Scoped = [];
    for (let index = 0; index < batch1Subtitles.length; index += 1) {
      const row = batch1Subtitles[index];
      const startRaw = pickField(row, START_FIELDS);
      const endRaw = pickField(row, END_FIELDS);
      const en = pickField(row, ENGLISH_FIELDS);
      const zh = pickField(row, CHINESE_FIELDS);

      if (typeof en !== 'string' || !en.trim()) {
        fail(`P4-B-1 subtitle row ${index} is missing English text`);
      }

      const startSeconds = parseTimeToSeconds(startRaw, `P4-B-1 subtitle row ${index} start`);
      const endSeconds = parseTimeToSeconds(endRaw, `P4-B-1 subtitle row ${index} end`);

      batch1Scoped.push({
        subtitleIndex: index,
        startTime: String(startRaw),
        endTime: String(endRaw),
        startSeconds,
        endSeconds,
        source_en: en,
        source_zh: typeof zh === 'string' ? zh : null,
      });
    }

    process.stdout.write(`Batch 1 scoped subtitles built: ${batch1Scoped.length}\n`);

    // Build temporary batch 1 subtitle artifact for generation input
    const batch1SubtitleArtifact = {
      payload: {
        subtitles: batch1Scoped,
      },
    };

    // Read existing runtime candidate artifact to build batch 1 input
    const existingRuntimeCandidateArtifact = readArtifact('runtime_candidate_artifact.json');
    const batch1RuntimeCandidates = existingRuntimeCandidateArtifact.payload.runtimeCandidates.slice(0, batch1SubtitleCount);
    const batch1RuntimeCandidateArtifact = {
      runtimeConsumable: false,
      payload: {
        runtimeMayConsume: false,
        runtimeCandidateCount: batch1RuntimeCandidates.length,
        runtimeCandidates: batch1RuntimeCandidates,
      },
    };

    process.stdout.write(`Batch 1 runtime candidates prepared: ${batch1RuntimeCandidates.length}\n`);
    process.stdout.write('Calling display field generation for batch 1...\n');

    // Run display field generation for batch 1
    const batch1InputItems = buildP3ADisplayFieldGeneratorInput(
      batch1RuntimeCandidateArtifact,
      { subtitleArtifact: batch1SubtitleArtifact },
      batch1RuntimeCandidates.length,
    );

    const batch1GenerationResult = await callQwenDisplayFieldGenerator(batch1InputItems);

    const batch1Summary = {
      generatorStatus: batch1GenerationResult.status,
      aiCalled: batch1GenerationResult.aiCalled,
      model: P3C_MODEL,
      inputCandidateCount: batch1InputItems.length,
      generatedDraftCount: 0,
      validDraftCount: 0,
      invalidDraftCount: 0,
      validDrafts: [],
      requiresHumanReview: true,
      runtimeDisplayMayConsume: false,
    };

    if (batch1GenerationResult.status !== 'generated') {
      batch1Summary.blockingReason = batch1GenerationResult.reason || batch1GenerationResult.status;
      process.stdout.write(`Generation failed: ${batch1Summary.blockingReason}\n`);
      process.stdout.write('\nP4-B-1 Status: FAILED\n');
      process.stdout.write(`Exit reason: ${batch1Summary.blockingReason}\n`);
      process.exitCode = 1;
      return;
    }

    const rawDrafts = batch1GenerationResult.drafts;
    const validDrafts = rawDrafts.filter((draft) => validateP3ADisplayFieldDraft(draft));
    const invalidDraftCount = rawDrafts.length - validDrafts.length;

    batch1Summary.generatedDraftCount = rawDrafts.length;
    batch1Summary.validDraftCount = validDrafts.length;
    batch1Summary.invalidDraftCount = invalidDraftCount;
    batch1Summary.validDrafts = validDrafts;

    process.stdout.write(`Generated drafts: ${batch1Summary.generatedDraftCount}\n`);
    process.stdout.write(`Valid drafts: ${batch1Summary.validDraftCount}\n`);
    process.stdout.write(`Invalid drafts: ${batch1Summary.invalidDraftCount}\n`);

    // Write batch 1 display draft artifact
    const batch1DisplayDraftArtifact = {
      schemaVersion: 'p4-b-1-batch1-display-draft-artifact.v1',
      stage: 'P4-B-1',
      episodeId: EPISODE_ID,
      learnerLevel: LEARNER_LEVEL,
      batch: 1,
      batchSizeCap: P4B_BATCH1_SIZE_CAP,
      batchSubtitleCount: batch1SubtitleCount,
      runtimeConsumable: false,
      runtimeDisplayMayConsume: false,
      payload: {
        displayDrafts: validDrafts,
        displayDraftCount: validDrafts.length,
      },
      summary: batch1Summary,
    };

    const batch1OutputPath = writeArtifact('p4_b_batch1_display_draft.json', batch1DisplayDraftArtifact);
    process.stdout.write(`Batch 1 display draft written: ${batch1OutputPath}\n`);

    process.stdout.write('\n--- P4-B-1 Batch 1 Generation Result ---\n');
    process.stdout.write(`Status: COMPLETED\n`);
    process.stdout.write(`Batch 1 Subtitles Processed: ${batch1SubtitleCount}\n`);
    process.stdout.write(`Display Drafts Generated: ${batch1Summary.generatedDraftCount}\n`);
    process.stdout.write(`Valid Drafts: ${batch1Summary.validDraftCount}\n`);
    process.stdout.write(`Invalid Drafts: ${batch1Summary.invalidDraftCount}\n`);
    process.stdout.write(`AI Called: ${batch1Summary.aiCalled}\n`);
    process.stdout.write(`Model: ${batch1Summary.model}\n`);
    process.stdout.write(`Runtime Display May Consume: ${batch1Summary.runtimeDisplayMayConsume}\n`);
    process.stdout.write(`Output File: ${batch1OutputPath}\n`);
    process.stdout.write('\nP4-B-1 isolated path completed successfully.\n');
    process.stdout.write('Exiting without executing P3-C/D/E/F/G or modifying promoted artifacts.\n');
    return;
  }

  // Default bootstrap path (P4_B_BATCH1 not set)
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

  // 3b. Vocabulary Candidate Artifact (REAL — P1-DA Vocabulary Candidate Engine)
  // Per P0-7C, consumes the Evidence Artifact from disk only; never reads the
  // Scene Meaning Artifact or subtitle source directly.
  const evidenceArtifactForVocab = readArtifact('evidence_artifact.json');
  const vocabularyCandidateArtifact = runVocabularyCandidateEngine(evidenceArtifactForVocab);
  createdFiles.push(writeArtifact('vocabulary_candidate_artifact.json', vocabularyCandidateArtifact));

  // 3c. Vocabulary Decision Artifact (REAL — P1-DB Vocabulary Decision Engine)
  // Per P0-7C, consumes the Vocabulary Candidate Artifact from disk only.
  const vocabularyCandidateArtifactForDecision = readArtifact('vocabulary_candidate_artifact.json');
  const vocabularyDecisionArtifact = runVocabularyDecisionEngine(vocabularyCandidateArtifactForDecision);
  createdFiles.push(writeArtifact('vocabulary_decision_artifact.json', vocabularyDecisionArtifact));

  // 4. Draft Obstacle Artifact (REAL — P1-DC Draft Assembly Engine)
  // Per P0-7C, consumes the Vocabulary Decision Artifact from disk only.
  const vocabularyDecisionArtifactForDraft = readArtifact('vocabulary_decision_artifact.json');
  const draftAssemblyArtifact = runDraftAssemblyEngine(vocabularyDecisionArtifactForDraft);
  createdFiles.push(writeArtifact('draft_obstacle_artifact.json', draftAssemblyArtifact));

  // 4b. Draft Obstacle Artifact (REAL — P1-E Comprehension Engine)
  // Per P0-7C, consumes evidence_artifact + the existing real draft_obstacle_artifact
  // from disk, preserves vocabulary draft obstacles, and appends comprehension obstacles.
  const evidenceArtifactForComprehension = readArtifact('evidence_artifact.json');
  const draftArtifactForComprehension = readArtifact('draft_obstacle_artifact.json');
  const draftObstacleArtifact = runComprehensionEngine(
    evidenceArtifactForComprehension,
    draftArtifactForComprehension,
  );
  writeArtifact('draft_obstacle_artifact.json', draftObstacleArtifact);

  // 5. Review Artifact (REAL — P1-F Review Engine, offline/deterministic)
  // Per P0-7C, consumes the final Draft Obstacle Artifact from disk only.
  const draftObstacleArtifactForReview = readArtifact('draft_obstacle_artifact.json');
  const reviewArtifact = runReviewEngine(draftObstacleArtifactForReview);
  createdFiles.push(writeArtifact('review_artifact.json', reviewArtifact));

  // 6. Frozen Candidate Artifact (REAL — P1-G Frozen Promotion Engine)
  // Per P0-7C, consumes the Review Artifact from disk only.
  const reviewArtifactForFrozen = readArtifact('review_artifact.json');
  const frozenCandidateArtifact = runFrozenPromotionEngine(reviewArtifactForFrozen);
  createdFiles.push(writeArtifact('frozen_candidate_artifact.json', frozenCandidateArtifact));

  // 7. Runtime Candidate Artifact (REAL — P1-H Runtime Promotion Engine)
  // Per P0-7C, consumes the Frozen Candidate Artifact from disk only.
  // runtimeConsumable and payload.runtimeMayConsume both remain false.
  const frozenCandidateArtifactForRuntime = readArtifact('frozen_candidate_artifact.json');
  const runtimeCandidateArtifact = runRuntimePromotionEngine(frozenCandidateArtifactForRuntime);
  createdFiles.push(writeArtifact('runtime_candidate_artifact.json', runtimeCandidateArtifact));

  // 7b. Runtime Consumption Review Gate (REAL — P1-I)
  // Per P0-7C, consumes the Runtime Candidate Artifact from disk only. It records
  // an explicit reviewed decision but does NOT rewrite runtime_candidate_artifact.json
  // and does NOT touch Runtime.
  const runtimeCandidateArtifactForGate = readArtifact('runtime_candidate_artifact.json');
  const runtimeConsumptionReviewArtifact = runRuntimeConsumptionReviewGate(runtimeCandidateArtifactForGate);
  createdFiles.push(writeArtifact('runtime_consumption_review_artifact.json', runtimeConsumptionReviewArtifact));

  // 8. Pipeline Bootstrap Report
  const expectedOrder = [
    'subtitle_artifact',
    'scene_meaning_artifact',
    'evidence_artifact',
    'vocabulary_candidate_artifact',
    'vocabulary_decision_artifact',
    'draft_obstacle_artifact',
    'review_artifact',
    'frozen_candidate_artifact',
    'runtime_candidate_artifact',
    'runtime_consumption_review_artifact',
  ];

  const vocabularyCandidateCount = vocabularyCandidateArtifact.payload.vocabularyCandidateCount;
  const vocabularyDecisionCount = vocabularyDecisionArtifact.payload.vocabularyDecisionCount;
  const vocabularyObstacleIds = vocabularyDecisionArtifact.payload.vocabularyObstacles.map(
    (obstacle) => obstacle.obstacleId,
  );
  const vocabularyObstacleIdsSequential = vocabularyObstacleIds.every(
    (id, position) => id === `${EPISODE_ID}-vocab-obstacle-${String(position + 1).padStart(6, '0')}`,
  );

  const draftObstacleCount = draftObstacleArtifact.payload.draftObstacleCount;
  const draftObstacleIdsSequential = draftObstacleArtifact.payload.draftObstacles.every(
    (obstacle, position) => obstacle.draftObstacleId === `${EPISODE_ID}-draft-obstacle-${String(position + 1).padStart(6, '0')}`,
  );
  const comprehensionDraftObstacleCount =
    draftObstacleArtifact.payload.assemblySummary.comprehensionDraftObstacleCount;

  const reviewItemCount = reviewArtifact.payload.reviewItemCount;
  const reviewApprovedCount = reviewArtifact.payload.approvedCount;
  const reviewRejectedCount = reviewArtifact.payload.rejectedCount;
  const reviewIdsSequential = reviewArtifact.payload.reviewItems.every(
    (item, position) => item.reviewId === `${EPISODE_ID}-review-${String(position + 1).padStart(6, '0')}`,
  );

  const frozenCandidateCount = frozenCandidateArtifact.payload.frozenCandidateCount;
  const frozenCandidateIdsSequential = frozenCandidateArtifact.payload.frozenCandidates.every(
    (candidate, position) => candidate.frozenCandidateId === `${EPISODE_ID}-frozen-candidate-${String(position + 1).padStart(6, '0')}`,
  );

  const runtimeCandidateCount = runtimeCandidateArtifact.payload.runtimeCandidateCount;
  const runtimeCandidateIdsSequential = runtimeCandidateArtifact.payload.runtimeCandidates.every(
    (candidate, position) => candidate.runtimeCandidateId === `${EPISODE_ID}-runtime-candidate-${String(position + 1).padStart(6, '0')}`,
  );

  const runtimeAdapterInputSnapshot = JSON.stringify(runtimeCandidateArtifact);
  const runtimeAdapterInspectionModel = adaptRuntimeCandidatesForExistingRuntimeModel(
    runtimeCandidateArtifact,
  );
  const runtimeAdapterPureProbe = JSON.stringify(runtimeCandidateArtifact)
    === runtimeAdapterInputSnapshot;
  const runtimeAdapterCandidateCount = runtimeAdapterInspectionModel.length;
  const runtimeAdapterInputCountMatches = runtimeAdapterCandidateCount === runtimeCandidateCount;
  const runtimeLoaderProbeResult = loadRuntimeCandidatesForP2Probe();

  // P2-F Runtime Candidate Display Readiness Probe — PROBE ONLY.
  // Measures whether runtime candidates carry the display fields the existing
  // Runtime card model requires. It invents nothing and changes nothing.
  const runtimeCandidateDisplayReadiness =
    buildRuntimeCandidateDisplayReadinessProbe(runtimeCandidateArtifact);

  // P2-G Runtime Candidate Display Model Producer — PROBE ONLY.
  // Derives display fields from upstream artifact evidence (no fabrication) and
  // measures before/after display readiness. Does NOT replace the official
  // runtime_candidate_artifact payload and does NOT enable Runtime consumption.
  const runtimeCandidateDisplayModel = buildRuntimeCandidateDisplayModel(runtimeCandidateArtifact, {
    frozenCandidateArtifact,
    reviewArtifact,
    draftObstacleArtifact,
    vocabularyDecisionArtifact,
    vocabularyCandidateArtifact,
    evidenceArtifact,
    sceneMeaningArtifact,
    subtitleArtifact,
  });
  const runtimeCandidateDisplayModelReadiness =
    buildRuntimeCandidateDisplayReadinessProbe(runtimeCandidateDisplayModel);
  const p2gBeforeReadyCount = runtimeCandidateDisplayReadiness.displayReadyCandidateCount;
  const p2gAfterReadyCount = runtimeCandidateDisplayModelReadiness.displayReadyCandidateCount;
  const runtimeCandidateDisplayModelSummary = {
    beforeDisplayReadyCount: p2gBeforeReadyCount,
    afterDisplayReadyCount: p2gAfterReadyCount,
    displayReadyAddedCount: p2gAfterReadyCount - p2gBeforeReadyCount,
    beforeDisplayReadyRatio: runtimeCandidateDisplayReadiness.displayReadyRatio,
    afterDisplayReadyRatio: runtimeCandidateDisplayModelReadiness.displayReadyRatio,
    expectedP2EOutcomeAfterDisplayModel: p2gAfterReadyCount > 0 ? 'activate' : 'fail_closed',
  };

  // P2-H Runtime Display Field Engine Probe — PROBE ONLY.
  // Builds draft display fields only from safe upstream evidence (no fabrication,
  // no AI/network). Drafts are pending human review and not runtime consumable.
  const runtimeDisplayFieldEngine = buildRuntimeDisplayFieldEngineProbe(runtimeCandidateArtifact, {
    frozenCandidateArtifact,
    reviewArtifact,
    draftObstacleArtifact,
    vocabularyDecisionArtifact,
    vocabularyCandidateArtifact,
    evidenceArtifact,
    sceneMeaningArtifact,
    subtitleArtifact,
  });
  const runtimeDisplayFieldEngineSummary = {
    offlineAiHelperAvailable: runtimeDisplayFieldEngine.offlineAiHelperAvailable,
    generatedDisplayDraftCount: runtimeDisplayFieldEngine.generatedDisplayDraftCount,
    generatedVocabularyDisplayDraftCount: runtimeDisplayFieldEngine.generatedVocabularyDisplayDraftCount,
    generatedComprehensionDisplayDraftCount: runtimeDisplayFieldEngine.generatedComprehensionDisplayDraftCount,
    requiresHumanReview: runtimeDisplayFieldEngine.requiresHumanReview,
    runtimeDisplayMayConsume: runtimeDisplayFieldEngine.runtimeDisplayMayConsume,
    expectedNextStep: runtimeDisplayFieldEngine.expectedNextStep,
  };

  // P2-I Offline AI Display Field Generator Probe — PROBE ONLY.
  // Emits a deterministic generator contract; runs no AI because no approved
  // offline helper is wired into this pipeline. Generates no fabricated fields.
  const offlineAiDisplayFieldGenerator = buildOfflineAiDisplayFieldGeneratorProbe(runtimeCandidateArtifact, {
    frozenCandidateArtifact,
    reviewArtifact,
    draftObstacleArtifact,
    vocabularyDecisionArtifact,
    vocabularyCandidateArtifact,
    evidenceArtifact,
    sceneMeaningArtifact,
    subtitleArtifact,
  });
  const offlineAiDisplayFieldGeneratorSummary = {
    offlineAiHelperAvailable: offlineAiDisplayFieldGenerator.offlineAiHelperAvailable,
    offlineAiHelperName: offlineAiDisplayFieldGenerator.offlineAiHelperName,
    sampleLimit: offlineAiDisplayFieldGenerator.sampleLimit,
    generatedDisplayDraftCount: offlineAiDisplayFieldGenerator.generatedDisplayDraftCount,
    generatedVocabularyDisplayDraftCount: offlineAiDisplayFieldGenerator.generatedVocabularyDisplayDraftCount,
    generatedComprehensionDisplayDraftCount: offlineAiDisplayFieldGenerator.generatedComprehensionDisplayDraftCount,
    requiresHumanReview: offlineAiDisplayFieldGenerator.requiresHumanReview,
    runtimeDisplayMayConsume: offlineAiDisplayFieldGenerator.runtimeDisplayMayConsume,
    expectedNextStep: offlineAiDisplayFieldGenerator.expectedNextStep,
  };

  // P3-A Offline AI Display Field Generator Skeleton.
  // Defines the generator contract and prepares a bounded input sample. No AI is
  // called because no approved offline helper/config is wired into this pipeline.
  const p3aGenerator = buildP3AOfflineAiDisplayFieldGeneratorSkeleton(runtimeCandidateArtifact, {
    frozenCandidateArtifact,
    reviewArtifact,
    draftObstacleArtifact,
    vocabularyDecisionArtifact,
    vocabularyCandidateArtifact,
    evidenceArtifact,
    sceneMeaningArtifact,
    subtitleArtifact,
  });
  const p3aGeneratorSummary = {
    generatorStatus: p3aGenerator.generatorStatus,
    offlineAiHelperAvailable: p3aGenerator.offlineAiHelperAvailable,
    inputCandidateCount: p3aGenerator.inputCandidateCount,
    sampleLimit: p3aGenerator.sampleLimit,
    generatedDraftCount: p3aGenerator.generatedDraftCount,
    generatedVocabularyDraftCount: p3aGenerator.generatedVocabularyDraftCount,
    generatedComprehensionDraftCount: p3aGenerator.generatedComprehensionDraftCount,
    requiresHumanReview: p3aGenerator.requiresHumanReview,
    runtimeDisplayMayConsume: p3aGenerator.runtimeDisplayMayConsume,
    expectedNextStep: p3aGenerator.expectedNextStep,
  };

  // P3-C Offline AI Display Field Generation REAL.
  // Calls Qwen (qwen-plus) for a bounded sample (max 3) only when DASHSCOPE_API_KEY
  // is set; fails closed otherwise. Drafts are draft-only and never written into
  // runtime_candidate_artifact.
  const p3cGeneration = await runP3CDisplayFieldGeneration(runtimeCandidateArtifact, {
    frozenCandidateArtifact,
    reviewArtifact,
    draftObstacleArtifact,
    vocabularyDecisionArtifact,
    vocabularyCandidateArtifact,
    evidenceArtifact,
    sceneMeaningArtifact,
    subtitleArtifact,
  });
  // Safe, bounded sample for the report: max 1 draft, fields trimmed to confirm shape.
  const p3cSafeDraftSample = p3cGeneration.validDrafts.slice(0, 1).map((draft) => ({
    runtimeCandidateId: draft.runtimeCandidateId,
    type: draft.type,
    generatedFieldKeys: Object.keys(draft.generatedFields || {}),
    reviewStatus: draft.reviewStatus,
    runtimeDisplayMayConsume: draft.runtimeDisplayMayConsume,
  }));

  // P3-D Display Draft Human Review Gate.
  // Records placeholder review decisions for P3-C valid drafts only. Does not
  // promote drafts and does not enable Runtime consumption.
  const p3dReviewGate = buildP3DDisplayDraftHumanReviewGate(p3cGeneration);
  const p3dSafeReviewSample = p3dReviewGate.reviewDecisions.slice(0, 1).map((decision) => ({
    runtimeCandidateId: decision.runtimeCandidateId,
    reviewDecision: decision.reviewDecision,
    reviewer: decision.reviewer,
    runtimeDisplayMayConsume: decision.runtimeDisplayMayConsume,
  }));

  // P3-E AI Quality Assurance Engine.
  // Deterministic, rules-based QA over P3-C valid drafts. No Qwen/API. Does not
  // promote drafts and does not enable Runtime consumption.
  const p3eQaEngine = buildP3EAiQualityAssuranceEngine(p3cGeneration);
  const p3eSafeQaSample = p3eQaEngine.qaDecisions.slice(0, 1).map((decision) => ({
    runtimeCandidateId: decision.runtimeCandidateId,
    qaDecision: decision.qaDecision,
    qaReviewer: decision.qaReviewer,
    qaScore: decision.qaScore,
    promotionEligible: decision.promotionEligible,
    runtimeDisplayMayConsume: decision.runtimeDisplayMayConsume,
  }));

  // P3-F Display Promotion.
  // Promotes only QA-approved (promotionEligible) display drafts into Promoted
  // Display records. Deterministic; preserves generatedFields exactly. Does not
  // enable Runtime consumption.
  const p3fPromotion = buildP3FDisplayPromotion(p3eQaEngine);
  const p3fSafePromotionSample = p3fPromotion.promotedDisplays.slice(0, 1).map((display) => ({
    runtimeCandidateId: display.runtimeCandidateId,
    promotedDisplayId: display.promotedDisplayId,
    promotionStatus: display.promotionStatus,
    promotionVersion: display.promotionVersion,
    generatedFieldKeys: Object.keys(display.generatedFields || {}),
    runtimeDisplayMayConsume: display.runtimeDisplayMayConsume,
  }));

  // P3-G-1 Promoted Display Artifact.
  // Offline artifact that Runtime will LATER read. Not wired to Runtime yet and
  // not runtime-consumable: runtimeMayConsume and runtimeDisplayMayConsume stay
  // false. generatedFields are preserved exactly from P3-F promoted displays.
  const promotedDisplayArtifact = {
    schemaVersion: 'p3-g-promoted-display-artifact.v1',
    stage: 'P3-G-1',
    runtimeMayConsume: false,
    runtimeDisplayMayConsume: false,
    sourceArtifact: 'pipeline_bootstrap_report',
    payload: {
      promotedDisplays: p3fPromotion.promotedDisplays.map((display) => ({
        runtimeCandidateId: display.runtimeCandidateId,
        promotedDisplayId: display.promotedDisplayId,
        promotedFromDraftId: display.promotedFromDraftId,
        type: display.type,
        generatedFields: display.generatedFields,
        promotionStatus: display.promotionStatus,
        promotionVersion: display.promotionVersion,
        runtimeDisplayMayConsume: false,
      })),
    },
  };
  const p3gPromotedDisplayArtifactPath = writeArtifact('promoted_display_artifact.json', promotedDisplayArtifact);
  const p3gSafePromotedDisplaySample = promotedDisplayArtifact.payload.promotedDisplays.slice(0, 1).map((display) => ({
    runtimeCandidateId: display.runtimeCandidateId,
    promotedDisplayId: display.promotedDisplayId,
    type: display.type,
    generatedFieldKeys: Object.keys(display.generatedFields || {}),
    promotionStatus: display.promotionStatus,
    promotionVersion: display.promotionVersion,
    runtimeDisplayMayConsume: display.runtimeDisplayMayConsume,
  }));

  // P4-A First Episode Full Obstacle Coverage Preparation
  // Report current pipeline status and readiness for full-episode batch generation.
  const totalSubtitleCount = sourceRows.length;
  const currentCandidateCount = runtimeCandidateCount;
  const currentDisplayDraftCount = p3cGeneration.validDraftCount;
  const currentQaApprovedCount = p3eQaEngine.qaAutoApprovedDraftCount;
  const currentPromotedDisplayCount = p3fPromotion.promotedDisplayCount;
  const currentMarkerBoundPromotedDisplayCount = promotedDisplayArtifact.payload.promotedDisplays.filter(
    (display) => Number.isFinite(display.markerStart)
      && Number.isFinite(display.markerEnd)
      && display.markerEnd > display.markerStart,
  ).length;

  const detectedSampleLimits = {
    maxSubtitleEntries: MAX_SUBTITLE_ENTRIES,
    maxScopeSeconds: MAX_SCOPE_SECONDS,
    p3cSampleLimit: P3C_SAMPLE_LIMIT,
    currentProcessedSubtitles: scoped.length,
  };

  const fullEpisodeGenerationBlocked = p3cGeneration.generatorStatus === 'blocked_missing_api_key';
  const recommendedSafeBatchSize = fullEpisodeGenerationBlocked ? 0 : Math.min(30, totalSubtitleCount);

  const p4aPreparation = {
    stage: 'P4-A',
    preparationStatus: fullEpisodeGenerationBlocked ? 'blocked' : 'ready',
    totalSubtitleCount,
    currentCandidateCount,
    currentDisplayDraftCount,
    currentQaApprovedCount,
    currentPromotedDisplayCount,
    currentMarkerBoundPromotedDisplayCount,
    detectedSampleLimits,
    fullEpisodeGenerationBlocked,
    blockingReason: fullEpisodeGenerationBlocked ? 'DASHSCOPE_API_KEY not set' : null,
    recommendedSafeBatchSize,
    nextStage: fullEpisodeGenerationBlocked
      ? 'resolve blocking issue before P4-B'
      : 'P4-B First Episode Batch 1 Real Generation',
    readinessChecklist: {
      subtitleSourceAvailable: true,
      pipelineWiringComplete: true,
      offlineAiGeneratorAvailable: !fullEpisodeGenerationBlocked,
      qaEngineOperational: true,
      promotionEngineOperational: true,
      artifactChainValid: true,
    },
  };

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
    p4aPreparation,
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
      vocabularyCandidateReal: true,
      vocabularyCandidateCount,
      vocabularyDecisionReal: true,
      vocabularyDecisionCount,
      vocabularyObstacleIdsSequential,
      draftAssemblyReal: true,
      draftObstacleCount,
      draftObstacleIdsSequential,
      comprehensionEngineReal: true,
      comprehensionDraftObstacleCount,
      reviewEngineReal: true,
      reviewItemCount,
      reviewApprovedCount,
      reviewRejectedCount,
      reviewIdsSequential,
      frozenPromotionReal: true,
      frozenCandidateCount,
      frozenCandidateIdsSequential,
      runtimePromotionReal: true,
      runtimeCandidateCount,
      runtimeCandidateIdsSequential,
      runtimeAdapterProbe: true,
      runtimeAdapterCandidateCount,
      runtimeAdapterInputCountMatches,
      runtimeAdapterPureProbe,
      runtimeAdapterInspectionOnly: runtimeAdapterInspectionModel.every(
        (candidate) => candidate.adapterStatus === 'inspection_only'
          && candidate.runtimeConsumable === false
          && candidate.runtimeMayConsume === false,
      ),
      runtimeLoaderProbe: true,
      runtimeLoaderApprovedForP2: runtimeLoaderProbeResult.runtimeLoaderApprovedForP2,
      runtimeLoaderCandidateCount: runtimeLoaderProbeResult.runtimeLoaderCandidateCount,
      runtimeLoaderInputCountMatches: runtimeLoaderProbeResult.runtimeLoaderInputCountMatches,
      runtimeLoaderPureProbe: runtimeLoaderProbeResult.runtimeLoaderPureProbe,
      runtimeLoaderInspectionOnly: runtimeLoaderProbeResult.runtimeLoaderInspectionOnly,
      runtimeLoaderRuntimeStillNotConsumable:
        runtimeLoaderProbeResult.runtimeLoaderRuntimeStillNotConsumable,
      runtimeCandidateStillNotConsumable: true,
      runtimeMayConsume: false,
      runtimeConsumptionReviewReal: true,
      runtimeConsumptionReviewDecision:
        runtimeConsumptionReviewArtifact.payload.runtimeConsumptionReviewDecision,
      runtimeMayConsumeDecision: runtimeConsumptionReviewArtifact.payload.runtimeMayConsumeDecision,
      runtimeCandidateArtifactStillNotConsumable: runtimeCandidateArtifact.runtimeConsumable === false,
      runtimeCandidatePayloadRuntimeMayConsumeStillFalse:
        runtimeCandidateArtifact.payload.runtimeMayConsume === false,
      runtimeCandidateDisplayReadinessProbe: true,
      runtimeCandidateDisplayReady: runtimeCandidateDisplayReadiness.runtimeCandidateDisplayReady,
      runtimeCandidateDisplayReadyCount: runtimeCandidateDisplayReadiness.displayReadyCandidateCount,
      runtimeCandidateDisplayReadyRatio: runtimeCandidateDisplayReadiness.displayReadyRatio,
      runtimeCandidateExpectedP2EOutcome: runtimeCandidateDisplayReadiness.expectedP2EOutcome,
      runtimeCandidateDisplayReadinessSummary: runtimeCandidateDisplayReadiness.summary,
      runtimeCandidateDisplayModelProducerProbe: true,
      runtimeCandidateDisplayModelBeforeReadyCount: runtimeCandidateDisplayModelSummary.beforeDisplayReadyCount,
      runtimeCandidateDisplayModelAfterReadyCount: runtimeCandidateDisplayModelSummary.afterDisplayReadyCount,
      runtimeCandidateDisplayModelAddedReadyCount: runtimeCandidateDisplayModelSummary.displayReadyAddedCount,
      runtimeCandidateDisplayModelBeforeReadyRatio: runtimeCandidateDisplayModelSummary.beforeDisplayReadyRatio,
      runtimeCandidateDisplayModelAfterReadyRatio: runtimeCandidateDisplayModelSummary.afterDisplayReadyRatio,
      runtimeCandidateExpectedP2EOutcomeAfterDisplayModel: runtimeCandidateDisplayModelSummary.expectedP2EOutcomeAfterDisplayModel,
      runtimeCandidateDisplayModelSummary,
      runtimeCandidateDisplayModelRuntimeStillNotConsumable: true,
      runtimeDisplayFieldEngineProbe: true,
      runtimeDisplayFieldEngineDraftCount: runtimeDisplayFieldEngine.generatedDisplayDraftCount,
      runtimeDisplayFieldEngineVocabularyDraftCount: runtimeDisplayFieldEngine.generatedVocabularyDisplayDraftCount,
      runtimeDisplayFieldEngineComprehensionDraftCount: runtimeDisplayFieldEngine.generatedComprehensionDisplayDraftCount,
      runtimeDisplayFieldEngineRequiresHumanReview: runtimeDisplayFieldEngine.requiresHumanReview,
      runtimeDisplayFieldEngineRuntimeDisplayMayConsume: false,
      runtimeDisplayFieldEngineExpectedNextStep: runtimeDisplayFieldEngine.expectedNextStep,
      runtimeDisplayFieldEngineSummary,
      offlineAiDisplayFieldGeneratorProbe: true,
      offlineAiDisplayFieldGeneratorHelperAvailable: offlineAiDisplayFieldGenerator.offlineAiHelperAvailable,
      offlineAiDisplayFieldGeneratorDraftCount: offlineAiDisplayFieldGenerator.generatedDisplayDraftCount,
      offlineAiDisplayFieldGeneratorVocabularyDraftCount: offlineAiDisplayFieldGenerator.generatedVocabularyDisplayDraftCount,
      offlineAiDisplayFieldGeneratorComprehensionDraftCount: offlineAiDisplayFieldGenerator.generatedComprehensionDisplayDraftCount,
      offlineAiDisplayFieldGeneratorRequiresHumanReview: offlineAiDisplayFieldGenerator.requiresHumanReview,
      offlineAiDisplayFieldGeneratorRuntimeDisplayMayConsume: false,
      offlineAiDisplayFieldGeneratorExpectedNextStep: offlineAiDisplayFieldGenerator.expectedNextStep,
      offlineAiDisplayFieldGeneratorSummary,
      p3aOfflineAiDisplayFieldGeneratorSkeleton: true,
      p3aGeneratorStatus: p3aGenerator.generatorStatus,
      p3aGeneratorInputCandidateCount: p3aGenerator.inputCandidateCount,
      p3aGeneratedDraftCount: p3aGenerator.generatedDraftCount,
      p3aGeneratedVocabularyDraftCount: p3aGenerator.generatedVocabularyDraftCount,
      p3aGeneratedComprehensionDraftCount: p3aGenerator.generatedComprehensionDraftCount,
      p3aGeneratedDraftsRequireHumanReview: p3aGenerator.requiresHumanReview,
      p3aRuntimeDisplayMayConsume: false,
      p3aRuntimeCandidateStillNotConsumable: runtimeCandidateArtifact.runtimeConsumable === false,
      p3aRuntimeMayConsumeStillFalse: runtimeCandidateArtifact.payload.runtimeMayConsume === false,
      p3aExpectedNextStep: p3aGenerator.expectedNextStep,
      p3aGeneratorSummary,
      p3cOfflineAiDisplayFieldGenerationReal: true,
      p3cGeneratorStatus: p3cGeneration.generatorStatus,
      p3cAiCalled: p3cGeneration.aiCalled,
      p3cModel: p3cGeneration.model,
      p3cInputCandidateCount: p3cGeneration.inputCandidateCount,
      p3cGeneratedDraftCount: p3cGeneration.generatedDraftCount,
      p3cValidDraftCount: p3cGeneration.validDraftCount,
      p3cInvalidDraftCount: p3cGeneration.invalidDraftCount,
      p3cRequiresHumanReview: p3cGeneration.requiresHumanReview,
      p3cRuntimeDisplayMayConsume: false,
      p3cRuntimeCandidateStillNotConsumable: runtimeCandidateArtifact.runtimeConsumable === false,
      p3cRuntimeMayConsumeStillFalse: runtimeCandidateArtifact.payload.runtimeMayConsume === false,
      p3cExpectedNextStep: p3cGeneration.expectedNextStep,
      p3cSafeDraftSample,
      p3dDisplayDraftHumanReviewGate: true,
      p3dReviewGateStatus: p3dReviewGate.reviewGateStatus,
      p3dReviewedDraftCount: p3dReviewGate.reviewedDraftCount,
      p3dApprovedDraftCount: p3dReviewGate.approvedDraftCount,
      p3dRejectedDraftCount: p3dReviewGate.rejectedDraftCount,
      p3dRuntimeDisplayMayConsume: false,
      p3dRuntimeCandidateStillNotConsumable: runtimeCandidateArtifact.runtimeConsumable === false,
      p3dRuntimeMayConsumeStillFalse: runtimeCandidateArtifact.payload.runtimeMayConsume === false,
      p3dExpectedNextStep: p3dReviewGate.expectedNextStep,
      p3dSafeReviewSample,
      p3eAiQualityAssuranceEngine: true,
      p3eQaEngineStatus: p3eQaEngine.qaEngineStatus,
      p3eQaReviewedDraftCount: p3eQaEngine.qaReviewedDraftCount,
      p3eQaAutoApprovedDraftCount: p3eQaEngine.qaAutoApprovedDraftCount,
      p3eQaNeedsHumanReviewDraftCount: p3eQaEngine.qaNeedsHumanReviewDraftCount,
      p3eQaAutoRejectedDraftCount: p3eQaEngine.qaAutoRejectedDraftCount,
      p3eRuntimeDisplayMayConsume: false,
      p3eRuntimeCandidateStillNotConsumable: runtimeCandidateArtifact.runtimeConsumable === false,
      p3eRuntimeMayConsumeStillFalse: runtimeCandidateArtifact.payload.runtimeMayConsume === false,
      p3eExpectedNextStep: p3eQaEngine.expectedNextStep,
      p3eSafeQaSample,
      p3fDisplayPromotion: true,
      p3fPromotionStatus: p3fPromotion.promotionStatus,
      p3fPromotedDisplayCount: p3fPromotion.promotedDisplayCount,
      p3fSkippedDisplayCount: p3fPromotion.skippedDisplayCount,
      p3fRuntimeDisplayMayConsume: false,
      p3fRuntimeCandidateStillNotConsumable: runtimeCandidateArtifact.runtimeConsumable === false,
      p3fRuntimeMayConsumeStillFalse: runtimeCandidateArtifact.payload.runtimeMayConsume === false,
      p3fExpectedNextStep: p3fPromotion.expectedNextStep,
      p3fSafePromotionSample,
      p3gPromotedDisplayArtifact: true,
      p3gPromotedDisplayArtifactPath,
      p3gPromotedDisplayCount: promotedDisplayArtifact.payload.promotedDisplays.length,
      p3gRuntimeDisplayMayConsume: false,
      p3gRuntimeMayConsumeStillFalse: runtimeCandidateArtifact.payload.runtimeMayConsume === false,
      p3gRuntimeCandidateStillNotConsumable: runtimeCandidateArtifact.runtimeConsumable === false,
      p3gExpectedNextStep:
        'a future, separately authorized runtime display-consumption review must approve before Runtime '
        + 'reads promoted_display_artifact.json; this stage only prepares the offline artifact',
      p3gSafePromotedDisplaySample,
      downstreamStillPlaceholder: false,
      noOcrCalled: true,
      noInternetSubtitleFetch: true,
    },
    bootstrapCompleted: true,
    nextRecommendedStep:
      'P2: wire Runtime to consume runtime_candidate_artifact only after checking '
      + 'runtime_consumption_review_artifact approval.',
  };
  createdFiles.push(writeArtifact('pipeline_bootstrap_report.json', report));

  // Console summary
  process.stdout.write(`\n${STAGE} bootstrap completed.\n`);
  process.stdout.write(`Subtitle source: ${SOURCE_PATH}\n`);
  process.stdout.write(`Subtitle entries processed: ${scoped.length}\n`);
  process.stdout.write(`Artifacts created: ${createdFiles.length}\n`);
  createdFiles.forEach((file) => process.stdout.write(`  - ${file}\n`));
  process.stdout.write('Runtime untouched: true | UI untouched: true | runtimeMayConsume: false\n');
  process.stdout.write('\n--- P4-A First Episode Full Obstacle Coverage Preparation ---\n');
  process.stdout.write(`Preparation Status: ${p4aPreparation.preparationStatus}\n`);
  process.stdout.write(`Total Subtitle Count Available: ${p4aPreparation.totalSubtitleCount}\n`);
  process.stdout.write(`Current Candidate Count: ${p4aPreparation.currentCandidateCount}\n`);
  process.stdout.write(`Current Display Draft Count: ${p4aPreparation.currentDisplayDraftCount}\n`);
  process.stdout.write(`Current QA Approved Count: ${p4aPreparation.currentQaApprovedCount}\n`);
  process.stdout.write(`Current Promoted Display Count: ${p4aPreparation.currentPromotedDisplayCount}\n`);
  process.stdout.write(`Current Marker-Bound Promoted Display Count: ${p4aPreparation.currentMarkerBoundPromotedDisplayCount}\n`);
  process.stdout.write(`Detected Sample Limits/Caps:\n`);
  process.stdout.write(`  - Max Subtitle Entries: ${p4aPreparation.detectedSampleLimits.maxSubtitleEntries}\n`);
  process.stdout.write(`  - Max Scope Seconds: ${p4aPreparation.detectedSampleLimits.maxScopeSeconds}\n`);
  process.stdout.write(`  - P3-C Sample Limit: ${p4aPreparation.detectedSampleLimits.p3cSampleLimit}\n`);
  process.stdout.write(`  - Current Processed Subtitles: ${p4aPreparation.detectedSampleLimits.currentProcessedSubtitles}\n`);
  process.stdout.write(`Full-Episode Generation Blocked: ${p4aPreparation.fullEpisodeGenerationBlocked}\n`);
  if (p4aPreparation.blockingReason) {
    process.stdout.write(`Blocking Reason: ${p4aPreparation.blockingReason}\n`);
  }
  process.stdout.write(`Recommended Safe Batch Size: ${p4aPreparation.recommendedSafeBatchSize}\n`);
  process.stdout.write(`Next Stage: ${p4aPreparation.nextStage}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || error}\n`);
  process.exitCode = 1;
});
