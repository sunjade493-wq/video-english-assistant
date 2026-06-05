const STORAGE_KEY = 'video-english-assistant-hidden-cards-v1';

const obstacles = [
  {
    id: 'word-lecture',
    type: '生词',
    kind: 'word',
    word: 'lecture',
    phonetic: '/ˈlektʃər/',
    translation: '讲座；授课',
  },
  {
    id: 'understanding-lay-it-on-us',
    type: '理解',
    kind: 'understanding',
    source: "If you enjoyed this lecture,\nI'm sure you're too busy\nto lay it on us.",
    literal: '把它放到我们身上',
    actual: '把想说的话直接告诉我们；别拐弯抹角。',
    grammar: 'lay it on someone 是口语表达，常用于请求对方直接说出信息或要求。这里的 to lay it on us 是不定式短语，补充说明 too busy 后面省略语境中的动作。',
  },
];

const cardStream = document.querySelector('#cardStream');
const restoreAllButton = document.querySelector('#restoreAllButton');

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

restoreAllButton.addEventListener('click', restoreAllCards);
renderCards();
