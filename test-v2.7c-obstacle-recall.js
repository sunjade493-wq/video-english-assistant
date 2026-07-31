const fs = require('fs');
const {
  V27B_RECALL_FIXTURE_SUBTITLES,
  V27C_EXPECTED_RECALL_CANDIDATES,
  buildObstaclePrompt,
  validateRecallCandidates,
} = require('./generate-obstacles');

const prompt = buildObstaclePrompt(V27B_RECALL_FIXTURE_SUBTITLES);
const requiredPromptPhrases = [
  'Scan EVERY subtitle line',
  'Fixed expressions',
  'Phrasal verbs',
  'Spoken conversational chunks',
  'Multi-meaning simple expressions',
  'Context-dependent expressions',
  'KEEP ALL OF THEM',
  'Do not skip an expression merely because every individual word is simple',
  'Do not mark expressions that are fully transparent and provide no learning value',
  'Do NOT add Grammar Explanation',
  'Do NOT add Usage Notes',
  'Do NOT add Example Sentences',
];

requiredPromptPhrases.forEach((phrase) => {
  if (!prompt.includes(phrase)) {
    throw new Error(`V2.7C prompt missing required instruction: ${phrase}`);
  }
});

const sample = JSON.parse(fs.readFileSync('sample-obstacles.json', 'utf8'));
const validation = validateRecallCandidates(sample, V27C_EXPECTED_RECALL_CANDIDATES);

if (!validation.pass) {
  throw new Error(`V2.7C recall fixture missing candidates: ${validation.missing.join(', ')}`);
}

const forbiddenFields = [
  'grammarExplanation',
  'grammar',
  'usageNotes',
  'exampleSentences',
];

sample.obstacles.forEach((obstacle) => {
  forbiddenFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(obstacle, field)) {
      throw new Error(`V2.7C card format must not include ${field} for ${obstacle.expression}`);
    }
  });

  [
    'expression',
    'literalMeaningZh',
    'actualMeaningZh',
    'fixedUsageZh',
    'indicatesZh',
  ].forEach((field) => {
    if (!obstacle[field]) {
      throw new Error(`V2.7C sample obstacle missing ${field}: ${JSON.stringify(obstacle)}`);
    }
  });
});

const subtitleTwoObstacles = sample.obstacles.filter((obstacle) => obstacle.subtitleIndex === 2);
if (subtitleTwoObstacles.length < 2) {
  throw new Error('V2.7C same-subtitle rule expected multiple subtitle 2 obstacles to be preserved.');
}

console.log('PASS V2.7C obstacle recall prompt and fixture validation');
