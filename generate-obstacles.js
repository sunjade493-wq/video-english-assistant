#!/usr/bin/env node
const fs = require('node:fs/promises');
const path = require('node:path');
const { createJsonChatCompletion } = require('./ai-provider');

const DEFAULT_INPUT = 'sample-subtitle.srt';
const DEFAULT_OUTPUT = 'sample-obstacles.json';
const SCHEMA_VERSION = 'v2.7b-episode-obstacles';
const FORBIDDEN_COMPREHENSION_FIELDS = [
  'Grammar Explanation',
  'Usage Notes',
  'Example Sentences',
];
const COMPREHENSION_REQUIRED_FIELDS = ['Expression', '字面意思', '实际意思', '固定用法', '表示'];
const VOCABULARY_REQUIRED_FIELDS = ['word', 'phonetic', 'partOfSpeech', 'sentenceMeaning'];

function parseArgs(argv) {
  const args = {
    input: DEFAULT_INPUT,
    output: DEFAULT_OUTPUT,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if ((arg === '--input' || arg === '-i') && next) {
      args.input = next;
      index += 1;
    } else if ((arg === '--output' || arg === '-o') && next) {
      args.output = next;
      index += 1;
    }
  }

  return args;
}

function timestampToMilliseconds(timestamp) {
  const match = String(timestamp || '').trim().match(/^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/);

  if (!match) {
    throw new Error(`Invalid SRT timestamp: ${timestamp}`);
  }

  const [, hours, minutes, seconds, milliseconds] = match.map(Number);
  return (((hours * 60) + minutes) * 60 + seconds) * 1000 + milliseconds;
}

function parseSrt(source) {
  return String(source || '')
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((block, index) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      const numericIndex = /^\d+$/.test(lines[0]) ? lines.shift() : String(index + 1);
      const timingLine = lines.shift();
      const timingMatch = timingLine?.match(/^(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})$/);

      if (!timingMatch) {
        throw new Error(`Invalid SRT timing line in block ${numericIndex}: ${timingLine || '(missing)'}`);
      }

      const text = lines.join(' ').replace(/\s+/g, ' ').trim();

      return {
        id: `subtitle-${numericIndex}`,
        sequence: Number(numericIndex),
        startTime: timingMatch[1],
        endTime: timingMatch[2],
        startMs: timestampToMilliseconds(timingMatch[1]),
        endMs: timestampToMilliseconds(timingMatch[2]),
        text,
      };
    });
}

function buildAIPrompt(subtitleRecords) {
  return [
    {
      role: 'system',
      content: [
        'You produce frozen obstacle JSON for an English-learning episode pipeline.',
        'Return only valid JSON matching the requested shape.',
        'Do not include dictionary-style long explanations.',
        'Vocabulary cards must contain word, phonetic, partOfSpeech, sentenceMeaning.',
        'Comprehension cards must follow the V2.6E gold standard and contain exactly useful short fields: Expression, 字面意思, 实际意思, 固定用法, 表示.',
        'Do not include Grammar Explanation, Usage Notes, or Example Sentences.',
      ].join(' '),
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Identify vocabulary obstacles and comprehension obstacles in these subtitle records.',
        outputShape: {
          vocabularyObstacles: [
            {
              subtitleId: 'subtitle-1',
              surfaceText: 'word as it appears',
              word: 'lemma',
              phonetic: '/phonetic/',
              partOfSpeech: 'part of speech',
              sentenceMeaning: 'short Chinese sentence meaning',
            },
          ],
          comprehensionObstacles: [
            {
              subtitleId: 'subtitle-1',
              surfaceText: 'expression as it appears',
              Expression: 'short expression',
              字面意思: 'short Chinese literal meaning',
              实际意思: 'short Chinese actual meaning in context',
              固定用法: 'reusable prototype pattern with somebody/something slots where useful',
              表示: 'short Chinese stable meaning of the prototype',
            },
          ],
        },
        subtitleRecords,
      }),
    },
  ];
}

function assertRequiredFields(object, fields, label) {
  const missing = fields.filter((field) => typeof object?.[field] !== 'string' || object[field].trim() === '');

  if (missing.length > 0) {
    throw new Error(`${label} is missing required field(s): ${missing.join(', ')}`);
  }
}

function validateAIObstaclePayload(payload, subtitleIds) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('AI payload must be a JSON object.');
  }

  const vocabularyObstacles = Array.isArray(payload.vocabularyObstacles) ? payload.vocabularyObstacles : [];
  const comprehensionObstacles = Array.isArray(payload.comprehensionObstacles) ? payload.comprehensionObstacles : [];

  vocabularyObstacles.forEach((obstacle, index) => {
    assertRequiredFields(obstacle, VOCABULARY_REQUIRED_FIELDS, `vocabularyObstacles[${index}]`);

    if (obstacle.subtitleId && !subtitleIds.has(obstacle.subtitleId)) {
      throw new Error(`vocabularyObstacles[${index}] references unknown subtitleId: ${obstacle.subtitleId}`);
    }
  });

  comprehensionObstacles.forEach((obstacle, index) => {
    assertRequiredFields(obstacle, COMPREHENSION_REQUIRED_FIELDS, `comprehensionObstacles[${index}]`);

    if (obstacle.subtitleId && !subtitleIds.has(obstacle.subtitleId)) {
      throw new Error(`comprehensionObstacles[${index}] references unknown subtitleId: ${obstacle.subtitleId}`);
    }

    const forbidden = FORBIDDEN_COMPREHENSION_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(obstacle, field));

    if (forbidden.length > 0) {
      throw new Error(`comprehensionObstacles[${index}] contains forbidden field(s): ${forbidden.join(', ')}`);
    }
  });

  return {
    vocabularyObstacles,
    comprehensionObstacles,
  };
}

function slugify(value) {
  return String(value || 'obstacle').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'obstacle';
}

function findOffset(subtitleText, surfaceText) {
  const index = String(subtitleText || '').toLowerCase().indexOf(String(surfaceText || '').toLowerCase());
  return index >= 0 ? index : 0;
}

function normalizeAIObstacles(payload, subtitleRecords) {
  const recordsById = new Map(subtitleRecords.map((record) => [record.id, record]));
  const normalized = [];

  payload.vocabularyObstacles.forEach((obstacle, index) => {
    const subtitle = recordsById.get(obstacle.subtitleId) || subtitleRecords[0];
    const surfaceText = obstacle.surfaceText || obstacle.word;
    const offset = findOffset(subtitle.text, surfaceText);
    const start = subtitle.startMs + offset;

    normalized.push({
      id: `ai-vocab-${subtitle.id}-${slugify(obstacle.word)}-${index + 1}`,
      subtitleId: subtitle.id,
      type: 'vocab',
      kind: 'word',
      label: '生词',
      surfaceText,
      baseForm: obstacle.word,
      word: obstacle.word,
      phonetic: obstacle.phonetic,
      partOfSpeech: obstacle.partOfSpeech,
      sentenceMeaning: obstacle.sentenceMeaning,
      explanation: `${obstacle.word} ${obstacle.phonetic} ${obstacle.partOfSpeech}\n句中含义：${obstacle.sentenceMeaning}`,
      start,
      end: start + surfaceText.length,
      index: start,
      generatedByAI: true,
    });
  });

  payload.comprehensionObstacles.forEach((obstacle, index) => {
    const subtitle = recordsById.get(obstacle.subtitleId) || subtitleRecords[0];
    const surfaceText = obstacle.surfaceText || obstacle.Expression;
    const offset = findOffset(subtitle.text, surfaceText);
    const start = subtitle.startMs + offset;

    normalized.push({
      id: `ai-comprehension-${subtitle.id}-${slugify(obstacle.Expression)}-${index + 1}`,
      subtitleId: subtitle.id,
      type: 'comprehension',
      kind: 'understanding',
      label: '理解',
      surfaceText,
      baseForm: obstacle.Expression,
      phrase: obstacle.Expression,
      source: surfaceText,
      Expression: obstacle.Expression,
      literal: obstacle['字面意思'],
      actual: obstacle['实际意思'],
      fixedUsage: obstacle['固定用法'],
      means: obstacle['表示'],
      字面意思: obstacle['字面意思'],
      实际意思: obstacle['实际意思'],
      固定用法: obstacle['固定用法'],
      表示: obstacle['表示'],
      explanation: `${obstacle.Expression}\n字面意思：${obstacle['字面意思']}\n实际意思：${obstacle['实际意思']}\n固定用法：${obstacle['固定用法']}\n表示：${obstacle['表示']}`,
      start,
      end: start + surfaceText.length,
      index: start,
      generatedByAI: true,
    });
  });

  return normalized.sort((first, second) => first.start - second.start);
}

function buildFrozenEpisodeJson({ inputPath, providerResult, rawAIObstaclePayload, subtitleRecords, normalizedObstacles }) {
  return {
    schema: SCHEMA_VERSION,
    schemaVersion: '1.0.0',
    generatedByAI: true,
    metadata: {
      pipeline: 'V2.7B Actual OpenAI-Compatible Episode Pipeline',
      inputSubtitlePath: inputPath,
      outputObstaclePath: DEFAULT_OUTPUT,
      aiProvider: 'openai-compatible',
      model: providerResult.model,
      generatedAt: process.env.GENERATED_AT || new Date().toISOString(),
      status: 'human-review-required',
      frozen: false,
    },
    subtitleRecords,
    rawAIObstaclePayload,
    normalizedObstacles,
    verificationNotes: [
      'Provider is configured only through AI_BASE_URL, AI_API_KEY, and AI_MODEL.',
      'AI call is made during generation only; runtime reads this frozen JSON file and does not call AI.',
      'Vocabulary obstacles contain word, phonetic, partOfSpeech, and sentenceMeaning.',
      'Comprehension obstacles follow V2.6E fields: Expression, 字面意思, 实际意思, 固定用法, 表示.',
      'Human review is required before declaring any V2.7B freeze.',
    ],
  };
}

async function generateObstacles(options = {}) {
  const inputPath = options.input || DEFAULT_INPUT;
  const outputPath = options.output || DEFAULT_OUTPUT;
  const srt = await fs.readFile(inputPath, 'utf8');
  const subtitleRecords = parseSrt(srt);
  const subtitleIds = new Set(subtitleRecords.map((record) => record.id));
  const messages = buildAIPrompt(subtitleRecords);
  const providerResult = await createJsonChatCompletion(messages, options.providerOptions || {});
  const rawAIObstaclePayload = validateAIObstaclePayload(providerResult.jsonContent, subtitleIds);
  const normalizedObstacles = normalizeAIObstacles(rawAIObstaclePayload, subtitleRecords);
  const output = buildFrozenEpisodeJson({
    inputPath,
    providerResult,
    rawAIObstaclePayload,
    subtitleRecords,
    normalizedObstacles,
  });

  output.metadata.outputObstaclePath = outputPath;
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  return output;
}

async function main() {
  const args = parseArgs(process.argv);
  const output = await generateObstacles(args);
  console.log(`Generated ${output.normalizedObstacles.length} obstacles at ${args.output}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  COMPREHENSION_REQUIRED_FIELDS,
  FORBIDDEN_COMPREHENSION_FIELDS,
  VOCABULARY_REQUIRED_FIELDS,
  buildAIPrompt,
  generateObstacles,
  normalizeAIObstacles,
  parseSrt,
  validateAIObstaclePayload,
};
