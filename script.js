const DEFAULT_SUBTITLE_TEXT = `Demo subtitle unavailable.`;
const REAL_SUBTITLE_DATA_URL = 'output_text/v28d_bilingual_subtitles.json';
const REAL_OBSTACLE_DATA_URL = 'output_text/v29a_obstacles.json';
const DEFAULT_VOCABULARY_LEVEL = 'junior';
const EPISODE_PROGRESS_STORAGE_PREFIX = 'videoEnglishAssistant.episodeProgress.';

const SUPPORTED_PART_OF_SPEECH_FORMATS = new Set([
  'n.',
  'pron.',
  'adj.',
  'adv.',
  'prep.',
  'conj.',
  'interj.',
  'det.',
  'num.',
  'vt.',
  'vi.',
  'vt./vi.',
  'n./vt.',
  'n./vi.',
  'n./vi./vt.',
  'adj./n.',
  'adj./vt.',
  'adj./adv.',
  'adv./adj.',
  'adv./adj./prep./n.',
  'aux. v.',
  'modal v.',
  'linking v.',
]);
const SENTENCE_MEANING_EXPLANATORY_PATTERNS = ['在', '这里', '语境', '表示', '用来', '指', '说明', '意思是', '相当于'];


const subtitleTranslations = new Map();

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
    prototype: 'lay something on somebody',
    literal: '把某件事放到某人身上',
    actual: '把想说的话直接告诉对方；别拐弯抹角。',
    grammar: 'lay + something + on + somebody 的核心动作是“把某物放到某人身上”。当 something 是信息、要求或想法时，on somebody 表示把这些内容直接交给对方承接，所以口语里可以引申为“直接说给某人听”。字幕里的 it 指代要说的内容，us 是接收信息的人。',
  },
  {
    id: 'understanding-give-me-a-hand',
    phrase: 'give me a hand',
    prototype: 'give somebody a hand',
    literal: '给某人一只手',
    actual: '帮某人一下；搭把手。',
    grammar: 'give + somebody + a hand 的字面画面是“把一只手给某人”。hand 在动作场景里代表可用的劳力或协助，因此给某人一只手就自然引申为“提供帮助”。字幕里的 me 只是具体对象，结构可以替换成其他人。',
  },
  {
    id: 'understanding-pull-off-the-project',
    phrase: 'pull off the project',
    prototype: 'pull somebody off something',
    literal: '把某人从某事物上拉开',
    actual: '让某人退出某项任务；把某人从某事中撤下。',
    grammar: 'pull + somebody + off + something 的核心动作是“把某人拉离某个位置”。off 表示离开原来的接触点或参与位置，所以放到 project、task、case 等工作语境中，就表示把某人从该任务中调离或撤下。',
    patterns: [
      /\bpull(?:ed)?\s+(?:[a-z]+\s+)?off\s+the\s+project\b/,
    ],
  },
  {
    id: 'understanding-call-it-a-day',
    phrase: 'call it a day',
    prototype: 'call it a day',
    literal: '把某事称为一天的结束',
    actual: '今天到此为止；收工。',
    grammar: 'call + it + a day 的结构里，call 表示“把某事认定为……”，it 指当前正在做的工作或活动，a day 指“一天的工作量/一天的阶段”。把当前活动认定为 a day，就表示这个阶段已经够了，可以停止并结束今天的工作。',
  },
  {
    id: 'understanding-straight-up',
    phrase: 'straight up',
    prototype: 'straight up',
    literal: '笔直向上',
    actual: '坦率地说；真的；不夸张地。',
    grammar: 'straight + up 的空间画面是“笔直向上、没有偏斜”。这种“不歪、不绕”的方向感转到说话方式上，就表示内容直接、坦率、不加掩饰，也可用来强调“真的”。',
  },
  {
    id: 'understanding-come-on',
    phrase: 'come on',
    prototype: 'come on',
    literal: '过来；继续向前',
    actual: '得了吧；拜托；加油；快点。',
    grammar: 'come + on 原本表示“继续往前/靠近”。说话人用它推动对方进入下一步动作或状态，所以会根据语气引申为催促“快点”、鼓励“加油”、请求“拜托”，或反驳对方继续相信不合理内容的“得了吧”。',
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

function findNormalizedPhraseRange(text, phrase) {
  const phraseWords = tokenize(phrase).map(normalizeWord);

  if (phraseWords.length === 0) {
    return null;
  }

  const textWords = [...text.matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g)].map((match) => ({
    word: normalizeWord(match[0]),
    index: match.index,
    end: match.index + match[0].length,
  }));

  for (let index = 0; index <= textWords.length - phraseWords.length; index += 1) {
    const isMatch = phraseWords.every((word, offset) => textWords[index + offset].word === word);

    if (isMatch) {
      const lastWord = textWords[index + phraseWords.length - 1];

      return {
        index: textWords[index].index,
        end: lastWord.end,
      };
    }
  }

  return null;
}

function findNormalizedPhraseIndex(text, phrase) {
  return findNormalizedPhraseRange(text, phrase)?.index ?? -1;
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
      const range = findNormalizedPhraseRange(text, matcher);

      if (range) {
        match = {
          index: range.index,
          source: text.slice(range.index, range.end),
          end: range.end,
        };
      }
    }

    if (!match || (earliestMatch && earliestMatch.index <= match.index)) {
      return earliestMatch;
    }

    return match;
  }, null);
}

function getAnalyzeEngine() {
  return window.AnalyzeEngine || globalThis.AnalyzeEngine;
}

function createSubtitleItemsFromText(text) {
  return parseSubtitleSegments(text).map((segment, index) => ({
    id: `subtitle-${index + 1}`,
    text: segment.text,
    start: segment.start,
    end: segment.end,
  }));
}

function detectVocabularyObstacles(text, levelName = DEFAULT_VOCABULARY_LEVEL, customWords = []) {
  const engine = getAnalyzeEngine();

  if (engine) {
    return engine.analyzeSubtitleItems(
      [{ id: 'subtitle-1', text: String(text || ''), start: 0, end: String(text || '').length }],
      { level: levelName, customWords },
    ).filter((obstacle) => obstacle.type === 'vocab');
  }

  return [];
}

function detectUnderstandingObstacles(text) {
  const engine = getAnalyzeEngine();

  if (engine) {
    return engine.analyzeSubtitleItems(
      [{ id: 'subtitle-1', text: String(text || ''), start: 0, end: String(text || '').length }],
      { level: 'custom', customWords: tokenize(text) },
    ).filter((obstacle) => obstacle.type === 'comprehension');
  }

  return [];
}

function isIndexWithinRanges(index, ranges) {
  return ranges.some((range) => index >= range.start && index < range.end);
}

function normalizeDedupKeyPart(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function pickComprehensionExpression(item) {
  return item?.prototype || item?.normalizedText || item?.baseForm || item?.phrase || item?.text || '';
}

function makeVocabularyDedupKey(item) {
  return [item?.word, item?.partOfSpeech, item?.sentenceMeaning].map(normalizeDedupKeyPart).join('|');
}

function makeComprehensionDedupKey(item) {
  return normalizeDedupKeyPart(pickComprehensionExpression(item));
}

function makeObstacleDedupKey(obstacle) {
  const type = normalizeObstacleType(obstacle?.type || obstacle?.kind);

  if (type === 'vocab') {
    return `vocab:${makeVocabularyDedupKey(obstacle)}`;
  }

  if (type === 'comprehension') {
    return `comprehension:${makeComprehensionDedupKey(obstacle)}`;
  }

  return `other:${normalizeDedupKeyPart(obstacle?.id)}`;
}

function dedupeObstaclesById(obstaclesToDedupe) {
  const seenDedupKeys = new Set();

  return obstaclesToDedupe.filter((obstacle) => {
    const dedupKey = makeObstacleDedupKey(obstacle);

    if (seenDedupKeys.has(dedupKey)) {
      return false;
    }

    seenDedupKeys.add(dedupKey);
    return true;
  });
}

function analyzeSubtitleText(text, options = {}) {
  const subtitleText = String(text || '').trim();
  const engine = getAnalyzeEngine();

  if (!subtitleText || !engine) {
    return [];
  }

  return engine.analyzeSubtitleItems(createSubtitleItemsFromText(subtitleText), options);
}

let subtitleSegments = [];
let currentSegmentIndex = 0;
let isVideoPlaying = true;
let playbackTimer = null;
let obstacles = [];
let hiddenObstacleIds = new Set();
let dismissedObstacleHistory = [];
let currentEpisodeProgressKey = '';
let streamMode = 'dynamic';
const LEARNING_TIPS_MODE = 'auto';
let selectedObstacleId = null;
let learningPauseHintTimer = null;
let currentTimeMs = 0;
let playbackStartedAt = 0;
let playbackStartedTimeMs = 0;
let timelineRenderTimer = null;
let activeHeatClusterKey = null;
let activeDataSource = 'pending';
let playbackRate = 1;

const SEGMENT_DURATION_MS = 3600;
const LEARNING_PAUSE_HINT_STORAGE_KEY = 'videoEnglishAssistant.learningPauseHintDismissed';
const DESKTOP_HEAT_AXIS_CLUSTER_THRESHOLD_PX = 24;
const MOBILE_HEAT_AXIS_CLUSTER_THRESHOLD_PX = 18;
const MOBILE_HEAT_AXIS_MEDIA_QUERY = '(max-width: 640px)';
const cardStream = document.querySelector('#cardStream');
const conqueredObstacleCount = document.querySelector('#conqueredObstacleCount');
const remainingObstacleCount = document.querySelector('#remainingObstacleCount');
const episodeUndoButton = document.querySelector('#episodeUndoButton');
const currentSubtitleLine = document.querySelector('#currentSubtitleLine');
const playIcon = document.querySelector('#playIcon');
const videoStatusText = document.querySelector('#videoStatusText');
const videoFrame = document.querySelector('.video-frame');
const learningPauseHint = document.querySelector('#learningPauseHint');
const learningPauseHintDismiss = document.querySelector('#learningPauseHintDismiss');
const timelinePlayButton = document.querySelector('#timelinePlayButton');
const videoTimeline = document.querySelector('#videoTimeline');
const timelineTimeText = document.querySelector('#timelineTimeText');
const obstacleHeatAxis = document.querySelector('#obstacleHeatAxis');
const bottomSheetBackdrop = document.querySelector('#bottomSheetBackdrop');
const obstacleBottomSheet = document.querySelector('#obstacleBottomSheet');
const bottomSheetTitle = document.querySelector('#bottomSheetTitle');
const bottomSheetContent = document.querySelector('#bottomSheetContent');
const bottomSheetClose = document.querySelector('#bottomSheetClose');
const playbackSpeedButtons = document.querySelectorAll('.playback-speed-button');



function renderPlaybackSpeedControls() {
  playbackSpeedButtons.forEach((button) => {
    const buttonRate = Number(button.dataset.playbackRate);
    const isSelected = buttonRate === playbackRate;

    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  });
}

function handlePlaybackSpeedSelection(event) {
  const nextPlaybackRate = Number(event.currentTarget.dataset.playbackRate);

  if (!Number.isFinite(nextPlaybackRate)) {
    return;
  }

  playbackRate = nextPlaybackRate;
  renderPlaybackSpeedControls();
}

function parseTimeToMs(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1000 ? value : value * 1000;
  }

  const text = String(value ?? '').trim();

  if (!text) {
    return null;
  }

  const numericValue = Number(text);

  if (Number.isFinite(numericValue)) {
    return numericValue > 1000 ? numericValue : numericValue * 1000;
  }

  const match = text.match(/^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const milliseconds = Number((match[4] || '').padEnd(3, '0') || 0);

  return (((hours * 60) + minutes) * 60 + seconds) * 1000 + milliseconds;
}

function pickFirstValue(row, keys) {
  const key = keys.find((candidateKey) => row?.[candidateKey] !== undefined && row?.[candidateKey] !== null);
  return key ? row[key] : undefined;
}

function normalizeObstacleType(type) {
  const normalizedType = String(type || '').trim().toLowerCase();

  if (['vocabulary', 'vocab', 'word'].includes(normalizedType)) {
    return 'vocab';
  }

  if (['comprehension', 'understanding'].includes(normalizedType)) {
    return 'comprehension';
  }

  return normalizedType || 'comprehension';
}

function isBlankRuntimeField(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function getRuntimeDisplayText(value) {
  return String(value ?? '').trim();
}

function getComprehensionDisplayTitle(row) {
  return getRuntimeDisplayText(pickFirstValue(row, ['prototype', 'phrase', 'text']));
}

function logInvalidRuntimeObstacle(row, type, field, reason) {
  console.error('Invalid runtime obstacle data skipped', {
    id: row?.id,
    type,
    field,
    reason,
    source_en: row?.source_en,
    source_zh: row?.source_zh,
    raw: row,
  });
}

function validateVocabularyObstacle(row) {
  const type = 'vocab';
  const requiredFields = ['word', 'phonetic', 'partOfSpeech', 'sentenceMeaning'];

  for (const field of requiredFields) {
    if (isBlankRuntimeField(row?.[field])) {
      logInvalidRuntimeObstacle(row, type, field, 'required field is missing, null, empty, or whitespace-only');
      return false;
    }
  }

  const partOfSpeech = getRuntimeDisplayText(row.partOfSpeech);

  if (!SUPPORTED_PART_OF_SPEECH_FORMATS.has(partOfSpeech)) {
    logInvalidRuntimeObstacle(row, type, 'partOfSpeech', 'unsupported partOfSpeech display format');
    return false;
  }

  const sentenceMeaning = getRuntimeDisplayText(row.sentenceMeaning);
  const explanatoryPattern = SENTENCE_MEANING_EXPLANATORY_PATTERNS.find((pattern) => sentenceMeaning.includes(pattern));

  if (explanatoryPattern) {
    logInvalidRuntimeObstacle(
      row,
      type,
      'sentenceMeaning',
      `clearly long explanatory text pattern detected: ${explanatoryPattern}`,
    );
    return false;
  }

  return true;
}

function validateComprehensionObstacle(row) {
  const type = 'comprehension';

  if (!getComprehensionDisplayTitle(row)) {
    logInvalidRuntimeObstacle(row, type, 'prototype|phrase|text', 'no display title can be resolved');
    return false;
  }

  for (const field of ['literal', 'actual', 'grammar']) {
    if (isBlankRuntimeField(row?.[field])) {
      logInvalidRuntimeObstacle(row, type, field, 'required field is missing, null, empty, or whitespace-only');
      return false;
    }
  }

  return true;
}

function validateRuntimeObstacle(row) {
  const type = normalizeObstacleType(row?.type || row?.kind);

  if (type === 'vocab') {
    return validateVocabularyObstacle(row);
  }

  if (type === 'comprehension') {
    return validateComprehensionObstacle(row);
  }

  logInvalidRuntimeObstacle(row, type, 'type', 'unsupported obstacle type');
  return false;
}

function normalizeRealSubtitleRows(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.subtitles || payload?.rows || payload?.items || [];
  let nextCharStart = 0;

  return rows.map((row, rowIndex) => {
    const englishText = String(pickFirstValue(row, ['en', 'english', 'source_en', 'text']) || '').trim();
    const chineseText = String(pickFirstValue(row, ['zh', 'chinese', 'source_zh', 'translation']) || '').trim();
    const startMs = parseTimeToMs(pickFirstValue(row, ['start', 'start_time']));
    const endMs = parseTimeToMs(pickFirstValue(row, ['end', 'end_time']));
    const start = nextCharStart;
    const end = start + englishText.length;
    nextCharStart = end + 2;

    if (chineseText) {
      subtitleTranslations.set(englishText, chineseText);
    }

    return {
      id: row.id || `real-subtitle-${rowIndex + 1}`,
      text: englishText,
      start,
      end,
      startMs: startMs ?? rowIndex * SEGMENT_DURATION_MS,
      endMs: endMs ?? ((rowIndex + 1) * SEGMENT_DURATION_MS),
    };
  }).filter((segment) => segment.text);
}

function findSubtitleSegmentIndexByTime(startMs) {
  if (!Number.isFinite(startMs)) {
    return 0;
  }

  const directIndex = subtitleSegments.findIndex((segment) => (
    Number.isFinite(segment.startMs)
    && Number.isFinite(segment.endMs)
    && startMs >= segment.startMs
    && startMs < segment.endMs
  ));

  if (directIndex >= 0) {
    return directIndex;
  }

  let nearestIndex = 0;
  let nearestDistance = Infinity;

  subtitleSegments.forEach((segment, index) => {
    const distance = Math.abs((segment.startMs ?? 0) - startMs);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

function warnInvalidFrozenMarker(row, rowIndex, reason) {
  const obstacleId = row?.id || row?.engineId || `row-${rowIndex + 1}`;
  console.warn(`[subtitle-marker] Obstacle ${obstacleId} has no valid frozen marker bounds: ${reason}`);
}

function normalizeFrozenMarkerBounds(row, rowIndex, segment) {
  const hasMarkerStart = row?.markerStart !== null && row?.markerStart !== undefined && row?.markerStart !== '';
  const hasMarkerEnd = row?.markerEnd !== null && row?.markerEnd !== undefined && row?.markerEnd !== '';
  const markerStart = Number(row?.markerStart);
  const markerEnd = Number(row?.markerEnd);

  if (!hasMarkerStart || !hasMarkerEnd || !Number.isFinite(markerStart) || !Number.isFinite(markerEnd)) {
    warnInvalidFrozenMarker(row, rowIndex, 'markerStart/markerEnd are missing or not finite');
    return { markerStart: null, markerEnd: null };
  }

  if (markerStart < 0 || markerEnd <= markerStart || markerEnd > segment.text.length) {
    warnInvalidFrozenMarker(row, rowIndex, 'markerStart/markerEnd are outside the subtitle segment or reversed');
    return { markerStart: null, markerEnd: null };
  }

  return {
    markerStart: segment.start + markerStart,
    markerEnd: segment.start + markerEnd,
  };
}

function normalizeObstacle(row, rowIndex = 0) {
  const type = normalizeObstacleType(row?.type || row?.kind);
  const kind = type === 'vocab' ? 'word' : 'understanding';
  const startMs = parseTimeToMs(pickFirstValue(row, ['start', 'start_time']));
  const endMs = parseTimeToMs(pickFirstValue(row, ['end', 'end_time']));
  const segmentIndex = findSubtitleSegmentIndexByTime(startMs);
  const segment = subtitleSegments[segmentIndex] || { start: 0, end: 1, text: '' };
  const label = type === 'vocab'
    ? getRuntimeDisplayText(row?.word)
    : getComprehensionDisplayTitle(row);
  const frozenMarkerBounds = normalizeFrozenMarkerBounds(row, rowIndex, segment);
  const index = frozenMarkerBounds.markerStart ?? segment.start;
  const end = frozenMarkerBounds.markerEnd ?? index;
  const baseObstacle = {
    id: row?.id || `real-obstacle-${rowIndex + 1}`,
    type,
    kind,
    index,
    end,
    markerStart: frozenMarkerBounds.markerStart,
    markerEnd: frozenMarkerBounds.markerEnd,
    source: row?.source_en || row?.text || label,
    sourceZh: row?.source_zh,
    priority: row?.priority,
    timeMs: startMs ?? segment.startMs,
    endTimeMs: endMs ?? segment.endMs,
  };

  if (type === 'vocab') {
    const word = getRuntimeDisplayText(row?.word);
    const baseForm = row?.baseForm || '';
    const surfaceText = row?.text || row?.word || label;
    const phrase = row?.phrase || row?.word || label;

    return {
      ...baseObstacle,
      word,
      lemma: row?.lemma || '',
      baseForm,
      surfaceText,
      phrase,
      prototype: row?.prototype || row?.word || label,
      phonetic: getRuntimeDisplayText(row?.phonetic),
      partOfSpeech: getRuntimeDisplayText(row?.partOfSpeech),
      translation: row?.translation || '',
      sentenceMeaning: getRuntimeDisplayText(row?.sentenceMeaning),
      literal: row?.literal || '',
      actual: row?.actual || '',
      grammar: row?.grammar || '',
    };
  }

  return {
    ...baseObstacle,
    phrase: getRuntimeDisplayText(row?.phrase || row?.text),
    prototype: getComprehensionDisplayTitle(row),
    word: row?.word || '',
    baseForm: row?.baseForm || '',
    phonetic: row?.phonetic || '',
    translation: row?.translation || '',
    sentenceMeaning: row?.sentenceMeaning || '',
    literal: getRuntimeDisplayText(row?.literal),
    actual: getRuntimeDisplayText(row?.actual),
    grammar: getRuntimeDisplayText(row?.grammar),
  };
}

function normalizeObstacles(rows) {
  return dedupeObstaclesById(rows
    .filter((row) => validateRuntimeObstacle(row))
    .map((row, rowIndex) => normalizeObstacle(row, rowIndex)));
}

function normalizeRealObstacleRows(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.obstacles || [];
  return normalizeObstacles(rows);
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`${url} ${response.status}`);
  }

  return response.json();
}

async function loadRealEpisodeData() {
  const [subtitlePayload, obstaclePayload] = await Promise.all([
    fetchJson(REAL_SUBTITLE_DATA_URL),
    fetchJson(REAL_OBSTACLE_DATA_URL),
  ]);
  const realSubtitleSegments = normalizeRealSubtitleRows(subtitlePayload);

  if (realSubtitleSegments.length === 0) {
    throw new Error('No real subtitles found.');
  }

  subtitleSegments = realSubtitleSegments;
  obstacles = normalizeRealObstacleRows(obstaclePayload);
  activeDataSource = 'real';
  currentEpisodeProgressKey = getEpisodeProgressKey(JSON.stringify({ source: 'real', subtitles: subtitleSegments.map((segment) => segment.text) }));
  applyStoredEpisodeProgress(currentEpisodeProgressKey);
  saveEpisodeProgress();
  currentSegmentIndex = 0;
  currentTimeMs = 0;
  selectedObstacleId = null;
  streamMode = 'dynamic';
  renderVideoState();
  renderCards();
  syncPlaybackClock();
  return true;
}

function loadDemoEpisodeData() {
  subtitleSegments = parseSubtitleSegments(DEFAULT_SUBTITLE_TEXT);
  obstacles = analyzeSubtitleText(DEFAULT_SUBTITLE_TEXT, { level: DEFAULT_VOCABULARY_LEVEL });
  activeDataSource = 'demo';
  currentEpisodeProgressKey = getEpisodeProgressKey(DEFAULT_SUBTITLE_TEXT);
  applyStoredEpisodeProgress(currentEpisodeProgressKey);
  saveEpisodeProgress();
  currentSegmentIndex = 0;
  currentTimeMs = 0;
  selectedObstacleId = null;
  streamMode = 'dynamic';
  renderVideoState();
  renderCards();
  syncPlaybackClock();
}

async function initApp() {
  try {
    await loadRealEpisodeData();
    return;
  } catch (error) {
    console.warn('Real episode data failed to load. Falling back to demo data.', error);
  }

  loadDemoEpisodeData();
}

function parseSubtitleSegments(text) {
  const sourceText = String(text || '').trim();

  if (!sourceText) {
    return [];
  }

  const matches = [...sourceText.matchAll(/\S[\s\S]*?(?=\n\s*\n|$)/g)];

  return matches.map((match) => {
    const rawText = match[0];
    const leadingWhitespaceLength = rawText.match(/^\s*/)[0].length;
    const textStart = match.index + leadingWhitespaceLength;
    const textContent = rawText.trim();

    return {
      text: textContent.replace(/\s*\n\s*/g, ' '),
      start: textStart,
      end: textStart + textContent.length,
    };
  });
}

function getCurrentSubtitleSegment() {
  return subtitleSegments[currentSegmentIndex] || null;
}

function getTotalDurationMs() {
  const timedDuration = subtitleSegments.reduce((maxEndTime, segment) => (
    Number.isFinite(segment.endMs) ? Math.max(maxEndTime, segment.endMs) : maxEndTime
  ), 0);

  if (timedDuration > 0) {
    return Math.max(SEGMENT_DURATION_MS, timedDuration);
  }

  return Math.max(SEGMENT_DURATION_MS, subtitleSegments.length * SEGMENT_DURATION_MS);
}

function clampTime(timeMs) {
  return Math.max(0, Math.min(timeMs, getTotalDurationMs()));
}

function getTimeForSegmentIndex(segmentIndex) {
  const segment = subtitleSegments[Math.max(0, segmentIndex)];

  if (segment && Number.isFinite(segment.startMs)) {
    return Math.max(0, segment.startMs);
  }

  return Math.max(0, segmentIndex) * SEGMENT_DURATION_MS;
}

function getSegmentIndexForTime(timeMs) {
  if (subtitleSegments.length === 0) {
    return 0;
  }

  const clampedTime = clampTime(timeMs);
  const timedSegmentIndex = subtitleSegments.findIndex((segment, index) => {
    if (!Number.isFinite(segment.startMs) || !Number.isFinite(segment.endMs)) {
      return false;
    }

    const nextSegment = subtitleSegments[index + 1];
    const segmentEndMs = Number.isFinite(nextSegment?.startMs)
      ? Math.max(segment.endMs, nextSegment.startMs)
      : segment.endMs;

    return clampedTime >= segment.startMs && clampedTime < segmentEndMs;
  });

  if (timedSegmentIndex >= 0) {
    return timedSegmentIndex;
  }

  if (subtitleSegments.some((segment) => Number.isFinite(segment.startMs))) {
    return subtitleSegments.length - 1;
  }

  return Math.min(
    subtitleSegments.length - 1,
    Math.max(0, Math.floor(clampedTime / SEGMENT_DURATION_MS)),
  );
}

function getObstacleTimeMs(obstacle) {
  const segmentIndex = subtitleSegments.findIndex((segment) => isObstacleInSegment(obstacle, segment));

  if (segmentIndex < 0) {
    return 0;
  }

  const segment = subtitleSegments[segmentIndex];
  const segmentLength = Math.max(1, segment.end - segment.start);
  const relativeOffset = Math.max(0, Math.min(1, (obstacle.index - segment.start) / segmentLength));

  if (Number.isFinite(segment.startMs) && Number.isFinite(segment.endMs)) {
    return segment.startMs + (relativeOffset * Math.max(1, segment.endMs - segment.startMs));
  }

  return getTimeForSegmentIndex(segmentIndex) + (relativeOffset * SEGMENT_DURATION_MS);
}

function formatTimelineTime(timeMs) {
  const totalSeconds = Math.floor(clampTime(timeMs) / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${minutes}:${seconds}`;
}

function getTimelinePercent(timeMs) {
  return (clampTime(timeMs) / getTotalDurationMs()) * 100;
}

function getHeatAxisClusterThresholdPx() {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia(MOBILE_HEAT_AXIS_MEDIA_QUERY).matches
      ? MOBILE_HEAT_AXIS_CLUSTER_THRESHOLD_PX
      : DESKTOP_HEAT_AXIS_CLUSTER_THRESHOLD_PX;
  }

  return DESKTOP_HEAT_AXIS_CLUSTER_THRESHOLD_PX;
}

function getAxisWidth() {
  if (!obstacleHeatAxis || typeof obstacleHeatAxis.getBoundingClientRect !== 'function') {
    return 720;
  }

  return Math.max(1, obstacleHeatAxis.getBoundingClientRect().width || 720);
}

function getObstacleLabel(obstacle) {
  return obstacle.kind === 'word' ? obstacle.surfaceText || obstacle.word : obstacle.surfaceText || obstacle.source || obstacle.phrase;
}

function getPendingObstacles() {
  return obstacles.filter((obstacle) => !hiddenObstacleIds.has(obstacle.id));
}

function getObstaclesInSegment(segment, sourceObstacles = obstacles) {
  if (!segment) {
    return [];
  }

  return sourceObstacles.filter((obstacle) => (
    obstacle.index >= segment.start
    && obstacle.index < segment.end
  ));
}

function getSegmentObstacles(segment = getCurrentSubtitleSegment()) {
  return getObstaclesInSegment(segment, getPendingObstacles());
}

function getCurrentSegmentObstacles() {
  return getSegmentObstacles();
}

function findSegmentIndexForObstacle(obstacleId) {
  const obstacle = obstacles.find((item) => item.id === obstacleId);

  if (!obstacle) {
    return -1;
  }

  return subtitleSegments.findIndex((segment) => (
    obstacle.index >= segment.start
    && obstacle.index < segment.end
  ));
}

function syncSubtitleSegmentToObstacle(obstacleId) {
  const matchingSegmentIndex = findSegmentIndexForObstacle(obstacleId);

  if (matchingSegmentIndex >= 0) {
    currentSegmentIndex = matchingSegmentIndex;
  }
}

function getSelectedPendingObstacle() {
  if (!selectedObstacleId) {
    return null;
  }

  return getPendingObstacles().find((obstacle) => obstacle.id === selectedObstacleId) || null;
}

function sortObstaclesForLearningTips(obstaclesToSort) {
  const kindOrder = {
    word: 0,
    vocab: 0,
    understanding: 1,
    comprehension: 1,
  };

  return [...obstaclesToSort].sort((firstObstacle, secondObstacle) => {
    const firstKindOrder = kindOrder[firstObstacle.kind] ?? 99;
    const secondKindOrder = kindOrder[secondObstacle.kind] ?? 99;

    if (firstKindOrder !== secondKindOrder) {
      return firstKindOrder - secondKindOrder;
    }

    return firstObstacle.index - secondObstacle.index;
  });
}

function getAutoSyncObstacles() {
  return sortObstaclesForLearningTips(getCurrentSegmentObstacles());
}

function isObstacleInSegment(obstacle, segment) {
  return Boolean(segment) && obstacle.index >= segment.start && obstacle.index < segment.end;
}

function getActiveSubtitleObstacles(segment = getCurrentSubtitleSegment()) {
  return getSegmentObstacles(segment);
}

function getMarkerRangeForObstacle(segment, obstacle) {
  const markerStart = Number.isFinite(obstacle.markerStart) ? obstacle.markerStart : null;
  const markerEnd = Number.isFinite(obstacle.markerEnd) ? obstacle.markerEnd : null;

  if (markerStart === null || markerEnd === null || markerEnd <= markerStart) {
    return null;
  }

  const start = markerStart - segment.start;
  const end = markerEnd - segment.start;

  if (start < 0 || end > segment.text.length) {
    return null;
  }

  return {
    obstacle,
    start,
    end,
  };
}

function getMarkerRangesForSegment(segment) {
  return getActiveSubtitleObstacles(segment)
    .map((obstacle) => getMarkerRangeForObstacle(segment, obstacle))
    .filter((range) => range && range.end > range.start)
    .sort((firstRange, secondRange) => firstRange.start - secondRange.start);
}

function appendSubtitleText(text, targetLine = currentSubtitleLine) {
  if (!text) {
    return;
  }

  const textPart = document.createElement('span');
  textPart.className = 'subtitle-text-part';
  textPart.textContent = text;
  targetLine.append(textPart);
}

function stopMarkerEvent(event) {
  event.stopPropagation();
}

function handleMarkerActivation(event, obstacleId) {
  stopMarkerEvent(event);
  pauseVideoForObstacle(obstacleId);
}

function createSubtitleMarker(text, obstacle) {
  const marker = document.createElement('button');
  marker.className = 'subtitle-marker-button';
  marker.type = 'button';
  marker.textContent = text;
  marker.setAttribute('aria-label', `暂停并查看解释：${getObstacleLabel(obstacle)}`);

  if (selectedObstacleId === obstacle.id) {
    marker.classList.add('is-selected');
  }

  marker.addEventListener('pointerup', (event) => handleMarkerActivation(event, obstacle.id));
  marker.addEventListener('touchend', (event) => handleMarkerActivation(event, obstacle.id));
  marker.addEventListener('click', (event) => handleMarkerActivation(event, obstacle.id));

  return marker;
}

function createSubtitleLanguageLine(className) {
  const line = document.createElement('span');
  line.className = className;
  return line;
}

function renderSubtitleMarkers() {
  const segment = getCurrentSubtitleSegment();
  currentSubtitleLine.innerHTML = '';

  if (!segment) {
    appendSubtitleText('暂无字幕');
    return;
  }

  const englishLine = createSubtitleLanguageLine('subtitle-language-line subtitle-english-line');
  const chineseLine = createSubtitleLanguageLine('subtitle-language-line subtitle-chinese-line');
  const ranges = getMarkerRangesForSegment(segment);
  let cursor = 0;

  ranges.forEach((range) => {
    if (range.start < cursor) {
      return;
    }

    appendSubtitleText(segment.text.slice(cursor, range.start), englishLine);
    englishLine.append(createSubtitleMarker(segment.text.slice(range.start, range.end), range.obstacle));
    cursor = range.end;
  });

  appendSubtitleText(segment.text.slice(cursor), englishLine);
  chineseLine.textContent = subtitleTranslations.get(segment.text) || '（中文字幕待补充）';
  currentSubtitleLine.append(englishLine, chineseLine);
}

function getLearningStateLabel() {
  if (isVideoPlaying) {
    return 'Playing';
  }

  return selectedObstacleId ? 'Learning Pause' : 'Paused by you';
}

function renderVideoState() {
  playIcon.textContent = isVideoPlaying ? '⏸' : '▶';

  if (timelinePlayButton) {
    timelinePlayButton.textContent = isVideoPlaying ? '⏸（暂停）' : '▶（播放）';
    timelinePlayButton.setAttribute('aria-label', isVideoPlaying ? '暂停视频' : '播放视频');
  }

  videoStatusText.textContent = `V2.4A Obstacle Timeline · ${getLearningStateLabel()}`;
  renderSubtitleMarkers();
  renderTimelines();
}

function moveToNextSubtitleSegment() {
  if (subtitleSegments.length === 0) {
    return;
  }

  const nextSegmentIndex = (currentSegmentIndex + 1) % subtitleSegments.length;
  seekToTime(getTimeForSegmentIndex(nextSegmentIndex));
}

function stopPlaybackTimer() {
  if (playbackTimer) {
    window.clearInterval(playbackTimer);
    playbackTimer = null;
  }

  if (timelineRenderTimer) {
    window.clearInterval(timelineRenderTimer);
    timelineRenderTimer = null;
  }
}

function updatePlaybackProgress() {
  if (!isVideoPlaying) {
    return;
  }

  const totalDuration = getTotalDurationMs();
  const elapsedMs = Date.now() - playbackStartedAt;
  const nextTimeMs = (playbackStartedTimeMs + elapsedMs) % totalDuration;
  const nextSegmentIndex = getSegmentIndexForTime(nextTimeMs);
  const didSubtitleChange = nextSegmentIndex !== currentSegmentIndex;

  currentTimeMs = nextTimeMs;
  currentSegmentIndex = nextSegmentIndex;
  renderVideoState();

  if (didSubtitleChange) {
    renderCards();
  }
}

function startPlaybackTimer() {
  stopPlaybackTimer();
  playbackStartedAt = Date.now();
  playbackStartedTimeMs = currentTimeMs;
  playbackTimer = window.setInterval(updatePlaybackProgress, 250);
  timelineRenderTimer = window.setInterval(renderTimelines, 100);
}

function syncPlaybackClock() {
  if (isVideoPlaying) {
    if (!playbackTimer) {
      startPlaybackTimer();
    } else {
      playbackStartedAt = Date.now();
      playbackStartedTimeMs = currentTimeMs;
    }
    return;
  }

  stopPlaybackTimer();
}


function seekToTime(timeMs) {
  const wasPlaying = isVideoPlaying;
  const nextTimeMs = clampTime(timeMs);
  const nextSegmentIndex = getSegmentIndexForTime(nextTimeMs >= getTotalDurationMs() ? 0 : nextTimeMs);
  const didSubtitleChange = nextSegmentIndex !== currentSegmentIndex;

  currentTimeMs = nextTimeMs >= getTotalDurationMs() ? 0 : nextTimeMs;
  currentSegmentIndex = nextSegmentIndex;

  if (wasPlaying) {
    playbackStartedAt = Date.now();
    playbackStartedTimeMs = currentTimeMs;
  }

  selectedObstacleId = null;
  renderVideoState();

  if (didSubtitleChange) {
    renderCards();
  } else {
    renderTimelines();
  }
}

function handleTimelineInput(event) {
  const percent = Number(event.target.value) || 0;
  seekToTime((percent / 100) * getTotalDurationMs());
}

function createTimedObstacleForSegment(obstacle, segmentIndex) {
  const timeMs = getTimeForSegmentIndex(segmentIndex);

  return {
    ...obstacle,
    timeMs,
    percent: getTimelinePercent(timeMs),
  };
}

function createObstacleNavigationGroup(segment, segmentIndex) {
  const timeMs = getTimeForSegmentIndex(segmentIndex);
  const segmentObstacles = sortObstaclesForLearningTips(
    getObstaclesInSegment(segment, obstacles),
  ).map((obstacle) => createTimedObstacleForSegment(obstacle, segmentIndex));

  return {
    id: `segment-${segmentIndex}`,
    kind: 'subtitle-segment',
    segment,
    segmentIndex,
    obstacles: segmentObstacles,
    timeMs,
    percent: getTimelinePercent(timeMs),
  };
}

function getObstacleNavigationItems() {
  return subtitleSegments
    .map((segment, segmentIndex) => createObstacleNavigationGroup(segment, segmentIndex))
    .filter((group) => group.obstacles.length > 0)
    .sort((firstGroup, secondGroup) => firstGroup.timeMs - secondGroup.timeMs);
}

function getNavigationItemObstacleCount(item) {
  return Array.isArray(item.obstacles) ? item.obstacles.length : 1;
}

function getClusterObstacleCount(cluster) {
  return cluster.items.reduce((count, item) => count + getNavigationItemObstacleCount(item), 0);
}

function clusterObstacleItems(items) {
  const axisWidth = getAxisWidth();
  const clusters = [];

  items.forEach((item) => {
    const pixel = (item.percent / 100) * axisWidth;
    const lastCluster = clusters[clusters.length - 1];

    if (lastCluster && pixel - lastCluster.lastPixel <= getHeatAxisClusterThresholdPx()) {
      lastCluster.items.push(item);
      lastCluster.lastPixel = pixel;
      lastCluster.centerPercent = lastCluster.items.reduce((sum, clusterItem) => sum + clusterItem.percent, 0) / lastCluster.items.length;
      lastCluster.minPercent = Math.min(lastCluster.minPercent, item.percent);
      lastCluster.maxPercent = Math.max(lastCluster.maxPercent, item.percent);
      return;
    }

    clusters.push({
      items: [item],
      centerPercent: item.percent,
      minPercent: item.percent,
      maxPercent: item.percent,
      lastPixel: pixel,
    });
  });

  return clusters;
}

function getHeatClusterKey(cluster) {
  return cluster.items.map((item) => {
    if (item.kind === 'subtitle-segment') {
      return item.id;
    }

    return item.id;
  }).join('|');
}

function createHeatClusterHighlight(cluster) {
  const highlight = document.createElement('span');
  highlight.className = 'heat-cluster-highlight';
  const leftPercent = Math.max(0, Math.min(cluster.minPercent, cluster.centerPercent));
  const rightPercent = Math.min(100, Math.max(cluster.maxPercent, cluster.centerPercent));

  highlight.style.left = `${leftPercent}%`;
  highlight.style.width = `${Math.max(3, rightPercent - leftPercent)}%`;
  highlight.setAttribute('aria-hidden', 'true');
  return highlight;
}

function createHeatClusterButton(cluster) {
  const button = document.createElement('button');
  const clusterKey = getHeatClusterKey(cluster);

  button.className = 'heat-cluster-button';
  button.type = 'button';
  const obstacleCount = getClusterObstacleCount(cluster);

  const displayCount = obstacleCount >= 100 ? '99+' : String(obstacleCount);

  button.textContent = `[${displayCount}]`;
  button.style.left = `${cluster.centerPercent}%`;
  button.setAttribute('aria-label', `${obstacleCount} obstacles`);

  if (clusterKey === activeHeatClusterKey) {
    button.classList.add('is-selected');
    button.setAttribute('aria-pressed', 'true');
  } else {
    button.setAttribute('aria-pressed', 'false');
  }

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    openBottomSheet(cluster);
  });

  return button;
}

function renderTimelines() {
  if (videoTimeline) {
    videoTimeline.value = String(getTimelinePercent(currentTimeMs));
  }

  if (timelineTimeText) {
    timelineTimeText.textContent = `${formatTimelineTime(currentTimeMs)} / ${formatTimelineTime(getTotalDurationMs())}`;
  }

  if (!obstacleHeatAxis) {
    return [];
  }

  const clusters = clusterObstacleItems(getObstacleNavigationItems());
  obstacleHeatAxis.innerHTML = '';

  clusters.forEach((cluster) => obstacleHeatAxis.append(createHeatClusterButton(cluster)));
  return clusters;
}

function closeBottomSheet() {
  activeHeatClusterKey = null;

  if (bottomSheetBackdrop) {
    bottomSheetBackdrop.hidden = true;
    bottomSheetBackdrop.classList.remove('is-visible');
  }

  if (obstacleBottomSheet) {
    obstacleBottomSheet.hidden = true;
    obstacleBottomSheet.classList.remove('is-visible');
  }

  renderTimelines();
}

function getSortedClusterItems(cluster) {
  return [...cluster.items].sort((firstItem, secondItem) => {
    const firstTime = firstItem.timeMs ?? getObstacleTimeMs(firstItem);
    const secondTime = secondItem.timeMs ?? getObstacleTimeMs(secondItem);

    if (firstTime !== secondTime) {
      return firstTime - secondTime;
    }

    return (firstItem.index ?? 0) - (secondItem.index ?? 0);
  });
}

function getSortedObstaclesForSubtitleUnit(obstaclesToSort) {
  return sortObstaclesForLearningTips(obstaclesToSort);
}

function isSubtitleNavigationGroup(item) {
  return item && item.kind === 'subtitle-segment' && Array.isArray(item.obstacles);
}

function getClusterSubtitleGroups(clusterItems) {
  const groupedItems = clusterItems.filter(isSubtitleNavigationGroup);

  if (groupedItems.length > 0) {
    return groupedItems.map((group) => ({
      segment: group.segment,
      segmentIndex: group.segmentIndex,
      obstacles: getSortedObstaclesForSubtitleUnit(group.obstacles),
    })).filter((group) => group.obstacles.length > 0);
  }

  return subtitleSegments.map((segment, segmentIndex) => ({
    segment,
    segmentIndex,
    obstacles: getSortedObstaclesForSubtitleUnit(getObstaclesInSegment(segment, clusterItems)),
  })).filter((group) => group.obstacles.length > 0);
}

function createBottomSheetObstacleButton(obstacle) {
  const button = document.createElement('button');
  button.className = 'bottom-sheet__obstacle';
  button.type = 'button';
  button.textContent = `${obstacle.kind === 'word' ? '○' : '●'} ${obstacle.kind === 'word' ? obstacle.surfaceText || obstacle.word : obstacle.phrase}`;
  button.addEventListener('click', () => {
    const wasPlaying = isVideoPlaying;
    selectedObstacleId = obstacle.id;
    seekToTime(obstacle.timeMs);
    isVideoPlaying = wasPlaying;
    selectedObstacleId = obstacle.id;
    streamMode = 'dynamic';
    syncPlaybackClock();
    closeBottomSheet();
    renderVideoState();
    renderCards();
  });

  return button;
}

function createBottomSheetSubtitleGroup(group) {
  const groupElement = document.createElement('article');
  groupElement.className = 'bottom-sheet__subtitle-group';

  const time = document.createElement('div');
  time.className = 'bottom-sheet__time';
  time.textContent = formatTimelineTime(getTimeForSegmentIndex(group.segmentIndex));

  const subtitle = document.createElement('p');
  subtitle.className = 'bottom-sheet__subtitle';
  subtitle.textContent = group.segment.text;

  const obstacleList = document.createElement('div');
  obstacleList.className = 'bottom-sheet__obstacles';
  group.obstacles.forEach((obstacle) => obstacleList.append(createBottomSheetObstacleButton(obstacle)));

  groupElement.append(time, subtitle, obstacleList);
  return groupElement;
}

function openBottomSheet(cluster) {
  activeHeatClusterKey = getHeatClusterKey(cluster);
  const clusterItems = getSortedClusterItems(cluster);
  const subtitleGroups = getClusterSubtitleGroups(clusterItems);
  const obstacleCount = getClusterObstacleCount(cluster);

  if (bottomSheetTitle) {
    bottomSheetTitle.textContent = `当前区域障碍（${obstacleCount}）`;
  }

  if (bottomSheetContent) {
    bottomSheetContent.innerHTML = '';
    subtitleGroups.forEach((group) => bottomSheetContent.append(createBottomSheetSubtitleGroup(group)));
  }

  if (bottomSheetBackdrop) {
    bottomSheetBackdrop.hidden = false;
    bottomSheetBackdrop.classList.add('is-visible');
  }

  if (obstacleBottomSheet) {
    obstacleBottomSheet.hidden = false;
    obstacleBottomSheet.classList.add('is-visible');
  }

  renderTimelines();
}

let lastVideoActivationTime = 0;

function toggleVideoPlayback() {
  setVideoPlayback(!isVideoPlaying);
}

function handleVideoFrameActivation() {
  const activationTime = Date.now();

  if (activationTime - lastVideoActivationTime < 350) {
    return;
  }

  lastVideoActivationTime = activationTime;
  toggleVideoPlayback();
}

function hideLearningPauseHint() {
  if (!learningPauseHint) {
    return;
  }

  if (learningPauseHintTimer) {
    window.clearTimeout(learningPauseHintTimer);
    learningPauseHintTimer = null;
  }

  learningPauseHint.classList.remove('is-visible');
  learningPauseHint.hidden = true;
}

function isLearningPauseHintDismissed() {
  return window.localStorage.getItem(LEARNING_PAUSE_HINT_STORAGE_KEY) === 'true';
}

function showLearningPauseHint() {
  if (!learningPauseHint || isLearningPauseHintDismissed()) {
    return;
  }

  if (learningPauseHintTimer) {
    window.clearTimeout(learningPauseHintTimer);
  }

  learningPauseHint.hidden = false;
  window.requestAnimationFrame(() => {
    learningPauseHint.classList.add('is-visible');
  });
  learningPauseHintTimer = window.setTimeout(() => {
    learningPauseHint.classList.remove('is-visible');
    learningPauseHintTimer = null;
  }, 5500);
}

function dismissLearningPauseHint(event) {
  if (event) {
    event.stopPropagation();
  }

  window.localStorage.setItem(LEARNING_PAUSE_HINT_STORAGE_KEY, 'true');
  hideLearningPauseHint();
}

function setVideoPlayback(nextIsPlaying) {
  if (isVideoPlaying && !nextIsPlaying) {
    currentTimeMs = (playbackStartedTimeMs + (Date.now() - playbackStartedAt)) % getTotalDurationMs();
    currentSegmentIndex = getSegmentIndexForTime(currentTimeMs);
  }

  isVideoPlaying = Boolean(nextIsPlaying);

  if (isVideoPlaying) {
    hideLearningPauseHint();
  }

  syncPlaybackClock();
  renderVideoState();
  renderCards();
}

function pauseVideoForObstacle(obstacleId) {
  selectedObstacleId = obstacleId;
  streamMode = 'dynamic';
  setVideoPlayback(false);
  showLearningPauseHint();
  renderCards();
}


function getEpisodeTextFingerprint(text) {
  return normalizeText(String(text || '')).replace(/'/g, '');
}

function hashEpisodeText(text) {
  const source = getEpisodeTextFingerprint(text) || 'empty';
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

function getEpisodeProgressKey(text) {
  return `${EPISODE_PROGRESS_STORAGE_PREFIX}${hashEpisodeText(text)}`;
}

function getCurrentObstacleIdSet() {
  return new Set(obstacles.map((obstacle) => obstacle.id));
}

function filterObstacleIdsForCurrentEpisode(obstacleIds) {
  const currentObstacleIds = getCurrentObstacleIdSet();

  return [...new Set(obstacleIds || [])].filter((obstacleId) => currentObstacleIds.has(obstacleId));
}

function readStoredEpisodeProgress(progressKey) {
  const storedProgress = window.localStorage.getItem(progressKey);

  if (!storedProgress) {
    return null;
  }

  return JSON.parse(storedProgress);
}

function saveEpisodeProgress() {
  if (!currentEpisodeProgressKey) {
    return;
  }

  const hiddenIds = filterObstacleIdsForCurrentEpisode([...hiddenObstacleIds]);
  const historyIds = (dismissedObstacleHistory || []).filter((obstacleId) => hiddenIds.includes(obstacleId));

  window.localStorage.setItem(currentEpisodeProgressKey, JSON.stringify({
    version: 1,
    totalObstacleIds: obstacles.map((obstacle) => obstacle.id),
    hiddenObstacleIds: hiddenIds,
    dismissedObstacleHistory: historyIds,
    updatedAt: new Date().toISOString(),
  }));
}

function applyStoredEpisodeProgress(progressKey) {
  const storedProgress = readStoredEpisodeProgress(progressKey);
  const hiddenIds = filterObstacleIdsForCurrentEpisode(storedProgress?.hiddenObstacleIds || []);

  hiddenObstacleIds = new Set(hiddenIds);
  dismissedObstacleHistory = filterObstacleIdsForCurrentEpisode(
    storedProgress?.dismissedObstacleHistory || hiddenIds,
  ).filter((obstacleId) => hiddenObstacleIds.has(obstacleId));
}

function getEpisodeProgressCounts() {
  const total = obstacles.length;
  const conquered = filterObstacleIdsForCurrentEpisode([...hiddenObstacleIds]).length;

  return {
    total,
    conquered,
    remaining: Math.max(0, total - conquered),
  };
}

function renderEpisodeProgress() {
  const { conquered, remaining } = getEpisodeProgressCounts();

  if (conqueredObstacleCount) {
    conqueredObstacleCount.textContent = conquered;
  }

  if (remainingObstacleCount) {
    remainingObstacleCount.textContent = remaining;
  }

  if (episodeUndoButton) {
    episodeUndoButton.textContent = '↩ 返回上一个障碍';
    episodeUndoButton.disabled = dismissedObstacleHistory.length === 0;
  }
}

function undoLastDismissedObstacle() {
  while (dismissedObstacleHistory.length > 0) {
    const obstacleId = dismissedObstacleHistory.pop();

    if (hiddenObstacleIds.has(obstacleId)) {
      hiddenObstacleIds.delete(obstacleId);
      const restoredObstacle = obstacles.find((obstacle) => obstacle.id === obstacleId);

      if (restoredObstacle) {
        selectedObstacleId = obstacleId;
        syncSubtitleSegmentToObstacle(obstacleId);
        currentTimeMs = getTimeForSegmentIndex(currentSegmentIndex);
      }

      streamMode = 'dynamic';
      saveEpisodeProgress();
      renderVideoState();
      renderCards();
      return restoredObstacle || null;
    }
  }

  saveEpisodeProgress();
  renderCards();
  return null;
}

function replaceObstacleStream(nextObstacles, text = DEFAULT_SUBTITLE_TEXT) {
  activeDataSource = 'analyze';
  obstacles = nextObstacles;
  currentEpisodeProgressKey = getEpisodeProgressKey(text);
  applyStoredEpisodeProgress(currentEpisodeProgressKey);
  streamMode = 'dynamic';
  selectedObstacleId = null;
  currentSegmentIndex = 0;
  currentTimeMs = 0;
  subtitleSegments = parseSubtitleSegments(text);
  saveEpisodeProgress();
  closeBottomSheet();
  renderVideoState();
  syncPlaybackClock();
}

function hideCurrentObstacle(obstacleId) {
  if (!hiddenObstacleIds.has(obstacleId)) {
    hiddenObstacleIds.add(obstacleId);
    dismissedObstacleHistory.push(obstacleId);
  }

  if (selectedObstacleId === obstacleId) {
    selectedObstacleId = null;
  }

  streamMode = 'dynamic';
  saveEpisodeProgress();
  renderVideoState();
  renderCards();
}

function restoreAllCurrentObstacles() {
  const currentSegment = getCurrentSubtitleSegment();
  const currentObstacleIds = new Set(getObstaclesInSegment(currentSegment).map((obstacle) => obstacle.id));

  currentObstacleIds.forEach((obstacleId) => hiddenObstacleIds.delete(obstacleId));
  dismissedObstacleHistory = dismissedObstacleHistory.filter((obstacleId) => !currentObstacleIds.has(obstacleId));
  streamMode = 'dynamic';
  saveEpisodeProgress();
  renderVideoState();
  renderCards();
}

function createDetailBlock(title, text) {
  const block = document.createElement('p');
  block.className = 'detail-block';

  const label = document.createElement('span');
  label.className = 'detail-title';
  label.textContent = `${title}：`;

  const content = document.createElement('span');
  content.className = 'detail-text';
  content.textContent = text;

  block.append(label, content);
  return block;
}

function createWordHeadline(obstacle) {
  const headline = document.createElement('div');
  headline.className = 'vocab-headline';

  const titleLine = document.createElement('p');
  titleLine.className = 'vocab-title-line';

  const word = document.createElement('span');
  word.className = 'vocab-word';
  word.textContent = obstacle.word || '';
  titleLine.append(word);

  const phonetic = document.createElement('span');
  phonetic.className = 'vocab-phonetic';
  phonetic.textContent = obstacle.phonetic || '';
  titleLine.append(phonetic);

  const partOfSpeech = document.createElement('span');
  partOfSpeech.className = 'vocab-part-of-speech';
  partOfSpeech.textContent = obstacle.partOfSpeech || '';
  titleLine.append(partOfSpeech);

  const audioIcon = document.createElement('span');
  audioIcon.className = 'vocab-audio-icon';
  audioIcon.textContent = '🔊';
  titleLine.append(audioIcon);

  headline.append(titleLine);
  return headline;
}

function createWordSentenceMeaning(obstacle) {
  const meaning = document.createElement('p');
  meaning.className = 'vocab-sentence-meaning';
  meaning.textContent = `句中含义：${obstacle.sentenceMeaning || ''}`;

  return meaning;
}

function createUnderstandingPrototype(obstacle) {
  const prototype = document.createElement('p');
  prototype.className = 'understanding-prototype';
  prototype.textContent = obstacle.prototype;

  return prototype;
}

function createObstacleItem(obstacle) {
  const item = document.createElement('article');
  item.className = 'obstacle-item';
  item.dataset.obstacleId = obstacle.id;

  const content = document.createElement('div');
  content.className = 'card-content obstacle-item__content';

  if (obstacle.kind === 'word') {
    content.append(
      createWordHeadline(obstacle),
      createWordSentenceMeaning(obstacle),
    );
  }

  if (obstacle.kind === 'understanding') {
    content.append(
      createUnderstandingPrototype(obstacle),
      createDetailBlock('字面意思', obstacle.literal),
      createDetailBlock('实际意思', obstacle.actual),
      createDetailBlock('语法解释', obstacle.grammar),
    );
  }

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const dismissButton = document.createElement('button');
  dismissButton.className = 'dismiss-button';
  dismissButton.type = 'button';
  dismissButton.textContent = '✓ 不用管我了';
  dismissButton.addEventListener('click', () => hideCurrentObstacle(obstacle.id));

  actions.append(dismissButton);
  item.append(content, actions);
  return item;
}

function createObstacleGroup(type, groupObstacles) {
  const group = document.createElement('section');
  group.className = 'obstacle-card obstacle-group';
  group.dataset.obstacleType = type;

  const inner = document.createElement('div');
  inner.className = 'card-inner obstacle-group__inner';

  const label = document.createElement('h3');
  label.className = 'type-label obstacle-group__label';
  label.textContent = type === 'vocab' ? '生词障碍' : '理解障碍';

  const list = document.createElement('div');
  list.className = 'obstacle-group__items';

  groupObstacles.forEach((obstacle) => {
    list.append(createObstacleItem(obstacle));
  });

  inner.append(label, list);
  group.append(inner);
  return group;
}

function renderObstacleGroups(visibleObstacles) {
  const groupOrder = ['vocab', 'comprehension'];

  groupOrder.forEach((type) => {
    const groupObstacles = visibleObstacles.filter((obstacle) => obstacle.type === type);

    if (groupObstacles.length > 0) {
      cardStream.append(createObstacleGroup(type, groupObstacles));
    }
  });
}

function renderEmptyState() {
  const emptyState = document.createElement('div');
  emptyState.className = 'empty-state';
  emptyState.textContent = '当前视频内容没有需要处理的障碍。';
  cardStream.append(emptyState);
}

function getVisibleObstacles() {
  return getAutoSyncObstacles();
}

function renderModePrompt() {
  const prompt = document.createElement('div');
  prompt.className = 'empty-state';
  prompt.textContent = '当前字幕没有需要同步显示的障碍。';
  cardStream.append(prompt);
}

function renderCards() {
  renderEpisodeProgress();
  const pendingObstacles = getPendingObstacles();
  const visibleObstacles = getVisibleObstacles();

  cardStream.innerHTML = '';

  if (pendingObstacles.length === 0) {
    renderEmptyState();
    return visibleObstacles;
  }

  if (visibleObstacles.length === 0) {
    renderModePrompt();
    return visibleObstacles;
  }

  renderObstacleGroups(visibleObstacles);

  return visibleObstacles;
}

function setLearningTipsMode() {
  selectedObstacleId = null;
  streamMode = 'dynamic';
  renderVideoState();
  return renderCards();
}

function analyzeAndRender(text, options = {}) {
  replaceObstacleStream(analyzeSubtitleText(text, options), text);
  return renderCards();
}

if (episodeUndoButton) {
  episodeUndoButton.addEventListener('click', undoLastDismissedObstacle);
}
learningPauseHintDismiss.addEventListener('click', dismissLearningPauseHint);
learningPauseHint.addEventListener('pointerup', stopMarkerEvent);
learningPauseHint.addEventListener('touchend', stopMarkerEvent);
learningPauseHint.addEventListener('click', stopMarkerEvent);
videoFrame.addEventListener('pointerup', handleVideoFrameActivation);
videoFrame.addEventListener('touchend', handleVideoFrameActivation);
videoFrame.addEventListener('click', handleVideoFrameActivation);
if (timelinePlayButton) {
  timelinePlayButton.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleVideoPlayback();
  });
}
if (videoTimeline) {
  videoTimeline.addEventListener('input', handleTimelineInput);
  videoTimeline.addEventListener('click', stopMarkerEvent);
  videoTimeline.addEventListener('pointerup', stopMarkerEvent);
}
if (obstacleHeatAxis) {
  obstacleHeatAxis.addEventListener('click', stopMarkerEvent);
  obstacleHeatAxis.addEventListener('pointerup', stopMarkerEvent);
}
if (bottomSheetClose) {
  bottomSheetClose.addEventListener('click', closeBottomSheet);
}
if (bottomSheetBackdrop) {
  bottomSheetBackdrop.addEventListener('click', closeBottomSheet);
}
playbackSpeedButtons.forEach((button) => {
  button.addEventListener('click', handlePlaybackSpeedSelection);
});
renderPlaybackSpeedControls();
initApp();

window.ObstacleDetectionEngine = {
  Analyze: analyzeAndRender,
  analyze: analyzeAndRender,
  analyzeSubtitleText,
  detectVocabularyObstacles,
  detectUnderstandingObstacles,
  restoreAllCurrentObstacles,
  undoLastDismissedObstacle,
  getEpisodeProgressCounts,
  hideCurrentObstacle,
  toggleVideoPlayback,
  getPlaybackState: () => ({
    isVideoPlaying,
    selectedObstacleId,
    currentSegmentIndex,
    currentTimeMs,
    totalDurationMs: getTotalDurationMs(),
    activeDataSource,
  }),
  seekToTime,
  getObstacleNavigationItems,
  clusterObstacleItems,
  renderTimelines,
  openBottomSheet,
  closeBottomSheet,
  getVisibleObstacles,
  learningTipsMode: LEARNING_TIPS_MODE,
  setLearningTipsMode,
  pauseVideoForObstacle,
  getCurrentSegmentObstacles,
  moveToNextSubtitleSegment,
  levels: Object.fromEntries(
    Object.entries(vocabularyLevels).map(([name, level]) => [name, level.label]),
  ),
};
