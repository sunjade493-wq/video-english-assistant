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
