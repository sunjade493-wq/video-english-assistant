const fs = require('fs');
const vm = require('vm');
const {
  SCHEMA_VERSION,
  buildAnalyzePrompt,
  normalizeAIOutput,
  analyzeSubtitlesWithAI,
} = require('./content-production-ai-analyze');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const subtitleItems = [
  {
    id: 'subtitle-1',
    text: 'This lecture is brutal, but lay it on us and call it a day.',
    start: 0,
    end: 61,
  },
  {
    id: 'subtitle-2',
    text: "I'm gonna pitch the prototype.",
    start: 63,
    end: 93,
  },
];

const aiOutput = {
  obstacles: [
    {
      subtitleId: 'subtitle-1',
      type: 'vocab',
      surfaceText: 'lecture',
      baseForm: 'lecture',
      word: 'lecture',
      phonetic: '/ˈlektʃər/',
      partOfSpeech: 'n./v.',
      sentenceMeaning: '讲座',
      cefr: 'B1',
    },
    {
      subtitleId: 'subtitle-1',
      type: 'vocab',
      surfaceText: 'brutal',
      baseForm: 'brutal',
      word: 'brutal',
      phonetic: '/ˈbruːtl/',
      partOfSpeech: 'adj.',
      sentenceMeaning: '很难熬的；残酷的',
      cefr: 'B2',
    },
    {
      subtitleId: 'subtitle-1',
      type: 'comprehension',
      surfaceText: 'lay it on us',
      baseForm: 'lay it on us',
      phrase: 'lay it on us',
      prototype: 'lay something on somebody',
      literal: '把某件事放到某人身上',
      actual: '把话直接告诉对方。',
      grammar: 'lay 表示放置，on somebody 表示把信息交到某人这边承接；当 something 是 it 指代的信息时，整体就引申为直接把内容说给对方听。',
      category: 'fixed expression',
    },
    {
      subtitleId: 'subtitle-1',
      type: 'comprehension',
      surfaceText: 'call it a day',
      baseForm: 'call it a day',
      phrase: 'call it a day',
      prototype: 'call it a day',
      literal: '把它称为一天',
      actual: '到此为止；收工。',
      grammar: 'call 表示认定，it 指当前工作，a day 指一天的工作阶段；把当前活动认定为一天的工作量，就表示可以停止。',
      category: 'idiom',
    },
    {
      subtitleId: 'subtitle-2',
      type: 'comprehension',
      surfaceText: "I'm gonna",
      baseForm: "I'm gonna",
      phrase: "I'm gonna",
      prototype: 'be going to do something',
      literal: '我将要去做某事',
      actual: '我打算/马上要做某事。',
      grammar: "gonna 是 going to 的口语弱读，be going to 表示已经形成的计划或即将发生的动作；I'm gonna pitch 表示说话人接下来准备介绍方案。",
      category: 'spoken contraction',
    },
  ],
};

async function assertContentProductionAI() {
  const prompt = buildAnalyzePrompt(subtitleItems, { level: 'junior' });
  assert(prompt.includes('Oxford 3000 / 5000 + CEFR mapping'), 'prompt must require Oxford 3000/5000 + CEFR mapping');
  assert(prompt.includes('Runtime must never call AI'), 'prompt must freeze runtime no-AI rule');

  const frozenData = await analyzeSubtitlesWithAI(subtitleItems, {
    level: 'junior',
    generatedAt: '2026-06-09T00:00:00.000Z',
    aiClient: {
      generateObstacleData: async () => aiOutput,
    },
  });

  assert(frozenData.schemaVersion === SCHEMA_VERSION, 'AI output shape must include V2.6C schema version');
  assert(frozenData.obstacles.length === 5, 'AI output shape must preserve all five obstacles');

  const [first, second, third, fourth, fifth] = frozenData.obstacles;
  assert(first.type === 'vocab' && first.word === 'lecture', 'vocab obstacle format must include word');
  assert(first.phonetic === '/ˈlektʃər/' && first.partOfSpeech === 'n./v.', 'vocab obstacle format must include phonetic and part of speech');
  assert(first.explanation.includes('Sentence meaning: 讲座'), 'vocab obstacle format must include Sentence meaning');
  assert(second.type === 'vocab' && second.word === 'brutal', 'same subtitle must keep multiple vocab obstacles');
  assert(third.type === 'comprehension' && third.prototype === 'lay something on somebody', 'comprehension obstacle format must use prototype as title data');
  assert(third.literal && third.actual && third.grammar.includes('on somebody'), 'comprehension obstacle format must include literal, actual, and explanatory grammar');
  assert(fourth.type === 'comprehension' && fourth.phrase === 'call it a day', 'same subtitle must keep multiple comprehension obstacles');
  assert(fifth.subtitleId === 'subtitle-2', 'subtitle order preservation must keep subtitle-2 obstacle after subtitle-1 obstacles');
  assert(frozenData.obstacles.filter((obstacle) => obstacle.subtitleId === 'subtitle-1').length === 4, 'same subtitle may contain vocab + comprehension together');

  console.log('PASS V2.6C content-production AI output shape, vocab/comprehension formats, subtitle order, and multiple same-subtitle obstacles');
  return frozenData;
}

function assertRuntimeReadsFrozenData(frozenData) {
  const context = { console };
  context.window = { FrozenEpisodeObstacleData: frozenData };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('analyze-engine.js', 'utf8'), context);

  const runtimeObstacles = context.window.AnalyzeEngine.analyzeSubtitleItems(subtitleItems, {
    level: 'senior',
    frozenObstacleData: frozenData,
  });

  assert(runtimeObstacles.length === 5, 'runtime must read frozen obstacle data');
  assert(runtimeObstacles[1].word === 'brutal', 'runtime frozen read must not re-run mock level filtering');
  assert(runtimeObstacles[4].phrase === "I'm gonna", 'runtime frozen read must include AI-only comprehension obstacle');

  const mismatchRuntimeObstacles = context.window.AnalyzeEngine.analyzeSubtitleItems([
    { id: 'subtitle-1', text: 'Different subtitle.', start: 0, end: 19 },
  ], {
    frozenObstacleData: frozenData,
  });

  assert(mismatchRuntimeObstacles.length !== 5, 'runtime must ignore frozen data when subtitle fingerprint does not match');
  console.log('PASS V2.6C runtime reads matching frozen obstacle data and ignores mismatched frozen data');
}

assertContentProductionAI()
  .then(assertRuntimeReadsFrozenData)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// Direct normalization is exported for content-pipeline unit tests.
const normalized = normalizeAIOutput(aiOutput, subtitleItems, { level: 'junior', generatedAt: '2026-06-09T00:00:00.000Z' });
assert(normalized.obstacles[0].start < normalized.obstacles[4].start, 'normalizeAIOutput must preserve source subtitle order by absolute range');
