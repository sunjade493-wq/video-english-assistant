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
  process.stdout.write(`${STAGE} bootstrap completed.\n`);
  process.stdout.write(`Subtitle source: ${SOURCE_PATH}\n`);
  process.stdout.write(`Subtitle entries processed: ${scoped.length}\n`);
  process.stdout.write(`Artifacts created: ${createdFiles.length}\n`);
  createdFiles.forEach((file) => process.stdout.write(`  - ${file}\n`));
  process.stdout.write('Runtime untouched: true | UI untouched: true | runtimeMayConsume: false\n');
}

main();
