const STORAGE_KEY = 'video-english-assistant-hidden-cards-v1';
const DEFAULT_SUBTITLE_TEXT = "If you enjoyed this lecture, I'm sure you're too busy to lay it on us.";
const DEFAULT_VOCABULARY_LEVEL = 'junior';

const vocabularyLevels = {
  junior: {
    label: '初中',
    words: [
      'a', 'about', 'after', 'all', 'an', 'and', 'are', 'be', 'busy', 'but', 'can', 'do', 'enjoy',
      'enjoyed', 'for', 'from', 'have', 'he', 'her', 'him', 'i', "i'm", 'if', 'in', 'is', 'it', 'lay',
      'me', 'my', 'not', 'of', 'on', 'or', 'our', 'she', 'sure', 'that', 'the', 'this', 'to',
      'too', 'us', 'we', 'you', "you're", 'your',
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
    id: 'understanding-pull-me-off-the-project',
    phrase: 'pull me off the project',
    literal: '把我从项目上拉下来',
    actual: '让我退出这个项目；把我调离这个项目。',
    grammar: 'pull someone off something 是短语动词，表示把某人从某项任务、岗位或项目中撤下。',
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

function detectVocabularyObstacles(text, levelName = DEFAULT_VOCABULARY_LEVEL, customWords = []) {
  const knownWords = resolveVocabularyWords(levelName, customWords);
  const seenWords = new Set();

  return tokenize(text).reduce((result, rawWord) => {
    const word = normalizeWord(rawWord);

    if (!word || seenWords.has(word) || knownWords.has(word)) {
      return result;
    }

    seenWords.add(word);
    const dictionaryEntry = wordDictionary[word] || createFallbackWordEntry(word);

    result.push({
      id: dictionaryEntry.id,
      type: '生词',
      kind: 'word',
      word,
      phonetic: dictionaryEntry.phonetic,
      translation: dictionaryEntry.translation,
    });

    return result;
  }, []);
}

function detectUnderstandingObstacles(text) {
  const normalizedSubtitle = normalizeText(text);

  return understandingPatterns
    .filter((pattern) => normalizedSubtitle.includes(normalizeText(pattern.phrase)))
    .map((pattern) => ({
      id: pattern.id,
      type: '理解',
      kind: 'understanding',
      source: text,
      literal: pattern.literal,
      actual: pattern.actual,
      grammar: pattern.grammar,
    }));
}

function analyzeSubtitleText(text, options = {}) {
  const subtitleText = String(text || '').trim();

  if (!subtitleText) {
    return [];
  }

  return [
    ...detectVocabularyObstacles(subtitleText, options.level, options.customWords),
    ...detectUnderstandingObstacles(subtitleText),
  ];
}

let obstacles = analyzeSubtitleText(DEFAULT_SUBTITLE_TEXT, { level: DEFAULT_VOCABULARY_LEVEL });

const cardStream = document.querySelector('#cardStream');
const restoreAllButton = document.querySelector('#restoreAllButton');
const subtitleTextInput = document.querySelector('#subtitleTextInput');
const analyzeButton = document.querySelector('#analyzeButton');

function getHiddenCardIds() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

function saveHiddenCardIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function hideCard(cardId) {
  const hiddenIds = new Set(getHiddenCardIds());
  hiddenIds.add(cardId);
  saveHiddenCardIds([...hiddenIds]);
  renderCards();
}

function restoreAllCards() {
  localStorage.removeItem(STORAGE_KEY);
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
    content.append(
      createDetailBlock('生词', obstacle.word),
      createDetailBlock('音标', obstacle.phonetic),
      createDetailBlock('中文释义', obstacle.translation),
    );
  }

  if (obstacle.kind === 'understanding') {
    content.append(
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
  dismissButton.addEventListener('click', () => hideCard(obstacle.id));

  inner.append(label, content, dismissButton);
  card.append(inner);
  return card;
}

function renderEmptyState() {
  const emptyState = document.createElement('div');
  emptyState.className = 'empty-state';
  emptyState.textContent = '全部障碍卡片都已隐藏。点击“恢复全部”重新显示。';
  cardStream.append(emptyState);
}

function renderCards() {
  const hiddenIds = new Set(getHiddenCardIds());
  const visibleObstacles = obstacles.filter((obstacle) => !hiddenIds.has(obstacle.id));

  cardStream.innerHTML = '';

  if (visibleObstacles.length === 0) {
    renderEmptyState();
    return;
  }

  visibleObstacles.forEach((obstacle) => {
    cardStream.append(createCard(obstacle));
  });
}

function analyzeAndRender(text, options = {}) {
  obstacles = analyzeSubtitleText(text, options);
  restoreAllCards();
  return obstacles;
}

function handleAnalyzeClick() {
  obstacles = window.ObstacleDetectionEngine.analyzeSubtitleText(
    subtitleTextInput.value,
    { level: DEFAULT_VOCABULARY_LEVEL },
  );

  restoreAllCards();
}

restoreAllButton.addEventListener('click', restoreAllCards);
analyzeButton.addEventListener('click', handleAnalyzeClick);
renderCards();

window.ObstacleDetectionEngine = {
  Analyze: analyzeAndRender,
  analyze: analyzeAndRender,
  analyzeSubtitleText,
  detectVocabularyObstacles,
  detectUnderstandingObstacles,
  levels: Object.fromEntries(
    Object.entries(vocabularyLevels).map(([name, level]) => [name, level.label]),
  ),
};
