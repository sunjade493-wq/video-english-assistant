const DEFAULT_SUBTITLE_TEXT = `If you enjoyed this lecture,
I'm sure you're too busy to lay it on us.

Can you give me a hand?

I was pulled off the project.

Let's call it a day.`;
const DEFAULT_VOCABULARY_LEVEL = 'junior';

const vocabularyLevels = {
  junior: {
    label: '初中',
    words: [
      'a', 'about', 'after', 'all', 'an', 'and', 'are', 'be', 'busy', 'but', 'can', 'do', 'enjoy',
      'enjoyed', 'for', 'from', 'have', 'he', 'her', 'him', 'i', "i'm", 'if', 'in', 'is', 'it', 'lay',
      'me', 'my', 'not', 'let\'s', 'of', 'on', 'or', 'our', 'she', 'sure', 'that', 'the', 'this', 'to',
      'too', 'us', 'was', 'we', 'you', "you're", 'your',
    ],
  },
  senior: {
    label: '高中',
    extends: 'junior',
    words: ['academic', 'lecture', 'project', 'straight'],
  },
  cet4: {
    label: 'CET4',
    extends: 'senior',
    words: ['context', 'literal', 'phrase', 'subtitle'],
  },
  cet6: {
    label: 'CET6',
    extends: 'cet4',
    words: ['idiom', 'metaphor', 'nonliteral'],
  },
  custom: {
    label: '自定义词汇量',
    extends: 'cet4',
    words: [],
  },
};

const wordDictionary = {
  lecture: {
    id: 'word-lecture',
    phonetic: '/ˈlektʃər/',
    translation: '讲座；授课',
  },
  academic: {
    id: 'word-academic',
    phonetic: '/ˌækəˈdemɪk/',
    translation: '学术的；学院的',
  },
  project: {
    id: 'word-project',
    phonetic: '/ˈprɑːdʒekt/',
    translation: '项目；工程',
  },
};

const understandingPatterns = [
  {
    id: 'understanding-lay-it-on-us',
    phrase: 'lay it on us',
    literal: '把它放到我们身上',
    actual: '把想说的话直接告诉我们；别拐弯抹角。',
    grammar: 'lay it on someone 是口语表达，常用于请求对方直接说出信息或要求。这里的 to lay it on us 是不定式短语，补充说明 too busy 后面省略语境中的动作。',
  },
  {
    id: 'understanding-give-me-a-hand',
    phrase: 'give me a hand',
    literal: '给我一只手',
    actual: '帮我一下；搭把手。',
    grammar: 'give someone a hand 是口语表达，hand 在这里不是字面的一只手，而是表示帮助。',
  },
  {
    id: 'understanding-pull-off-the-project',
    phrase: 'pull off the project',
    literal: '从项目上拉开',
    actual: '让某人退出项目；把某人从项目中撤下。',
    grammar: 'pull someone off something 是短语动词，表示把某人从某项任务、岗位或项目中撤下。字幕中的 pulled off the project 是被动形式。',
    patterns: [
      /\bpull(?:ed)?\s+(?:[a-z]+\s+)?off\s+the\s+project\b/,
    ],
  },
  {
    id: 'understanding-call-it-a-day',
    phrase: 'call it a day',
    literal: '把它叫作一天',
    actual: '今天到此为止；收工。',
    grammar: 'call it a day 是固定习语，常用于表示结束当天的工作或活动。',
  },
  {
    id: 'understanding-straight-up',
    phrase: 'straight up',
    literal: '笔直向上',
    actual: '坦率地说；真的；不夸张地。',
    grammar: 'straight up 是口语/俚语副词短语，常用于强调说话内容真实、直接。',
  },
  {
    id: 'understanding-come-on',
    phrase: 'come on',
    literal: '过来；来到上面',
    actual: '得了吧；拜托；加油；快点。',
    grammar: 'come on 是高频非字面义表达，具体含义取决于语气和上下文，可表示催促、鼓励或不相信。',
  },
];

function normalizeWord(word) {
  return word.toLowerCase().replace(/^'+|'+$/g, '');
}

function tokenize(text) {
  return text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
}

function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9']+/g, ' ').replace(/\s+/g, ' ').trim();
}

function resolveVocabularyWords(levelName, customWords = []) {
  const level = vocabularyLevels[levelName] ? levelName : DEFAULT_VOCABULARY_LEVEL;
  const words = new Set(customWords.map(normalizeWord));
  const visitedLevels = new Set();

  function collect(currentLevelName) {
    if (visitedLevels.has(currentLevelName)) {
      return;
    }

    const currentLevel = vocabularyLevels[currentLevelName];
    if (!currentLevel) {
      return;
    }

    visitedLevels.add(currentLevelName);

    if (currentLevel.extends) {
      collect(currentLevel.extends);
    }

    currentLevel.words.forEach((word) => words.add(normalizeWord(word)));
  }

  collect(level);
  return words;
}

function createFallbackWordEntry(word) {
  return {
    id: `word-${word}`,
    phonetic: '待补充',
    translation: '待补充',
  };
}

function findNormalizedPhraseIndex(text, phrase) {
  const phraseWords = tokenize(phrase).map(normalizeWord);

  if (phraseWords.length === 0) {
    return -1;
  }

  const textWords = [...text.matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g)].map((match) => ({
    word: normalizeWord(match[0]),
    index: match.index,
  }));

  for (let index = 0; index <= textWords.length - phraseWords.length; index += 1) {
    const isMatch = phraseWords.every((word, offset) => textWords[index + offset].word === word);

    if (isMatch) {
      return textWords[index].index;
    }
  }

  return -1;
}

function findUnderstandingMatch(text, pattern) {
  const matchers = pattern.patterns || [pattern.phrase];

  return matchers.reduce((earliestMatch, matcher) => {
    let match = null;

    if (Object.prototype.toString.call(matcher) === '[object RegExp]') {
      const flags = matcher.flags.includes('i') ? matcher.flags : `${matcher.flags}i`;
      const regex = new RegExp(matcher.source, flags);
      const regexMatch = regex.exec(text);

      if (regexMatch) {
        match = {
          index: regexMatch.index,
          source: regexMatch[0],
          end: regexMatch.index + regexMatch[0].length,
        };
      }
    } else {
      const index = findNormalizedPhraseIndex(text, matcher);

      if (index >= 0) {
        match = {
          index,
          source: text.slice(index, index + matcher.length),
          end: index + matcher.length,
        };
      }
    }

    if (!match || (earliestMatch && earliestMatch.index <= match.index)) {
      return earliestMatch;
    }

    return match;
  }, null);
}

function detectVocabularyObstacles(text, levelName = DEFAULT_VOCABULARY_LEVEL, customWords = []) {
  const knownWords = resolveVocabularyWords(levelName, customWords);
  const seenWords = new Set();
  const wordMatches = text.matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g);

  return [...wordMatches].reduce((result, rawWordMatch) => {
    const word = normalizeWord(rawWordMatch[0]);

    if (!word || seenWords.has(word) || knownWords.has(word)) {
      return result;
    }

    seenWords.add(word);
    const dictionaryEntry = wordDictionary[word] || createFallbackWordEntry(word);

    result.push({
      id: dictionaryEntry.id,
      type: '生词',
      kind: 'word',
      index: rawWordMatch.index,
      word,
      phonetic: dictionaryEntry.phonetic,
      translation: dictionaryEntry.translation,
    });

    return result;
  }, []);
}

function detectUnderstandingObstacles(text) {
  return understandingPatterns.reduce((result, pattern) => {
    const match = findUnderstandingMatch(text, pattern);

    if (!match) {
      return result;
    }

    result.push({
      id: pattern.id,
      type: '理解',
      kind: 'understanding',
      index: match.index,
      phrase: pattern.phrase,
      source: match.source,
      end: match.end,
      literal: pattern.literal,
      actual: pattern.actual,
      grammar: pattern.grammar,
    });

    return result;
  }, []);
}

function isIndexWithinRanges(index, ranges) {
  return ranges.some((range) => index >= range.start && index < range.end);
}

function dedupeObstaclesById(obstaclesToDedupe) {
  const seenObstacleIds = new Set();

  return obstaclesToDedupe.filter((obstacle) => {
    if (seenObstacleIds.has(obstacle.id)) {
      return false;
    }

    seenObstacleIds.add(obstacle.id);
    return true;
  });
}

function analyzeSubtitleText(text, options = {}) {
  const subtitleText = String(text || '').trim();

  if (!subtitleText) {
    return [];
  }

  const understandingObstacles = detectUnderstandingObstacles(subtitleText);
  const understandingRanges = understandingObstacles.map((obstacle) => ({
    start: obstacle.index,
    end: obstacle.end,
  }));
  const vocabularyObstacles = detectVocabularyObstacles(
    subtitleText,
    options.level,
    options.customWords,
  ).filter((obstacle) => !isIndexWithinRanges(obstacle.index, understandingRanges));
  const detectedObstacles = [
    ...vocabularyObstacles,
    ...understandingObstacles,
  ].sort((firstObstacle, secondObstacle) => firstObstacle.index - secondObstacle.index);

  return dedupeObstaclesById(detectedObstacles);
}

let obstacles = analyzeSubtitleText(DEFAULT_SUBTITLE_TEXT, { level: DEFAULT_VOCABULARY_LEVEL });
let hiddenObstacleIds = new Set();
let streamMode = 'dynamic';

const cardStream = document.querySelector('#cardStream');
const restoreAllButton = document.querySelector('#restoreAllButton');
const subtitleTextInput = document.querySelector('#subtitleTextInput');
const analyzeButton = document.querySelector('#analyzeButton');

function resetObstacleStream(nextObstacles) {
  obstacles = nextObstacles;
  hiddenObstacleIds = new Set();
  streamMode = 'dynamic';
}

function hideCurrentObstacle(obstacleId) {
  hiddenObstacleIds.add(obstacleId);
  streamMode = 'dynamic';
  renderCards();
}

function restoreAllCurrentObstacles() {
  hiddenObstacleIds = new Set();
  streamMode = 'restored';
  renderCards();
}

function createDetailBlock(title, text) {
  const block = document.createElement('div');
  block.className = 'detail-block';

  const label = document.createElement('span');
  label.className = 'detail-title';
  label.textContent = `${title}：`;

  const content = document.createElement('p');
  content.className = 'detail-text';
  content.textContent = text;

  block.append(label, content);
  return block;
}

function getCompactTranslation(translation) {
  return String(translation || '').split(/[；;]/)[0].trim();
}

function createWordSummary(obstacle) {
  const summary = document.createElement('p');
  summary.className = 'word-summary';
  summary.textContent = [
    obstacle.word,
    obstacle.phonetic,
    getCompactTranslation(obstacle.translation),
  ].filter(Boolean).join(' ');

  return summary;
}


function createUnderstandingSummary(obstacle) {
  const summary = document.createElement('p');
  summary.className = 'understanding-summary';
  summary.textContent = obstacle.phrase;

  return summary;
}

function createCard(obstacle) {
  const card = document.createElement('article');
  card.className = 'obstacle-card';

  const inner = document.createElement('div');
  inner.className = 'card-inner';

  const label = document.createElement('span');
  label.className = 'type-label';
  label.textContent = `[${obstacle.type}]`;

  const content = document.createElement('div');
  content.className = 'card-content';

  if (obstacle.kind === 'word') {
    content.append(createWordSummary(obstacle));
  }

  if (obstacle.kind === 'understanding') {
    content.append(
      createUnderstandingSummary(obstacle),
      createDetailBlock('出处', obstacle.source),
      createDetailBlock('字面意思', obstacle.literal),
      createDetailBlock('实际意思', obstacle.actual),
      createDetailBlock('语法解释', obstacle.grammar),
    );
  }

  const dismissButton = document.createElement('button');
  dismissButton.className = 'dismiss-button';
  dismissButton.type = 'button';
  dismissButton.textContent = '✓ 不用管我了';
  dismissButton.addEventListener('click', () => hideCurrentObstacle(obstacle.id));

  inner.append(label, content, dismissButton);
  card.append(inner);
  return card;
}

function renderEmptyState() {
  const emptyState = document.createElement('div');
  emptyState.className = 'empty-state';
  emptyState.textContent = '当前视频内容没有需要处理的障碍。';
  cardStream.append(emptyState);
}

function getPendingObstacles() {
  return obstacles.filter((obstacle) => !hiddenObstacleIds.has(obstacle.id));
}

function getVisibleObstacles() {
  const pendingObstacles = getPendingObstacles();

  if (streamMode === 'restored') {
    return pendingObstacles;
  }

  return pendingObstacles.slice(0, 1);
}

function renderCards() {
  const pendingObstacles = getPendingObstacles();
  const visibleObstacles = getVisibleObstacles();

  cardStream.innerHTML = '';

  if (pendingObstacles.length === 0) {
    renderEmptyState();
    return visibleObstacles;
  }

  visibleObstacles.forEach((obstacle) => {
    cardStream.append(createCard(obstacle));
  });

  return visibleObstacles;
}

function analyzeAndRender(text, options = {}) {
  resetObstacleStream(analyzeSubtitleText(text, options));
  return renderCards();
}

function handleAnalyzeClick() {
  analyzeAndRender(subtitleTextInput.value, { level: DEFAULT_VOCABULARY_LEVEL });
}

analyzeButton.addEventListener('click', handleAnalyzeClick);
restoreAllButton.addEventListener('click', restoreAllCurrentObstacles);
renderCards();

window.ObstacleDetectionEngine = {
  Analyze: analyzeAndRender,
  analyze: analyzeAndRender,
  analyzeSubtitleText,
  detectVocabularyObstacles,
  detectUnderstandingObstacles,
  restoreAllCurrentObstacles,
  getVisibleObstacles,
  levels: Object.fromEntries(
    Object.entries(vocabularyLevels).map(([name, level]) => [name, level.label]),
  ),
};
