const fs = require('fs');
const vm = require('vm');

const context = { console, window: {}, globalThis: {} };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('analyze-engine.js', 'utf8'), context);

const analyzeEngine = context.window.AnalyzeEngine;
const verification = JSON.parse(fs.readFileSync('verification/v2.6d-real-ai-obstacles.json', 'utf8'));
const forbiddenPhrases = analyzeEngine.realAI.v26aMockSamplePhrases;
const sampleText = verification.inputSubtitleSample.map((item) => item.text).join(' ').toLowerCase();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

forbiddenPhrases.forEach((phrase) => {
  assert(!sampleText.includes(phrase), `V2.6D sample must not reuse V2.6A mock phrase: ${phrase}`);
});

assert(verification.analysisPath === 'real-ai', 'V2.6D artifact must declare the real-ai analysis path.');
assert(verification.aiCall?.promptVersion === analyzeEngine.realAI.promptVersion, 'V2.6D artifact must match the current real AI prompt version.');
assert(typeof analyzeEngine.analyzeSubtitleItemsWithAI === 'function', 'AnalyzeEngine must expose analyzeSubtitleItemsWithAI.');
assert(verification.obstacles.some((obstacle) => obstacle.type === 'vocab'), 'V2.6D artifact must include vocab obstacles.');
assert(verification.obstacles.some((obstacle) => obstacle.type === 'comprehension'), 'V2.6D artifact must include comprehension obstacles.');
assert(verification.obstacles.every((obstacle) => obstacle.generatedByAI === true), 'V2.6D artifact obstacles must be marked generatedByAI.');

const obstacleText = verification.obstacles.map((obstacle) => [
  obstacle.surfaceText,
  obstacle.baseForm,
  obstacle.phrase,
  obstacle.prototype,
].filter(Boolean).join(' ').toLowerCase()).join(' ');
forbiddenPhrases.forEach((phrase) => {
  assert(!obstacleText.includes(phrase), `V2.6D obstacles must not reuse V2.6A mock obstacle: ${phrase}`);
});

const mockVocabularyWords = new Set(Object.keys(analyzeEngine.vocabularyMockEntries));
const mockComprehensionForms = new Set(analyzeEngine.comprehensionMockEntries.map((entry) => entry.baseForm));
verification.obstacles.forEach((obstacle) => {
  if (obstacle.type === 'vocab') {
    assert(!mockVocabularyWords.has(obstacle.baseForm), `V2.6D vocab obstacle must not come from vocabularyMockEntries: ${obstacle.baseForm}`);
  }

  if (obstacle.type === 'comprehension') {
    assert(!mockComprehensionForms.has(obstacle.baseForm), `V2.6D comprehension obstacle must not come from comprehensionMockEntries: ${obstacle.baseForm}`);
  }
});

(async () => {
  let aiClientWasCalled = false;
  const realAIObstacles = await analyzeEngine.analyzeSubtitleItemsWithAI(verification.inputSubtitleSample, {
    level: 'junior',
    aiClient: {
      async analyzeObstacles(prompt) {
        aiClientWasCalled = true;
        assert(prompt.promptVersion === analyzeEngine.realAI.promptVersion, 'Real AI path must build the V2.6D prompt.');
        const promptText = JSON.stringify(prompt.messages).toLowerCase();
        forbiddenPhrases.forEach((phrase) => {
          assert(!promptText.includes(phrase), `Real AI prompt must not include V2.6A mock phrase: ${phrase}`);
        });
        return verification.aiGeneratedRawObstaclePayload;
      },
    },
  });

  assert(aiClientWasCalled, 'Real AI path must call the injected AI client.');
  assert(realAIObstacles.length === verification.obstacles.length, 'Real AI path must normalize every AI-generated obstacle.');
  assert(realAIObstacles.every((obstacle) => obstacle.generatedByAI === true), 'Real AI path output must mark obstacles as generatedByAI.');
  assert(realAIObstacles.some((obstacle) => obstacle.type === 'vocab'), 'Real AI path must return vocab obstacles.');
  assert(realAIObstacles.some((obstacle) => obstacle.type === 'comprehension'), 'Real AI path must return comprehension obstacles.');

  console.log('PASS V2.6D Real AI verification sample is new and normalizes AI-generated vocab/comprehension obstacles through analyzeSubtitleItemsWithAI');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
