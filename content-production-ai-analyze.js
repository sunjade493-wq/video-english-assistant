#!/usr/bin/env node
/*
 * V2.6C Real AI Analyze Engine v1
 *
 * Content-production only: this module may call an AI provider to turn subtitle
 * data into frozen obstacle data. Runtime code must only read the generated JSON.
 */

const fs = require('fs');

const SCHEMA_VERSION = 'v2.6c-real-ai-analyze-engine-v1';
const ENGINE_VERSION = 'V2.6C Real AI Analyze Engine v1';

const LEVEL_CEFR_BRIDGE = {
  junior: { label: 'Junior High (1500)', cefr: ['A1', 'A2'], oxfordBands: ['A1', 'A2'] },
  senior: { label: 'Senior High (3500)', cefr: ['A1', 'A2', 'B1'], oxfordBands: ['A1', 'A2', 'B1'] },
  cet4: { label: 'CET-4 (4500)', cefr: ['A1', 'A2', 'B1', 'B2'], oxfordBands: ['A1', 'A2', 'B1', 'B2'] },
  cet6: { label: 'CET-6 (6000)', cefr: ['A1', 'A2', 'B1', 'B2'], oxfordBands: ['A1', 'A2', 'B1', 'B2'] },
  tem4: { label: 'TEM-4 (8000)', cefr: ['A1', 'A2', 'B1', 'B2', 'C1'], oxfordBands: ['A1', 'A2', 'B1', 'B2', 'C1'] },
  tem8: { label: 'TEM-8 (12000)', cefr: ['A1', 'A2', 'B1', 'B2', 'C1'], oxfordBands: ['A1', 'A2', 'B1', 'B2', 'C1'] },
  gre: { label: 'GRE (20000+)', cefr: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], oxfordBands: ['A1', 'A2', 'B1', 'B2', 'C1'] },
};

const COMPREHENSION_CATEGORIES = [
  'fixed expression',
  'phrasal verb',
  'idiom',
  'slang',
  'spoken contraction',
  'cultural expression',
  'elliptical expression',
  'high-frequency TV expression',
  'known words with difficult combined meaning',
];

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9']+/g, '-')
    .replace(/^-+|-+$/g, '') || 'obstacle';
}

function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9']+/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeSubtitleItems(subtitleItems) {
  return (subtitleItems || []).map((item, index) => {
    const text = String(item.text || '');
    const start = Number.isFinite(item.start) ? item.start : 0;

    return {
      id: item.id || `subtitle-${index + 1}`,
      text,
      start,
      end: Number.isFinite(item.end) ? item.end : start + text.length,
    };
  });
}

function findSurfaceRange(subtitleItem, surfaceText) {
  const source = String(subtitleItem.text || '');
  const surface = String(surfaceText || '').trim();
  const exactIndex = surface ? source.indexOf(surface) : -1;

  if (exactIndex >= 0) {
    return {
      start: subtitleItem.start + exactIndex,
      end: subtitleItem.start + exactIndex + surface.length,
      surfaceText: source.slice(exactIndex, exactIndex + surface.length),
    };
  }

  const normalizedSurface = normalizeText(surface);
  const words = normalizedSurface ? normalizedSurface.split(' ') : [];

  if (words.length > 0) {
    const matches = [...source.matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g)].map((match) => ({
      value: normalizeText(match[0]),
      index: match.index,
      text: match[0],
    }));

    for (let index = 0; index <= matches.length - words.length; index += 1) {
      const isMatch = words.every((word, offset) => matches[index + offset].value === word);

      if (isMatch) {
        const start = matches[index].index;
        const last = matches[index + words.length - 1];
        const end = last.index + last.text.length;

        return {
          start: subtitleItem.start + start,
          end: subtitleItem.start + end,
          surfaceText: source.slice(start, end),
        };
      }
    }
  }

  return {
    start: subtitleItem.start,
    end: subtitleItem.start,
    surfaceText: surface,
  };
}

function buildVocabExplanation(obstacle) {
  return `${obstacle.word} ${obstacle.phonetic} ${obstacle.partOfSpeech}\nSentence meaning: ${obstacle.sentenceMeaning}`.trim();
}

function buildComprehensionExplanation(obstacle) {
  return `${obstacle.prototype}\nLiteral meaning: ${obstacle.literal}\nActual meaning: ${obstacle.actual}\nGrammar explanation: ${obstacle.grammar}`;
}

function normalizeVocabObstacle(rawObstacle, subtitleItem, occurrence) {
  const word = String(rawObstacle.word || rawObstacle.baseForm || '').trim().toLowerCase();
  const range = findSurfaceRange(subtitleItem, rawObstacle.surfaceText || word);
  const obstacle = {
    id: rawObstacle.id || `word-${slugify(word)}-${subtitleItem.id}-${occurrence + 1}`,
    engineId: `vocab-${subtitleItem.id}-${slugify(word)}-${range.start}-${occurrence}`,
    subtitleId: subtitleItem.id,
    type: 'vocab',
    kind: 'word',
    label: '生词',
    surfaceText: range.surfaceText,
    baseForm: word,
    word,
    phonetic: String(rawObstacle.phonetic || '').trim(),
    partOfSpeech: String(rawObstacle.partOfSpeech || '').trim(),
    sentenceMeaning: String(rawObstacle.sentenceMeaning || '').trim(),
    translation: String(rawObstacle.sentenceMeaning || '').trim(),
    cefr: String(rawObstacle.cefr || '').trim(),
    oxfordSource: rawObstacle.oxfordSource || 'Oxford 3000/5000 + CEFR mapping',
    start: range.start,
    end: range.end,
    index: range.start,
  };

  obstacle.explanation = rawObstacle.explanation || buildVocabExplanation(obstacle);
  return obstacle;
}

function normalizeComprehensionObstacle(rawObstacle, subtitleItem, occurrence) {
  const prototype = String(rawObstacle.prototype || rawObstacle.baseForm || rawObstacle.phrase || '').trim();
  const range = findSurfaceRange(subtitleItem, rawObstacle.surfaceText || rawObstacle.source || rawObstacle.phrase || prototype);
  const phrase = String(rawObstacle.phrase || rawObstacle.baseForm || range.surfaceText || prototype).trim();
  const obstacle = {
    id: rawObstacle.id || `understanding-${slugify(phrase)}-${subtitleItem.id}-${occurrence + 1}`,
    engineId: `comprehension-${subtitleItem.id}-${slugify(prototype || phrase)}-${range.start}-${occurrence}`,
    subtitleId: subtitleItem.id,
    type: 'comprehension',
    kind: 'understanding',
    label: '理解',
    surfaceText: range.surfaceText,
    source: range.surfaceText,
    baseForm: phrase,
    phrase,
    prototype,
    literal: String(rawObstacle.literal || '').trim(),
    actual: String(rawObstacle.actual || '').trim(),
    grammar: String(rawObstacle.grammar || '').trim(),
    category: rawObstacle.category || 'known words with difficult combined meaning',
    start: range.start,
    end: range.end,
    index: range.start,
  };

  obstacle.explanation = rawObstacle.explanation || buildComprehensionExplanation(obstacle);
  return obstacle;
}

function validateObstacleShape(obstacle) {
  const requiredBaseFields = ['id', 'subtitleId', 'type', 'kind', 'surfaceText', 'baseForm', 'explanation', 'start', 'end', 'index'];
  requiredBaseFields.forEach((fieldName) => {
    if (!(fieldName in obstacle)) {
      throw new Error(`Missing obstacle field: ${fieldName}`);
    }
  });

  if (obstacle.type === 'vocab') {
    ['word', 'phonetic', 'partOfSpeech', 'sentenceMeaning'].forEach((fieldName) => {
      if (!obstacle[fieldName]) {
        throw new Error(`Missing vocab obstacle field: ${fieldName}`);
      }
    });
  } else if (obstacle.type === 'comprehension') {
    ['prototype', 'literal', 'actual', 'grammar'].forEach((fieldName) => {
      if (!obstacle[fieldName]) {
        throw new Error(`Missing comprehension obstacle field: ${fieldName}`);
      }
    });

    if (/^\s*this is (an? )?(idiom|fixed expression)\.?\s*$/i.test(obstacle.grammar)) {
      throw new Error(`Invalid shallow grammar explanation for ${obstacle.id}`);
    }
  } else {
    throw new Error(`Unsupported obstacle type: ${obstacle.type}`);
  }
}

function normalizeAIOutput(aiOutput, subtitleItems, options = {}) {
  const sourceObstacles = Array.isArray(aiOutput) ? aiOutput : aiOutput?.obstacles;

  if (!Array.isArray(sourceObstacles)) {
    throw new Error('AI output must be an array or an object with an obstacles array');
  }

  const bySubtitleId = new Map(normalizeSubtitleItems(subtitleItems).map((item) => [item.id, item]));
  const occurrenceCounts = new Map();
  const obstacles = sourceObstacles.map((rawObstacle, rawIndex) => {
    const subtitleItem = bySubtitleId.get(rawObstacle.subtitleId);

    if (!subtitleItem) {
      throw new Error(`Unknown subtitleId in AI output: ${rawObstacle.subtitleId}`);
    }

    const key = `${rawObstacle.type}:${subtitleItem.id}:${rawObstacle.baseForm || rawObstacle.word || rawObstacle.phrase || rawObstacle.prototype}`;
    const occurrence = occurrenceCounts.get(key) || 0;
    occurrenceCounts.set(key, occurrence + 1);

    const obstacle = rawObstacle.type === 'vocab'
      ? normalizeVocabObstacle(rawObstacle, subtitleItem, occurrence)
      : normalizeComprehensionObstacle(rawObstacle, subtitleItem, occurrence);

    validateObstacleShape(obstacle);
    obstacle.aiOrder = rawIndex;
    return obstacle;
  }).sort((firstObstacle, secondObstacle) => {
    if (firstObstacle.start !== secondObstacle.start) {
      return firstObstacle.start - secondObstacle.start;
    }

    return firstObstacle.aiOrder - secondObstacle.aiOrder;
  });

  obstacles.forEach((obstacle) => {
    delete obstacle.aiOrder;
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    engineVersion: ENGINE_VERSION,
    generatedAt: options.generatedAt || new Date().toISOString(),
    source: 'content-production-ai',
    vocabularyLevel: options.level || 'junior',
    vocabularySource: 'Oxford 3000 / 5000 + CEFR mapping',
    cefrBridge: LEVEL_CEFR_BRIDGE[options.level || 'junior'] || LEVEL_CEFR_BRIDGE.junior,
    subtitleItems: normalizeSubtitleItems(subtitleItems),
    obstacles,
  };
}

function buildAnalyzePrompt(subtitleItems, options = {}) {
  const level = options.level || 'junior';
  const bridge = LEVEL_CEFR_BRIDGE[level] || LEVEL_CEFR_BRIDGE.junior;

  return `You are the V2.6C Real AI Analyze Engine v1 for content production only.\n\nFrozen rules:\n- Runtime must never call AI; produce frozen JSON for runtime.\n- Generate two obstacle types only: vocab and comprehension.\n- Preserve subtitle order. Do not group all vocab first or all comprehension first.\n- The same subtitle may contain multiple vocab obstacles, multiple comprehension obstacles, or both.\n- Vocab detection is lemma-based and follows the selected user level exactly.\n- Vocab source: Oxford 3000 / 5000 + CEFR mapping. Selected level: ${level} (${bridge.label}); known CEFR/Oxford bands: ${bridge.oxfordBands.join(', ')}. Mark words above this level as vocab obstacles.\n- Vocab card fields: word, phonetic, partOfSpeech, Sentence meaning.\n- Comprehension categories: ${COMPREHENSION_CATEGORIES.join('; ')}.\n- Comprehension card fields: prototype, literal, actual, grammar. Grammar must explain why the expression means what it means; do not only say it is an idiom or fixed expression.\n\nReturn strict JSON with this shape: {"obstacles":[...]} and no markdown.\nEach obstacle must include subtitleId, type, surfaceText, baseForm. Vocab must include word, phonetic, partOfSpeech, sentenceMeaning, cefr. Comprehension must include phrase, prototype, literal, actual, grammar, category.\n\nSubtitles:\n${JSON.stringify(normalizeSubtitleItems(subtitleItems), null, 2)}`;
}

async function callOpenAIChatJSON(prompt, options = {}) {
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required when no aiClient is provided');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model || process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return only valid JSON for the requested frozen obstacle data.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI provider failed: ${response.status} ${await response.text()}`);
  }

  const body = await response.json();
  return JSON.parse(body.choices[0].message.content);
}

async function analyzeSubtitlesWithAI(subtitleItems, options = {}) {
  const prompt = buildAnalyzePrompt(subtitleItems, options);
  const aiOutput = options.aiClient
    ? await options.aiClient.generateObstacleData({ prompt, subtitleItems: normalizeSubtitleItems(subtitleItems), options })
    : await callOpenAIChatJSON(prompt, options);

  return normalizeAIOutput(aiOutput, subtitleItems, options);
}

function readSubtitleInput(inputPath) {
  const raw = fs.readFileSync(inputPath, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : parsed.subtitleItems || parsed.subtitles || [];
}

async function runCli(argv = process.argv.slice(2)) {
  const inputIndex = argv.indexOf('--input');
  const outputIndex = argv.indexOf('--output');
  const levelIndex = argv.indexOf('--level');

  if (inputIndex < 0 || outputIndex < 0) {
    throw new Error('Usage: node content-production-ai-analyze.js --input subtitles.json --output frozen-obstacles.json [--level junior]');
  }

  const inputPath = argv[inputIndex + 1];
  const outputPath = argv[outputIndex + 1];
  const level = levelIndex >= 0 ? argv[levelIndex + 1] : 'junior';
  const frozenData = await analyzeSubtitlesWithAI(readSubtitleInput(inputPath), { level });
  fs.writeFileSync(outputPath, `${JSON.stringify(frozenData, null, 2)}\n`);
  return frozenData;
}

if (require.main === module) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  SCHEMA_VERSION,
  ENGINE_VERSION,
  LEVEL_CEFR_BRIDGE,
  COMPREHENSION_CATEGORIES,
  normalizeSubtitleItems,
  buildAnalyzePrompt,
  normalizeAIOutput,
  analyzeSubtitlesWithAI,
  runCli,
};
