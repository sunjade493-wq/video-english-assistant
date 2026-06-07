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

api.Analyze(demoText, { level: 'junior' });
assertLabels('Test A first subtitle only', ['lecture', 'lay it on us']);

api.moveToNextSubtitleSegment();
assertLabels('Test B second subtitle only', ['give me a hand']);

api.moveToNextSubtitleSegment();
assertLabels('Test C third subtitle only', ['pull off the project']);

api.restoreAllCurrentObstacles();
assertLabels('Restore All remains current subtitle scoped', ['pull off the project']);

api.moveToNextSubtitleSegment();
assertLabels('Test D subtitle progression', ['call it a day']);
