const fs = require('fs');
const vm = require('vm');

class TestElement {
  constructor(tag = 'div') {
    this.tag = tag;
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this.hidden = false;
    this.className = '';
    this.value = '';
    this.style = {};
    this.type = '';
    this.eventHistory = [];
    this.classList = {
      add: (...classNames) => {
        const existingClassNames = new Set(this.className.split(/\s+/).filter(Boolean));
        classNames.forEach((className) => existingClassNames.add(className));
        this.className = [...existingClassNames].join(' ');
      },
      remove: (...classNames) => {
        const classNamesToRemove = new Set(classNames);
        this.className = this.className
          .split(/\s+/)
          .filter((className) => className && !classNamesToRemove.has(className))
          .join(' ');
      },
      contains: (className) => this.className.split(/\s+/).includes(className),
    };
    this.currentTextContent = '';
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  getBoundingClientRect() {
    return { width: 720, height: 42 };
  }

  click() {
    if (this.listeners.click) {
      this.listeners.click({ stopPropagation: () => {} });
    }
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  get textContent() {
    return this.currentTextContent + this.children.map((child) => child.textContent || '').join('');
  }

  set textContent(value) {
    this.currentTextContent = String(value);
    this.children = [];
  }

  get innerHTML() {
    return this.textContent;
  }

  set innerHTML(value) {
    this.currentTextContent = '';
    this.children = [];
  }
}

const demoText = `If you enjoyed this lecture,
I'm sure you're too busy to lay it on us.

Can you give me a hand?

I was pulled off the project.

Let's call it a day.`;

const elements = new Map();
const localStorageEntries = new Map();

function getElement(selector) {
  if (!elements.has(selector)) {
    elements.set(selector, new TestElement(selector));
  }

  return elements.get(selector);
}

getElement('#subtitleTextInput').value = demoText;

const context = {
  console,
  Date,
  document: {
    querySelector: getElement,
    createElement: (tag) => new TestElement(tag),
  },
  window: {
    localStorage: {
      getItem: (key) => localStorageEntries.has(key) ? localStorageEntries.get(key) : null,
      setItem: (key, value) => localStorageEntries.set(key, String(value)),
    },
    requestAnimationFrame: (callback) => callback(),
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
  },
};

context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('analyze-engine.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('script.js', 'utf8'), context);

const api = context.window.ObstacleDetectionEngine;
const analyzeEngine = context.window.AnalyzeEngine;

function assertAnalyzeEngineV26A() {
  const subtitleItems = [{
    id: 'mock-subtitle-1',
    text: 'This lecture can lecture us, then lay it on us and call it a day.',
    start: 100,
    end: 166,
  }];
  const juniorObstacles = analyzeEngine.analyzeSubtitleItems(subtitleItems, { level: 'junior' });
  const seniorObstacles = analyzeEngine.analyzeSubtitleItems(subtitleItems, { level: 'senior' });
  const lectureObstacles = juniorObstacles.filter((obstacle) => obstacle.type === 'vocab' && obstacle.baseForm === 'lecture');
  const comprehensionObstacles = juniorObstacles.filter((obstacle) => obstacle.type === 'comprehension');

  if (lectureObstacles.length !== 2) {
    throw new Error(`V2.6A Analyze Engine: expected duplicate lecture vocab obstacles to remain, got ${lectureObstacles.length}`);
  }

  if (seniorObstacles.some((obstacle) => obstacle.type === 'vocab' && obstacle.baseForm === 'lecture')) {
    throw new Error('V2.6A Analyze Engine: expected senior level to suppress lecture vocab obstacles');
  }

  const comprehensionPrototypes = comprehensionObstacles.map((obstacle) => obstacle.prototype);
  if (comprehensionObstacles.length !== 2
    || !comprehensionPrototypes.includes('lay something on somebody')
    || !comprehensionPrototypes.includes('call it a day')
    || comprehensionObstacles.some((obstacle) => obstacle.explanation.includes('Prototype expression'))) {
    throw new Error(`V2.6A Analyze Engine: expected prototype structures without Prototype expression label, got ${JSON.stringify(comprehensionPrototypes)}`);
  }

  ['id', 'subtitleId', 'type', 'surfaceText', 'baseForm', 'explanation', 'start', 'end'].forEach((fieldName) => {
    if (!(fieldName in juniorObstacles[0])) {
      throw new Error(`V2.6A Analyze Engine: missing obstacle field ${fieldName}`);
    }
  });

  console.log('PASS V2.6A Analyze Engine outputs vocab/comprehension obstacles, prototype structures, same-sentence multiples, and vocab level');
}

assertAnalyzeEngineV26A();

function getLabels() {
  return api.getVisibleObstacles().map((obstacle) => (
    obstacle.kind === 'word' ? obstacle.word : obstacle.phrase
  ));
}

function assertLabels(name, expectedLabels) {
  const actualLabels = getLabels();

  if (JSON.stringify(actualLabels) !== JSON.stringify(expectedLabels)) {
    throw new Error(`${name}: expected ${JSON.stringify(expectedLabels)}, got ${JSON.stringify(actualLabels)}`);
  }

  console.log(`PASS ${name}: ${actualLabels.join(', ')}`);
}


function getCardStreamText() {
  return getElement('#cardStream').textContent;
}

function assertCardStreamIncludes(name, expectedText) {
  const cardText = getCardStreamText();

  if (!cardText.includes(expectedText)) {
    throw new Error(`${name}: expected Learning Tips to include ${JSON.stringify(expectedText)}, got ${JSON.stringify(cardText)}`);
  }

  console.log(`PASS ${name}: includes ${expectedText}`);
}

function assertCardStreamExcludes(name, unexpectedText) {
  const cardText = getCardStreamText();

  if (cardText.includes(unexpectedText)) {
    throw new Error(`${name}: expected Learning Tips to exclude ${JSON.stringify(unexpectedText)}, got ${JSON.stringify(cardText)}`);
  }

  console.log(`PASS ${name}: excludes ${unexpectedText}`);
}


function findDescendantsByClass(root, className) {
  const matches = [];

  function visit(node) {
    if (!node || !node.children) {
      return;
    }

    if (node.className && node.className.split(/\s+/).includes(className)) {
      matches.push(node);
    }

    node.children.forEach(visit);
  }

  visit(root);
  return matches;
}

function findCardsByLabel(labelText) {
  return getElement('#cardStream').children.filter((card) => card.textContent.includes(labelText));
}

function assertStrictCardRendering() {
  const vocabCards = findCardsByLabel('[vocab]');
  const comprehensionCards = findCardsByLabel('[comprehension]');

  if (vocabCards.length < 1) {
    throw new Error('V29D-3 strict vocab card rendering: expected [vocab] label to remain visible');
  }

  if (comprehensionCards.length < 1) {
    throw new Error('V29D-3 strict comprehension card rendering: expected [comprehension] label to remain visible');
  }

  const vocabHeadline = findDescendantsByClass(vocabCards[0], 'vocab-headline')[0];
  const vocabSentenceMeaning = findDescendantsByClass(vocabCards[0], 'vocab-sentence-meaning')[0];
  const understandingPrototype = findDescendantsByClass(comprehensionCards[0], 'understanding-prototype')[0];
  const detailBlocks = findDescendantsByClass(comprehensionCards[0], 'detail-block');

  if (!vocabHeadline || vocabHeadline.tag !== 'p') {
    throw new Error('V29D-3 strict vocab card rendering: expected p.vocab-headline');
  }

  if (!vocabSentenceMeaning || vocabSentenceMeaning.tag !== 'p') {
    throw new Error('V29D-3 strict vocab card rendering: expected p.vocab-sentence-meaning');
  }

  if (!understandingPrototype || understandingPrototype.tag !== 'p') {
    throw new Error('V29D-3 strict comprehension card rendering: expected p.understanding-prototype');
  }

  if (detailBlocks.length < 3) {
    throw new Error(`V29D-3 strict comprehension card rendering: expected at least 3 .detail-block nodes, got ${detailBlocks.length}`);
  }

  [...vocabCards, ...comprehensionCards].forEach((card) => {
    if (!card.textContent.includes('✓ 不用管我了')) {
      throw new Error('V29D-3 strict card rendering: expected dismiss button text to remain visible');
    }
  });

  console.log('PASS V29D-3 strict card rendering uses separate vocab and comprehension DOM nodes');
}

function assertFullPartOfSpeechRendering() {
  const rows = [
    {
      id: 'v29d-4-believe',
      type: 'vocab',
      word: 'believe',
      phonetic: '/bɪˈliːv/',
      translation: '相信',
    },
    {
      id: 'v29d-4-lecture',
      type: 'vocab',
      word: 'lecture',
      phonetic: '/ˈlektʃər/',
      translation: '讲座',
      pos: 'n./v.',
    },
    {
      id: 'v29d-4-alone',
      type: 'vocab',
      word: 'alone',
      phonetic: '/əˈloʊn/',
      translation: '独自',
      wordClass: 'adj./adv.',
    },
  ];
  const headlines = rows.map((row, rowIndex) => (
    context.createWordHeadline(context.normalizeObstacle(row, rowIndex)).textContent
  ));
  const expectedHeadlines = [
    'believe /bɪˈliːv/ vt./vi.',
    'lecture /ˈlektʃər/ n./vi./vt.',
    'alone /əˈloʊn/ adj./adv.',
  ];

  if (JSON.stringify(headlines) !== JSON.stringify(expectedHeadlines)) {
    throw new Error(`V29D-4 full POS rendering: expected ${JSON.stringify(expectedHeadlines)}, got ${JSON.stringify(headlines)}`);
  }

  if (headlines.includes('believe /bɪˈliːv/')) {
    throw new Error('V29D-4 full POS rendering: believe headline must not render without part of speech');
  }

  console.log('PASS V29D-4 full part-of-speech rendering includes fallback and normalized composite POS');
}

function assertPlayback(name, expectedIsPlaying) {
  const { isVideoPlaying } = api.getPlaybackState();

  if (isVideoPlaying !== expectedIsPlaying) {
    throw new Error(`${name}: expected isVideoPlaying=${expectedIsPlaying}, got ${isVideoPlaying}`);
  }

  console.log(`PASS ${name}: isVideoPlaying=${isVideoPlaying}`);
}

api.Analyze(demoText, { level: 'junior' });
assertLabels('Test 1 first subtitle shows all current obstacles', ['lecture', 'lay it on us']);
assertCardStreamIncludes('Test V2.4A UI Cleanup word obstacle keeps phonetic', '/ˈlektʃər/');
assertCardStreamIncludes('Test V2.4A UI Cleanup word obstacle keeps translation', '讲座');
assertCardStreamIncludes('Test V2.4A UI Cleanup understanding keeps literal field', '字面意思');
assertCardStreamIncludes('Test V2.4A UI Cleanup understanding keeps actual field', '实际意思');
assertCardStreamIncludes('Test V2.4A UI Cleanup understanding keeps grammar field', '语法解释');
assertCardStreamIncludes('V2.6A Review Fix title uses prototype structure', 'lay something on somebody');
assertCardStreamExcludes('V2.6A Review Fix removes Prototype expression label', 'Prototype expression');
assertCardStreamExcludes('Test V2.4A UI Cleanup first subtitle hides source label', '出处');
assertCardStreamExcludes('Test V2.4A UI Cleanup first subtitle hides source text', '出处lay it on us');
assertStrictCardRendering();
assertFullPartOfSpeechRendering();

api.pauseVideoForObstacle('understanding-lay-it-on-us');
assertPlayback('Test 2 dotted marker enters Learning Pause', false);
assertLabels('Test 2 Learning Tips are not filtered to selected obstacle', ['lecture', 'lay it on us']);

api.hideCurrentObstacle('word-lecture');
assertLabels('Test 3 dismissing lecture keeps lay it on us visible', ['lay it on us']);
assertPlayback('Test 3 dismissing lecture does not resume playback', false);

api.hideCurrentObstacle('understanding-lay-it-on-us');
assertLabels('Test 4 dismissing lay it on us empties current tips', []);
assertPlayback('Test 4 dismissing final card does not resume playback', false);

api.toggleVideoPlayback();
assertPlayback('Test 5 clicking video area resumes playback', true);

api.toggleVideoPlayback();
assertPlayback('Test 6 clicking video while playing pauses playback', false);

api.toggleVideoPlayback();
assertPlayback('Test 7 clicking video while paused plays video', true);

api.toggleVideoPlayback();
assertPlayback('Test 8 setup paused before restore all', false);
api.Analyze(demoText, { level: 'junior' });
assertPlayback('Analyze does not change paused playback state', false);
api.restoreAllCurrentObstacles();
assertLabels('Test 8 restore all remains current subtitle scoped', ['lecture', 'lay it on us']);
assertPlayback('Test 8 restore all does not change playback state', false);

api.toggleVideoPlayback();
assertPlayback('Test 8 setup playing before restore all', true);
api.Analyze(demoText, { level: 'junior' });
assertPlayback('Analyze does not change playing playback state', true);
api.hideCurrentObstacle('word-lecture');
api.restoreAllCurrentObstacles();
assertLabels('Test 8 restore all while playing remains current subtitle scoped', ['lecture', 'lay it on us']);
assertPlayback('Test 8 restore all does not pause playback', true);

api.moveToNextSubtitleSegment();
assertLabels('Test B second subtitle only', ['give me a hand']);

api.moveToNextSubtitleSegment();
assertLabels('Test C third subtitle only', ['pull off the project']);
assertCardStreamExcludes('Test V2.4A UI Cleanup pulled off card hides source label', '出处');
assertCardStreamExcludes('Test V2.4A UI Cleanup pulled off card hides matched source text', '出处pulled off the project');

api.restoreAllCurrentObstacles();
assertLabels('Restore All never expands beyond current subtitle', ['pull off the project']);

api.moveToNextSubtitleSegment();
assertLabels('Test D subtitle progression', ['call it a day']);

api.Analyze(demoText, { level: 'junior' });
api.seekToTime(0);
const initialTimelineValue = Number(getElement('#videoTimeline').value);
api.moveToNextSubtitleSegment();
const advancedState = api.getPlaybackState();
const advancedTimelineValue = Number(getElement('#videoTimeline').value);
if (!(advancedState.currentTimeMs >= 3600 && advancedTimelineValue > initialTimelineValue)) {
  throw new Error('Test V2.4A timeline progress: expected simulated playback to advance timeline value');
}
console.log(`PASS Test V2.4A timeline progress: ${initialTimelineValue} -> ${advancedTimelineValue}`);

api.seekToTime(7200);
assertLabels('Test V2.4A clicking video timeline jumps to subtitle position', ['pull off the project']);

getElement('#videoTimeline').value = '75';
getElement('#videoTimeline').listeners.input({ target: getElement('#videoTimeline') });
assertLabels('Test V2.4A dragging video timeline jumps to subtitle position', ['call it a day']);

const navigationItems = api.getObstacleNavigationItems();
const firstSubtitleGroup = navigationItems.find((item) => item.segmentIndex === 0);
const layItOnUs = firstSubtitleGroup.obstacles.find((obstacle) => obstacle.phrase === 'lay it on us');
const expectedPercent = (firstSubtitleGroup.timeMs / api.getPlaybackState().totalDurationMs) * 100;
if (firstSubtitleGroup.obstacles.length !== 2) {
  throw new Error('Test V2.4 Phase 2 heat source: expected first subtitle to stay one navigation group with two obstacles');
}
if (Math.abs(firstSubtitleGroup.percent - expectedPercent) > 0.0001 || Math.abs(layItOnUs.percent - expectedPercent) > 0.0001) {
  throw new Error('Test V2.4 Phase 2 heat axis mapping: subtitle group percent did not match video timeline segment coordinate');
}
console.log('PASS Test V2.4 Phase 2 heat axis source groups obstacles by subtitle segment');

const clustered = api.clusterObstacleItems([
  { id: 'near-1', percent: 10 },
  { id: 'near-2', percent: 12 },
  { id: 'far-1', percent: 60 },
]);
if (clustered.length !== 2 || clustered[0].items.length !== 2 || clustered[1].items.length !== 1) {
  throw new Error('Test V2.4A pixel density clustering: expected two nearby items to aggregate');
}
console.log('PASS Test V2.4A nearby obstacles aggregate by pixel density');

api.openBottomSheet({ items: navigationItems });
if (getElement('#obstacleBottomSheet').hidden !== false || getElement('#bottomSheetTitle').textContent !== '当前区域障碍（5）') {
  throw new Error('Test V2.4A bottom sheet open: expected visible sheet with obstacle count');
}
console.log('PASS Test V2.4A clicking cluster opens Bottom Sheet');

const bottomSheetGroups = getElement('#bottomSheetContent').children;
const bottomSheetLabels = bottomSheetGroups.flatMap((group) => group.children[2].children.map((child) => child.textContent));
const bottomSheetSubtitles = bottomSheetGroups.map((group) => group.children[1].textContent);
const expectedBottomSheetLabels = [
  '○ lecture',
  '● lay it on us',
  '● give me a hand',
  '● pull off the project',
  '● call it a day',
];
if (JSON.stringify(bottomSheetLabels) !== JSON.stringify(expectedBottomSheetLabels)) {
  throw new Error(`Test V2.4A bottom sheet order: expected ${JSON.stringify(expectedBottomSheetLabels)}, got ${JSON.stringify(bottomSheetLabels)}`);
}
if (bottomSheetGroups.length !== 4 || bottomSheetGroups[0].children[2].children.length !== 2) {
  throw new Error('Test V2.4A bottom sheet grouping: expected subtitle-node groups with same-sentence obstacles bound together');
}
if (!bottomSheetSubtitles.includes("If you enjoyed this lecture, I'm sure you're too busy to lay it on us.")) {
  throw new Error('Test V2.4A bottom sheet subtitle text: expected full first subtitle text');
}
console.log('PASS Test V2.4A Bottom Sheet groups by subtitle, keeps bound obstacles, and sorts ○ before ●');

const renderedHeatClusters = api.renderTimelines();
if (renderedHeatClusters[0].items.length !== 1 || renderedHeatClusters[0].items[0].obstacles.length !== 2) {
  throw new Error('Test V2.4 Phase 2 heat cluster: expected first cluster to contain one subtitle group with two obstacles');
}
const firstHeatButton = getElement('#obstacleHeatAxis').children.find((child) => child.className.includes('heat-cluster-button') && child.textContent === '2');
if (!firstHeatButton) {
  throw new Error('Test V2.4 Phase 2 heat cluster count: expected first heat button to show total obstacle count 2');
}
api.openBottomSheet(renderedHeatClusters[0]);
if (getElement('#bottomSheetTitle').textContent !== '当前区域障碍（2）') {
  throw new Error('Test V2.4 Phase 2 bottom sheet title: expected first cluster title to count two obstacles');
}
const firstClusterGroups = getElement('#bottomSheetContent').children;
if (firstClusterGroups.length !== 1 || firstClusterGroups[0].children[2].children.length !== 2) {
  throw new Error('Test V2.4 Phase 2 bottom sheet grouping: expected lecture and lay it on us under one subtitle group');
}
const selectedHeatButton = getElement('#obstacleHeatAxis').children.find((child) => child.className.includes('heat-cluster-button is-selected'));
const selectedHighlight = getElement('#obstacleHeatAxis').children.find((child) => child.className === 'heat-cluster-highlight');
if (!selectedHeatButton || !selectedHighlight) {
  throw new Error('Test V2.4A heat cluster highlight: expected selected cluster button and highlighted region');
}
console.log('PASS Test V2.4A selected heat cluster is highlighted');

api.openBottomSheet(renderedHeatClusters[0]);
const wasPlayingBeforeLectureJump = api.getPlaybackState().isVideoPlaying;
const lectureButton = getElement('#bottomSheetContent').children[0].children[2].children.find((child) => child.textContent === '○ lecture');
lectureButton.click();
assertLabels('Test V2.4 Phase 2 Bottom Sheet lecture chip syncs current subtitle Learning Tips', ['lecture', 'lay it on us']);
if (getElement('#obstacleBottomSheet').hidden !== true) {
  throw new Error('Test V2.4 Phase 2 Bottom Sheet lecture chip closes sheet: expected hidden sheet');
}
assertPlayback('Test V2.4 Phase 2 Bottom Sheet lecture chip keeps playback state', wasPlayingBeforeLectureJump);

api.openBottomSheet(renderedHeatClusters[0]);
const wasPlayingBeforeLayItOnUsJump = api.getPlaybackState().isVideoPlaying;
const layItOnUsButton = getElement('#bottomSheetContent').children[0].children[2].children.find((child) => child.textContent === '● lay it on us');
layItOnUsButton.click();
assertLabels('Test V2.4 Phase 2 Bottom Sheet lay it on us chip syncs current subtitle Learning Tips', ['lecture', 'lay it on us']);
if (getElement('#obstacleBottomSheet').hidden !== true) {
  throw new Error('Test V2.4 Phase 2 Bottom Sheet lay it on us chip closes sheet: expected hidden sheet');
}
assertPlayback('Test V2.4 Phase 2 Bottom Sheet lay it on us chip keeps playback state', wasPlayingBeforeLayItOnUsJump);

api.hideCurrentObstacle('word-lecture');
const navigationItemsAfterHide = api.getObstacleNavigationItems();
if (navigationItemsAfterHide.length !== navigationItems.length) {
  throw new Error('Test V2.4A heat map immutable after hide: expected hidden Learning Tip not to change heat counts');
}
console.log('PASS Test V2.4A heat map counts do not change after hiding an obstacle');

api.openBottomSheet({ items: navigationItems });
api.toggleVideoPlayback();
const wasPlayingBeforeBottomSheetJump = api.getPlaybackState().isVideoPlaying;
const pullOffGroup = getElement('#bottomSheetContent').children.find((group) => group.textContent.includes('pull off the project'));
const pullOffButton = pullOffGroup.children[2].children.find((child) => child.textContent === '● pull off the project');
pullOffButton.click();
assertLabels('Test V2.4A Bottom Sheet item jumps and syncs Learning Tips', ['pull off the project']);
if (getElement('#obstacleBottomSheet').hidden !== true) {
  throw new Error('Test V2.4A Bottom Sheet item closes sheet: expected hidden sheet');
}
assertPlayback('Test V2.4A Bottom Sheet item keeps playback state', wasPlayingBeforeBottomSheetJump);


function getCssRuleBody(selector) {
  const styles = fs.readFileSync('styles.css', 'utf8');
  const selectorIndex = styles.indexOf(selector);

  if (selectorIndex === -1) {
    return '';
  }

  const openingBraceIndex = styles.indexOf('{', selectorIndex);
  const closingBraceIndex = styles.indexOf('}', openingBraceIndex);

  return styles.slice(openingBraceIndex + 1, closingBraceIndex);
}


function assertEpisodeUndoLightweightStyle(name) {
  const ruleBody = getCssRuleBody('.episode-progress-summary__undo');

  [
    'display: inline',
    'width: auto',
    'padding: 0',
    'border: 0',
    'border-radius: 0',
    'background: transparent',
    'box-shadow: none',
  ].forEach((expectedDeclaration) => {
    if (!ruleBody.includes(expectedDeclaration)) {
      throw new Error(`${name}: expected undo link style declaration ${expectedDeclaration}`);
    }
  });

  console.log(`PASS ${name}: ↶ 返回上一个障碍 uses lightweight link styling`);
}

function assertEpisodeUndoPlacement(name, expectedEnabled) {
  const episodeUndoButton = getElement('#episodeUndoButton');
  const cardStreamText = getElement('#cardStream').textContent;

  if (episodeUndoButton.textContent !== '↶ 返回上一个障碍') {
    throw new Error(`${name}: expected undo button in episode progress summary, got ${JSON.stringify(episodeUndoButton.textContent)}`);
  }

  const expectedDisabled = !expectedEnabled;

  if (episodeUndoButton.disabled !== expectedDisabled) {
    throw new Error(`${name}: expected episode undo disabled=${expectedDisabled}, got disabled=${episodeUndoButton.disabled}`);
  }

  if (cardStreamText.includes('↶ 返回上一个障碍')) {
    throw new Error(`${name}: expected Learning Tips cards to exclude undo action, got ${JSON.stringify(cardStreamText)}`);
  }

  console.log(`PASS ${name}: ↶ 返回上一个障碍 is in 本集障碍 and enabled=${expectedEnabled}`);
}

function assertEpisodeProgress(name, expectedConquered, expectedRemaining) {
  const { conquered, remaining, total } = api.getEpisodeProgressCounts();

  if (conquered !== expectedConquered || remaining !== expectedRemaining) {
    throw new Error(`${name}: expected conquered=${expectedConquered}, remaining=${expectedRemaining}, got conquered=${conquered}, remaining=${remaining}, total=${total}`);
  }

  const conqueredText = getElement('#conqueredObstacleCount').textContent;
  const remainingText = getElement('#remainingObstacleCount').textContent;

  if (conqueredText !== String(expectedConquered) || remainingText !== String(expectedRemaining)) {
    throw new Error(`${name}: expected rendered conquered=${expectedConquered}, remaining=${expectedRemaining}, got conquered=${conqueredText}, remaining=${remainingText}`);
  }

  console.log(`PASS ${name}: ✓ 已攻克 ${conquered}, ○ 剩余 ${remaining}`);
}

api.Analyze(demoText, { level: 'junior' });
while (api.getEpisodeProgressCounts().conquered > 0) {
  const restoredObstacle = api.undoLastDismissedObstacle();

  if (!restoredObstacle) {
    throw new Error('V2.5A setup: expected undo to restore persisted obstacle progress');
  }
}
api.seekToTime(0);
assertEpisodeProgress('V2.5A Test A first Analyze initializes episode progress', 0, 5);
assertEpisodeUndoPlacement('V2.5A Hot Fix Test A initial undo placement', false);
assertEpisodeUndoLightweightStyle('V2.5A Hot Fix #3 Test B undo has no residual container styling');

api.hideCurrentObstacle('word-lecture');
assertEpisodeProgress('V2.5A Test B dismiss increments conquered count', 1, 4);
assertLabels('V2.5A Test B dismissed obstacle leaves current subtitle tips', ['lay it on us']);
assertEpisodeUndoPlacement('V2.5A Hot Fix Test B undo remains outside Learning Tips after dismiss', true);

getElement('#episodeUndoButton').click();
assertEpisodeProgress('V2.5A Test C undo decrements conquered count', 0, 5);
assertLabels('V2.5A Test C undo restores obstacle', ['lecture', 'lay it on us']);
assertEpisodeUndoPlacement('V2.5A Hot Fix Test C undo placement after restore', false);

api.seekToTime(3600);
api.hideCurrentObstacle('understanding-give-me-a-hand');
assertEpisodeProgress('V2.5A Hot Fix Test D final current subtitle obstacle updates counts', 1, 4);
assertLabels('V2.5A Hot Fix Test D Learning Tips card disappears after final current subtitle obstacle hidden', []);
assertEpisodeUndoPlacement('V2.5A Hot Fix Test D undo remains visible after card disappears', true);
getElement('#episodeUndoButton').click();
assertEpisodeProgress('V2.5A Hot Fix Test E undo restores final current subtitle obstacle counts', 0, 5);
assertLabels('V2.5A Hot Fix Test E final current subtitle obstacle reappears', ['give me a hand']);
assertEpisodeUndoPlacement('V2.5A Hot Fix Test E undo placement after final obstacle restore', false);
api.seekToTime(0);

[
  'word-lecture',
  'understanding-lay-it-on-us',
  'understanding-give-me-a-hand',
  'understanding-pull-off-the-project',
  'understanding-call-it-a-day',
].forEach((obstacleId) => api.hideCurrentObstacle(obstacleId));
assertEpisodeProgress('V2.5A Test D consecutive dismissals accumulate progress', 5, 0);

api.Analyze(demoText, { level: 'junior' });
assertEpisodeProgress('V2.5A Test E re-Analyze keeps persisted progress', 5, 0);

if ('resetCurrentEpisodeProgress' in api) {
  throw new Error('V2.6A Review Fix: resetCurrentEpisodeProgress API should be removed');
}
const htmlSource = fs.readFileSync('index.html', 'utf8');
if (htmlSource.includes('resetProgressMenuItem') || htmlSource.includes('重置本集学习进度')) {
  throw new Error('V2.6A Review Fix: reset progress menu item should be removed from UI');
}
console.log('PASS V2.6A Review Fix removes episode reset API and UI entry');
