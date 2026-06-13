const SUBTITLE_DATA_URL = 'output_text/v28d_bilingual_subtitles.json';
const OBSTACLE_DATA_URL = 'output_text/v29a_obstacles.json';
const DEFAULT_VOCABULARY_LEVEL = 'junior';

const FALLBACK_DEMO_SUBTITLES = [
  {
    start: 0,
    end: 3.6,
    en: "If you enjoyed this lecture, I'm sure you're too busy to lay it on us.",
    zh: '如果你喜欢这堂讲座，我相信你也很忙，但请直接告诉我们。',
  },
  {
    start: 3.6,
    end: 7.2,
    en: 'Can you give me a hand?',
    zh: '你能帮我一下吗？',
  },
  {
    start: 7.2,
    end: 10.8,
    en: 'I was pulled off the project.',
    zh: '我被调离了这个项目。',
  },
  {
    start: 10.8,
    end: 14.4,
    en: "Let's call it a day.",
    zh: '今天就到这里吧。',
  },
];

const EPISODE_PROGRESS_STORAGE_PREFIX = 'videoEnglishAssistant.episodeProgress.';

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

function dedupeObstaclesById(obstaclesToDedupe) {
  return obstaclesToDedupe;
}


function serializeSubtitleSegments(segments) {
  return segments.map((segment) => segment.en || segment.text || '').filter(Boolean).join('\n\n');
}

function readJsonArrayPayload(payload, preferredKeys = []) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  for (const key of preferredKeys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  return [];
}

function parseTimeValueToMs(value) {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    if (trimmedValue.includes(':')) {
      const parts = trimmedValue.split(':').map((part) => Number(part));

      if (parts.every((part) => Number.isFinite(part))) {
        return parts.reduce((total, part) => (total * 60) + part, 0) * 1000;
      }
    }
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return numericValue > 10000 ? numericValue : numericValue * 1000;
}

function createSubtitleSegmentsFromJson(payload) {
  const rows = readJsonArrayPayload(payload, ['subtitles', 'items', 'data', 'segments']);
  let cursor = 0;

  return rows.map((row, index) => {
    const en = String(row.en || row.english || row.text || '').trim();
    const zh = String(row.zh || row.chinese || row.translation || '').trim();
    const startMs = parseTimeValueToMs(row.start);
    const endMs = parseTimeValueToMs(row.end);

    if (!en || startMs === null || endMs === null || endMs <= startMs) {
      return null;
    }

    const charStart = cursor;
    const charEnd = charStart + en.length;
    cursor = charEnd + 2;

    return {
      id: row.id || `subtitle-${index + 1}`,
      text: en,
      en,
      zh,
      start: charStart,
      end: charEnd,
      startMs,
      endMs,
      rawStart: row.start,
      rawEnd: row.end,
    };
  }).filter(Boolean);
}

function getSubtitleTextForObstacleMatching() {
  return serializeSubtitleSegments(subtitleSegments);
}

function findSegmentBySubtitleReference(obstacle) {
  const subtitleId = obstacle.subtitleId || obstacle.subtitle_id || obstacle.captionId || obstacle.caption_id;

  if (!subtitleId) {
    return null;
  }

  return subtitleSegments.find((segment) => String(segment.id) === String(subtitleId)) || null;
}

function getSegmentStartMs(segment) {
  return Number.isFinite(segment?.startMs) ? segment.startMs : getTimeForSegmentIndex(subtitleSegments.indexOf(segment));
}

function getSegmentEndMs(segment) {
  return Number.isFinite(segment?.endMs) ? segment.endMs : getSegmentStartMs(segment) + SEGMENT_DURATION_MS;
}

function getObstacleStartMs(obstacle) {
  if (Number.isFinite(obstacle?.timeMs)) {
    return obstacle.timeMs;
  }

  if (Number.isFinite(obstacle?.startMs)) {
    return obstacle.startMs;
  }

  const referencedSegment = findSegmentBySubtitleReference(obstacle);

  if (referencedSegment) {
    return getSegmentStartMs(referencedSegment);
  }

  return null;
}

function findObstacleIndexInSubtitles(rawObstacle, label) {
  const subtitleReference = rawObstacle.subtitleId || rawObstacle.subtitle_id || rawObstacle.captionId || rawObstacle.caption_id;
  const sourceText = getSubtitleTextForObstacleMatching();

  if (subtitleReference) {
    const segment = subtitleSegments.find((item) => String(item.id) === String(subtitleReference));

    if (segment && label) {
      const relativeIndex = findNormalizedPhraseIndex(segment.text, label);

      if (relativeIndex >= 0) {
        return segment.start + relativeIndex;
      }
    }
  }

  if (label) {
    return findNormalizedPhraseIndex(sourceText, label);
  }

  return -1;
}

function normalizeObstacleFromJson(rawObstacle, index) {
  const rawKind = String(rawObstacle.kind || rawObstacle.type || '').toLowerCase();
  const word = String(rawObstacle.word || rawObstacle.baseForm || '').trim();
  const text = String(rawObstacle.text || rawObstacle.phrase || rawObstacle.surfaceText || rawObstacle.source || word).trim();
  const isWord = rawKind === 'word' || rawKind === 'vocab' || Boolean(word && !rawObstacle.literal && !rawObstacle.actual && !rawObstacle.grammar);
  const kind = isWord ? 'word' : 'understanding';
  const label = isWord ? word || text : text;
  const explicitIndex = Number(rawObstacle.index ?? rawObstacle.charStart ?? rawObstacle.char_start ?? rawObstacle.textStart ?? rawObstacle.text_start);
  const hasExplicitIndex = Number.isFinite(explicitIndex);
  const matchedIndex = hasExplicitIndex ? explicitIndex : findObstacleIndexInSubtitles(rawObstacle, label);
  const explicitEnd = Number(rawObstacle.charEnd ?? rawObstacle.char_end ?? rawObstacle.textEnd ?? rawObstacle.text_end);
  const startMs = parseTimeValueToMs(
    rawObstacle.time
    ?? rawObstacle.timeMs
    ?? rawObstacle.startTime
    ?? rawObstacle.start_time
    ?? rawObstacle.subtitleStart
    ?? rawObstacle.subtitle_start
    ?? (hasExplicitIndex ? undefined : rawObstacle.start),
  );
  const endMs = parseTimeValueToMs(
    rawObstacle.endTime
    ?? rawObstacle.end_time
    ?? rawObstacle.subtitleEnd
    ?? rawObstacle.subtitle_end
    ?? (hasExplicitIndex ? undefined : rawObstacle.end),
  );
  const fallbackIdPrefix = isWord ? 'word' : 'understanding';
  const fallbackIdLabel = normalizeWord(label).replace(/[^a-z0-9']+/g, '-').replace(/^-+|-+$/g, '') || index + 1;

  return {
    ...rawObstacle,
    id: rawObstacle.id || `${fallbackIdPrefix}-${fallbackIdLabel}-${index + 1}`,
    type: isWord ? 'vocab' : 'comprehension',
    kind,
    label: isWord ? '生词' : '理解障碍',
    surfaceText: rawObstacle.surfaceText || label,
    word: word || label,
    baseForm: word || label,
    text,
    phrase: text,
    phonetic: rawObstacle.phonetic || '',
    translation: rawObstacle.translation || rawObstacle.meaning || '',
    literal: rawObstacle.literal || rawObstacle['字面意思'] || '',
    actual: rawObstacle.actual || rawObstacle['实际意思'] || '',
    grammar: rawObstacle.grammar || rawObstacle['语法解释'] || '',
    subtitleId: rawObstacle.subtitleId || rawObstacle.subtitle_id || rawObstacle.captionId || rawObstacle.caption_id,
    index: matchedIndex >= 0 ? matchedIndex : -1,
    end: Number.isFinite(explicitEnd) ? explicitEnd : (matchedIndex >= 0 ? matchedIndex + label.length : -1),
    startMs,
    endMs,
    timeMs: startMs,
  };
}

function createObstaclesFromJson(payload) {
  return readJsonArrayPayload(payload, ['obstacles', 'items', 'data']).map(normalizeObstacleFromJson);
}

async function fetchJsonFile(url) {
  if (typeof fetch !== 'function') {
    throw new Error('fetch is unavailable in this environment');
  }

  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  return response.json();
}

async function loadSubtitleSegments() {
  try {
    const subtitlePayload = await fetchJsonFile(SUBTITLE_DATA_URL);
    const loadedSegments = createSubtitleSegmentsFromJson(subtitlePayload);

    if (loadedSegments.length > 0) {
      return loadedSegments;
    }

    throw new Error(`${SUBTITLE_DATA_URL} did not contain valid subtitle rows`);
  } catch (error) {
    console.warn(`Using fallback demo subtitles because ${SUBTITLE_DATA_URL} could not be loaded.`, error);
    return createSubtitleSegmentsFromJson(FALLBACK_DEMO_SUBTITLES);
  }
}

async function loadObstacleDataForCurrentSubtitles() {
  try {
    const obstaclePayload = await fetchJsonFile(OBSTACLE_DATA_URL);
    return createObstaclesFromJson(obstaclePayload);
  } catch (error) {
    console.warn(`Using analyzed fallback obstacles because ${OBSTACLE_DATA_URL} could not be loaded.`, error);
    return analyzeSubtitleText(serializeSubtitleSegments(subtitleSegments), { level: DEFAULT_VOCABULARY_LEVEL });
  }
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

const SEGMENT_DURATION_MS = 3600;
const LEARNING_PAUSE_HINT_STORAGE_KEY = 'videoEnglishAssistant.learningPauseHintDismissed';
const HEAT_AXIS_CLUSTER_THRESHOLD_PX = 56;
const cardStream = document.querySelector('#cardStream');
const conqueredObstacleCount = document.querySelector('#conqueredObstacleCount');
const remainingObstacleCount = document.querySelector('#remainingObstacleCount');
const episodeUndoButton = document.querySelector('#episodeUndoButton');
const subtitleTextInput = document.querySelector('#subtitleTextInput');
const analyzeButton = document.querySelector('#analyzeButton');
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

function parseSubtitleSegments(text) {
  const sourceText = String(text || '').trim();

  if (!sourceText) {
    return [];
  }

  const matches = [...sourceText.matchAll(/\S[\s\S]*?(?=\n\s*\n|$)/g)];

  return matches.map((match, index) => {
    const rawText = match[0];
    const leadingWhitespaceLength = rawText.match(/^\s*/)[0].length;
    const textStart = match.index + leadingWhitespaceLength;
    const textContent = rawText.trim();
    const text = textContent.replace(/\s*\n\s*/g, ' ');

    return {
      id: `subtitle-${index + 1}`,
      text,
      en: text,
      zh: '',
      start: textStart,
      end: textStart + textContent.length,
      startMs: index * SEGMENT_DURATION_MS,
      endMs: (index + 1) * SEGMENT_DURATION_MS,
    };
  });
}

function getCurrentSubtitleSegment() {
  return subtitleSegments[currentSegmentIndex] || null;
}

function getTotalDurationMs() {
  const lastSegment = subtitleSegments[subtitleSegments.length - 1];

  if (lastSegment && Number.isFinite(lastSegment.endMs)) {
    return Math.max(SEGMENT_DURATION_MS, lastSegment.endMs);
  }

  return Math.max(SEGMENT_DURATION_MS, subtitleSegments.length * SEGMENT_DURATION_MS);
}

function clampTime(timeMs) {
  return Math.max(0, Math.min(timeMs, getTotalDurationMs()));
}

function getTimeForSegmentIndex(segmentIndex) {
  const segment = subtitleSegments[Math.max(0, segmentIndex)];

  if (segment && Number.isFinite(segment.startMs)) {
    return segment.startMs;
  }

  return Math.max(0, segmentIndex) * SEGMENT_DURATION_MS;
}

function getSegmentIndexForTime(timeMs) {
  if (subtitleSegments.length === 0) {
    return 0;
  }

  const clampedTime = clampTime(timeMs);
  const timedSegmentIndex = subtitleSegments.findIndex((segment) => (
    clampedTime >= getSegmentStartMs(segment)
    && clampedTime < getSegmentEndMs(segment)
  ));

  if (timedSegmentIndex >= 0) {
    return timedSegmentIndex;
  }

  if (clampedTime >= getTotalDurationMs()) {
    return subtitleSegments.length - 1;
  }

  return Math.min(
    subtitleSegments.length - 1,
    Math.max(0, Math.floor(clampedTime / SEGMENT_DURATION_MS)),
  );
}

function getObstacleTimeMs(obstacle) {
  const explicitTimeMs = getObstacleStartMs(obstacle);

  if (Number.isFinite(explicitTimeMs)) {
    return explicitTimeMs;
  }

  const segmentIndex = subtitleSegments.findIndex((segment) => isObstacleInSegment(obstacle, segment));

  if (segmentIndex < 0) {
    return 0;
  }

  const segment = subtitleSegments[segmentIndex];
  const segmentLength = Math.max(1, segment.end - segment.start);
  const relativeOffset = Number.isFinite(obstacle.index)
    ? Math.max(0, Math.min(1, (obstacle.index - segment.start) / segmentLength))
    : 0;

  return getSegmentStartMs(segment) + (relativeOffset * Math.max(1, getSegmentEndMs(segment) - getSegmentStartMs(segment)));
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

function getAxisWidth() {
  if (!obstacleHeatAxis || typeof obstacleHeatAxis.getBoundingClientRect !== 'function') {
    return 720;
  }

  return Math.max(1, obstacleHeatAxis.getBoundingClientRect().width || 720);
}

function getObstacleLabel(obstacle) {
  return obstacle.kind === 'word' ? obstacle.surfaceText || obstacle.word : obstacle.text || obstacle.phrase || obstacle.surfaceText || obstacle.source;
}

function getPendingObstacles() {
  return obstacles.filter((obstacle) => !hiddenObstacleIds.has(obstacle.id));
}

function getObstaclesInSegment(segment, sourceObstacles = obstacles) {
  if (!segment) {
    return [];
  }

  return sourceObstacles.filter((obstacle) => isObstacleInSegment(obstacle, segment));
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

  return subtitleSegments.findIndex((segment) => isObstacleInSegment(obstacle, segment));
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
  if (!segment || !obstacle) {
    return false;
  }

  if (obstacle.subtitleId && String(obstacle.subtitleId) === String(segment.id)) {
    return true;
  }

  const obstacleTimeMs = getObstacleStartMs(obstacle);

  if (Number.isFinite(obstacleTimeMs)) {
    return obstacleTimeMs >= getSegmentStartMs(segment) && obstacleTimeMs < getSegmentEndMs(segment);
  }

  return Number.isFinite(obstacle.index) && obstacle.index >= segment.start && obstacle.index < segment.end;
}

function getActiveSubtitleObstacles(segment = getCurrentSubtitleSegment()) {
  return getSegmentObstacles(segment);
}

function getMarkerRangeForObstacle(segment, obstacle) {
  if (!Number.isFinite(obstacle.index) || obstacle.index < segment.start || obstacle.index >= segment.end) {
    const labelIndex = findNormalizedPhraseIndex(segment.text, getObstacleLabel(obstacle));

    if (labelIndex < 0) {
      return { obstacle, start: 0, end: 0 };
    }

    return {
      obstacle,
      start: labelIndex,
      end: Math.min(segment.text.length, labelIndex + getObstacleLabel(obstacle).length),
    };
  }

  return {
    obstacle,
    start: Math.max(0, obstacle.index - segment.start),
    end: Math.min(
      segment.text.length,
      (obstacle.end || obstacle.index + getObstacleLabel(obstacle).length) - segment.start,
    ),
  };
}

function getMarkerRangesForSegment(segment) {
  return getActiveSubtitleObstacles(segment)
    .map((obstacle) => getMarkerRangeForObstacle(segment, obstacle))
    .filter((range) => range.end > range.start)
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
  chineseLine.textContent = segment.zh || '（中文字幕待补充）';
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
    timelinePlayButton.textContent = isVideoPlaying ? '||' : '▶';
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
  const timeMs = getObstacleTimeMs(obstacle) || getTimeForSegmentIndex(segmentIndex);

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

    if (lastCluster && pixel - lastCluster.lastPixel <= HEAT_AXIS_CLUSTER_THRESHOLD_PX) {
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

  button.textContent = obstacleCount;
  button.style.left = `${cluster.centerPercent}%`;
  button.setAttribute('aria-label', `打开当前区域障碍（${obstacleCount}）`);

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
  const activeCluster = clusters.find((cluster) => getHeatClusterKey(cluster) === activeHeatClusterKey);

  obstacleHeatAxis.innerHTML = '';

  if (activeCluster) {
    obstacleHeatAxis.append(createHeatClusterHighlight(activeCluster));
  }

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
  button.textContent = `${obstacle.kind === 'word' ? '○' : '●'} ${getObstacleLabel(obstacle)}`;
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
    episodeUndoButton.textContent = '↶ 撤回上一步';
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

function replaceObstacleStream(nextObstacles, text = subtitleTextInput.value) {
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
  const word = obstacle.word || obstacle.baseForm || obstacle.surfaceText || '';
  const phonetic = obstacle.phonetic || '暂无音标';
  const translation = obstacle.translation || obstacle.sentenceMeaning || getCompactTranslation(obstacle.explanation) || '暂无释义';
  summary.textContent = `${word}\n${phonetic}\n${translation}`;

  return summary;
}

function createUnderstandingSummary(obstacle) {
  const summary = document.createElement('p');
  summary.className = 'understanding-summary';
  summary.textContent = obstacle.text || obstacle.prototype || obstacle.phrase || obstacle.baseForm || '';

  return summary;
}

function createCard(obstacle) {
  const card = document.createElement('article');
  card.className = 'obstacle-card';

  const inner = document.createElement('div');
  inner.className = 'card-inner';

  const label = document.createElement('span');
  label.className = 'type-label';
  label.textContent = obstacle.type === 'vocab' ? '[vocab]' : '[comprehension]';

  const content = document.createElement('div');
  content.className = 'card-content';

  if (obstacle.kind === 'word') {
    content.append(createWordSummary(obstacle));
  }

  if (obstacle.kind === 'understanding') {
    content.append(
      createUnderstandingSummary(obstacle),
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
  inner.append(label, content, actions);
  card.append(inner);
  return card;
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

  visibleObstacles.forEach((obstacle) => {
    cardStream.append(createCard(obstacle));
  });

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

async function initializeApp() {
  if (subtitleTextInput) {
    subtitleTextInput.value = '';
  }

  if (currentSubtitleLine) {
    currentSubtitleLine.textContent = '字幕加载中…';
  }

  subtitleSegments = await loadSubtitleSegments();
  const episodeText = serializeSubtitleSegments(subtitleSegments);

  if (subtitleTextInput) {
    subtitleTextInput.value = episodeText;
  }

  currentSegmentIndex = 0;
  currentTimeMs = 0;
  obstacles = await loadObstacleDataForCurrentSubtitles();
  currentEpisodeProgressKey = getEpisodeProgressKey(episodeText);
  applyStoredEpisodeProgress(currentEpisodeProgressKey);
  saveEpisodeProgress();
  renderVideoState();
  renderCards();
  syncPlaybackClock();
}

function handleAnalyzeClick() {
  analyzeAndRender(subtitleTextInput.value, { level: DEFAULT_VOCABULARY_LEVEL });
}

analyzeButton.addEventListener('click', handleAnalyzeClick);
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
initializeApp();

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
