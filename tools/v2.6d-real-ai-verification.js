#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'verification', 'v2.6d-real-ai-obstacles.json');
const subtitleItems = [
  { id: 'v26d-subtitle-1', text: "I'm in.", start: 0, end: 7 },
  { id: 'v26d-subtitle-2', text: 'You got me.', start: 9, end: 20 },
  { id: 'v26d-subtitle-3', text: 'That figures.', start: 22, end: 35 },
  { id: 'v26d-subtitle-4', text: 'Works for me.', start: 37, end: 50 },
  { id: 'v26d-subtitle-5', text: 'We need a contingency plan.', start: 52, end: 79 },
];

function loadAnalyzeEngine() {
  const context = { console, window: {}, globalThis: {} };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, 'analyze-engine.js'), 'utf8'), context);
  return context.window.AnalyzeEngine || context.AnalyzeEngine;
}

function extractJSON(text) {
  const trimmed = String(text || '').trim();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (match) {
    return JSON.parse(match[1]);
  }
  throw new Error('AI response did not contain a JSON object.');
}

function createOpenAICompatibleClient({ apiKey, baseUrl, model }) {
  return {
    async analyzeObstacles(prompt) {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: prompt.messages,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      return extractJSON(data.choices?.[0]?.message?.content);
    },
  };
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  const baseUrl = process.env.OPENAI_API_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.V26D_AI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    throw new Error('Set OPENAI_API_KEY or AI_API_KEY to run the live real-AI verification call.');
  }

  const engine = loadAnalyzeEngine();
  const prompt = engine.buildRealAIAnalysisPrompt(subtitleItems, { level: 'junior' });
  const aiClient = createOpenAICompatibleClient({ apiKey, baseUrl, model });
  const obstacles = await engine.analyzeSubtitleItemsWithAI(subtitleItems, { level: 'junior', aiClient });
  const promptHash = crypto.createHash('sha256').update(JSON.stringify(prompt.messages)).digest('hex');

  const output = {
    version: 'V2.6D',
    verificationGoal: 'Prove that the Analyze Engine can generate obstacle data from previously unseen subtitle input using a real AI model.',
    generatedAt: new Date().toISOString(),
    analysisPath: 'real-ai',
    aiCall: {
      provider: 'OpenAI-compatible chat completions API',
      model,
      baseUrl,
      promptVersion: prompt.promptVersion,
      promptSha256: promptHash,
    },
    inputSubtitleSample: subtitleItems,
    forbiddenV26AMockPhrases: engine.realAI.v26aMockSamplePhrases,
    obstacles,
    verificationNotes: [
      'The subtitle sample is not part of the V2.6A mock set.',
      'Obstacles were returned by the configured AI model and normalized by AnalyzeEngine.analyzeSubtitleItemsWithAI.',
      'The real AI path does not read vocabularyMockEntries, comprehensionMockEntries, or regex-only mock detection.',
    ],
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${path.relative(repoRoot, outputPath)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
