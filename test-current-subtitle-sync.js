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
      add: () => {},
      remove: () => {},
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
      getItem: () => null,
      setItem: () => {},
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
vm.runInContext(fs.readFileSync('script.js', 'utf8'), context);

const api = context.window.ObstacleDetectionEngine;

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

function assertPlayback(name, expectedIsPlaying) {
  const { isVideoPlaying } = api.getPlaybackState();

  if (isVideoPlaying !== expectedIsPlaying) {
    throw new Error(`${name}: expected isVideoPlaying=${expectedIsPlaying}, got ${isVideoPlaying}`);
  }

  console.log(`PASS ${name}: isVideoPlaying=${isVideoPlaying}`);
}

api.Analyze(demoText, { level: 'junior' });
assertLabels('Test 1 first subtitle shows all current obstacles', ['lecture', 'lay it on us']);

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
const layItOnUs = navigationItems.find((obstacle) => obstacle.phrase === 'lay it on us');
const expectedPercent = (layItOnUs.timeMs / api.getPlaybackState().totalDurationMs) * 100;
if (Math.abs(layItOnUs.percent - expectedPercent) > 0.0001) {
  throw new Error('Test V2.4A heat axis mapping: obstacle percent did not match video timeline time coordinate');
}
console.log('PASS Test V2.4A heat axis uses video timeline coordinates');

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

const bottomSheetLabels = getElement('#bottomSheetContent').children.map((child) => child.textContent);
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
console.log('PASS Test V2.4A Bottom Sheet shows ○ words first and ● understanding second');

api.toggleVideoPlayback();
const wasPlayingBeforeBottomSheetJump = api.getPlaybackState().isVideoPlaying;
const pullOffButton = getElement('#bottomSheetContent').children.find((child) => child.textContent === '● pull off the project');
pullOffButton.click();
assertLabels('Test V2.4A Bottom Sheet item jumps and syncs Learning Tips', ['pull off the project']);
if (getElement('#obstacleBottomSheet').hidden !== true) {
  throw new Error('Test V2.4A Bottom Sheet item closes sheet: expected hidden sheet');
}
assertPlayback('Test V2.4A Bottom Sheet item keeps playback state', wasPlayingBeforeBottomSheetJump);
