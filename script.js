const STORAGE_KEY = 'video-english-assistant-hidden-cards-v1';

const obstacles = [
  {
    id: 'word-lecture',
    type: '生词',
    kind: 'word',
    word: 'lecture',
    phonetic: '/ˈlektʃər/',
    translation: '讲座',
  },
  {
    id: 'understanding-lay-it-on-us',
    type: '理解',
    kind: 'understanding',
    phrase: 'lay it on us',
    source: "If you enjoyed this lecture,\nI'm sure you're too busy\nto lay it on us.",
    literal: '把它放到我们身上',
    actual: '直接告诉我们',
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
    const word = document.createElement('p');
    word.className = 'word';
    word.textContent = obstacle.word;

    const phonetic = document.createElement('p');
    phonetic.className = 'phonetic';
    phonetic.textContent = obstacle.phonetic;

    const translation = document.createElement('p');
    translation.className = 'translation';
    translation.textContent = obstacle.translation;

    content.append(word, phonetic, translation);
  }

  if (obstacle.kind === 'understanding') {
    const phrase = document.createElement('p');
    phrase.className = 'phrase';
    phrase.textContent = obstacle.phrase;

    content.append(
      phrase,
      createDetailBlock('出处', obstacle.source),
      createDetailBlock('字面意思', obstacle.literal),
      createDetailBlock('实际意思', obstacle.actual),
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
