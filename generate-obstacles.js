const fs = require('fs');
const path = require('path');
const { requestChatCompletion } = require('./ai-provider');

const V27B_RECALL_FIXTURE_SUBTITLES = [
  'I almost missed the train this morning, but Maya saved me a seat.',
  'No worries, we still have time to grab coffee before the meeting.',
  'Actually, can we skip it? I need to clear my head for a minute.',
  "Sure, but don't bottle it up if something is bothering you.",
  'Thanks. I just got a weird message from the landlord, and it threw me off.',
];

const V27C_EXPECTED_RECALL_CANDIDATES = [
  'No worries',
  'clear my head',
  'bottle it up',
  'threw me off',
  'saved me a seat',
  'grab coffee',
];

function buildObstaclePrompt(subtitleLines) {
  const numberedSubtitles = subtitleLines
    .map((line, index) => `${index + 1}. ${line}`)
    .join('\n');

  return `You are generating frozen comprehension-obstacle data for a video English learning episode.

Goal:
Improve RECALL of useful comprehension obstacles for Chinese learners while still avoiding meaningless over-tagging.

Core principle:
- Do NOT mark everything.
- Do avoid missing valid comprehension obstacles.
- Prefer learner value over excessive minimalism.
- Do not skip an expression merely because every individual word is simple.
- Do not mark expressions that are fully transparent and provide no learning value.

Scan requirements:
1. Scan EVERY subtitle line from start to end.
2. Preserve subtitle order in the output.
3. If one subtitle contains multiple valid comprehension obstacles, KEEP ALL OF THEM.
4. Never arbitrarily choose only one obstacle from a subtitle.

Actively target these candidate types:
1. Fixed expressions: e.g. "No worries", "Fair enough", "That figures", "Works for me".
2. Phrasal verbs: e.g. "throw somebody off", "bottle something up", "come up with something", "put up with something".
3. Idioms.
4. Slang.
5. Spoken conversational chunks: e.g. "save somebody a seat", "grab coffee", "make it work", "sounds good to me".
6. Multi-meaning simple expressions: e.g. "I'm good", "You got me", "I get it", "I'm in", "I'm not sold".
7. Context-dependent expressions where all words are simple but the combined meaning is not obvious to Chinese learners.
8. Expressions whose literal meaning differs from the actual meaning.
9. Common Chinese-learner confusion patterns that contain familiar vocabulary but are often misunderstood.

Negative rules:
- Do NOT mark transparent literal phrases.
- Do NOT mark ordinary grammar structures.
- Do NOT mark ordinary verb + object combinations.
- Do NOT mark phrases whose meaning can be understood directly from the words.
- Do NOT mark every noun phrase or every adjective phrase.
- Usually do not mark phrases like "open the door", "drink some water", "go home", "read the book", "sit down" unless context changes their meaning.

Required output format:
Return JSON only. Do not include Markdown.
The top-level object must be:
{
  "obstacles": [
    {
      "subtitleIndex": 1,
      "expression": "Expression",
      "surfaceText": "exact subtitle text span",
      "candidateType": "fixed expression | phrasal verb | idiom | slang | conversational chunk | multi-meaning expression | context-dependent expression | literal-vs-actual | learner-confusion pattern",
      "literalMeaningZh": "字面意思：...",
      "actualMeaningZh": "实际意思：...",
      "fixedUsageZh": "固定用法：...",
      "indicatesZh": "表示：..."
    }
  ]
}

Card-format constraints:
- Keep the V2.6E card format unchanged.
- Each generated comprehension card must contain exactly these content fields:
  Expression
  字面意思：
  实际意思：
  固定用法：
  表示：
- Do NOT add Grammar Explanation.
- Do NOT add Usage Notes.
- Do NOT add Example Sentences.

Subtitles:
${numberedSubtitles}`;
}

function normalizeExpression(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function extractObstacleExpressions(obstaclesJson) {
  const obstacles = Array.isArray(obstaclesJson)
    ? obstaclesJson
    : Array.isArray(obstaclesJson?.obstacles)
      ? obstaclesJson.obstacles
      : [];

  return obstacles.map((obstacle) => obstacle.expression || obstacle.surfaceText || obstacle.phrase || obstacle.baseForm);
}

function validateRecallCandidates(obstaclesJson, expectedCandidates = V27C_EXPECTED_RECALL_CANDIDATES) {
  const foundExpressions = new Set(extractObstacleExpressions(obstaclesJson).map(normalizeExpression));
  const missing = expectedCandidates.filter((candidate) => !foundExpressions.has(normalizeExpression(candidate)));

  return {
    pass: missing.length === 0,
    missing,
    expected: expectedCandidates,
    found: [...foundExpressions],
  };
}

function parseArgs(argv) {
  return argv.reduce((options, arg, index, args) => {
    if (arg === '--input') {
      return { ...options, input: args[index + 1] };
    }

    if (arg === '--output') {
      return { ...options, output: args[index + 1] };
    }

    if (arg === '--fixture') {
      return { ...options, fixture: true };
    }

    if (arg === '--print-prompt') {
      return { ...options, printPrompt: true };
    }

    return options;
  }, {});
}

function readSubtitleLines(inputPath) {
  if (!inputPath) {
    return V27B_RECALL_FIXTURE_SUBTITLES;
  }

  return fs.readFileSync(inputPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const subtitleLines = options.fixture ? V27B_RECALL_FIXTURE_SUBTITLES : readSubtitleLines(options.input);
  const prompt = buildObstaclePrompt(subtitleLines);

  if (options.printPrompt) {
    process.stdout.write(`${prompt}\n`);
    return;
  }

  const response = await requestChatCompletion({ prompt });
  const outputPath = options.output || path.join(process.cwd(), 'sample-obstacles.json');
  fs.writeFileSync(outputPath, `${JSON.stringify(response, null, 2)}\n`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  V27B_RECALL_FIXTURE_SUBTITLES,
  V27C_EXPECTED_RECALL_CANDIDATES,
  buildObstaclePrompt,
  extractObstacleExpressions,
  normalizeExpression,
  validateRecallCandidates,
};
