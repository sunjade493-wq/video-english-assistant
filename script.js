const DEFAULT_SUBTITLE_TEXT = `Demo subtitle unavailable.`;
const REAL_SUBTITLE_DATA_URL = 'output_text/v28d_bilingual_subtitles.json';
const REAL_OBSTACLE_DATA_URL = 'output_text/v29a_obstacles.json';
const RUNTIME_PILOT_OBSTACLE_DATA_URL = 'output_text/runtime/p0_5b_30_obstacle_runtime.json';
const RUNTIME_SHADOW_CANDIDATE_ARTIFACT_URL = 'output_text/p1_a/runtime_candidate_artifact.json';
const RUNTIME_SHADOW_REVIEW_ARTIFACT_URL = 'output_text/p1_a/runtime_consumption_review_artifact.json';
const REAL_VISUAL_MAPPING_DATA_URL = 'output_text/visual_mapping/TBBT_S12E01_word_boxes.json';
const REAL_VIDEO_URL = 'assets/videos/TBBT_S12E01.mp4';
const DEFAULT_VOCABULARY_LEVEL = 'junior';
const SHOW_GENERATED_SUBTITLE_OVERLAY = false;
const SHOW_SUBTITLE_MARKER_OVERLAY_TEST_MARKER = new URLSearchParams(window.location.search).get('debugSubtitleMarker') === '1';
const SUBTITLE_MARKER_TIMING_TOLERANCE_MS = 160;
const BURNED_ENGLISH_LINE_WIDTH_RATIO = 0.82;
const BURNED_ENGLISH_MARKER_BOTTOM_RATIO = 0.135;
const VISUAL_MARKER_GAP_PX = 8;
const VOCABULARY_MARKER_MAX_WIDTH_PX = 42;
const DEBUG_FROZEN_RANGE_MARKER_FALLBACK = new URLSearchParams(window.location.search).get('debugFrozenMarkerFallback') === '1';
const EPISODE_PROGRESS_STORAGE_PREFIX = 'videoEnglishAssistant.episodeProgress.';

function isRuntimePilotOptInEnabled() {
  return new URLSearchParams(window.location.search).get('runtimePilot') === '1';
}

function isRuntimeShadowOptInEnabled() {
  return new URLSearchParams(window.location.search).get('runtimeShadow') === '1';
}

function isRuntimeCandidateOptInEnabled() {
  return new URLSearchParams(window.location.search).get('runtimeCandidate') === '1';
}

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
  tem4: {
    label: 'TEM-4',
    extends: 'cet6',
    words: [],
  },
  tem8: {
    label: 'TEM-8',
    extends: 'tem4',
    words: [],
  },
  gre: {
    label: 'GRE',
    extends: 'tem8',
    words: [],
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

function dedupeObstaclesById(obstaclesToDedupe) {
  return obstaclesToDedupe;
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
let isVideoPlaying = false;
let playbackTimer = null;
let obstacles = [];
let runtimeObstacles = [];
const visualMappingByObstacleId = new Map();
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
let currentVocabularyLevel = DEFAULT_VOCABULARY_LEVEL;
let openFooterMenuName = null;

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
const subtitleOverlay = currentSubtitleLine?.closest('.subtitle-overlay') || null;
const subtitleMarkerOverlay = document.querySelector('#subtitleMarkerOverlay');
const playIcon = document.querySelector('#playIcon');
const videoStatusText = document.querySelector('#videoStatusText');
const videoFrame = document.querySelector('.video-frame');
const realVideo = document.querySelector('#realVideo');
const videoPlaceholder = document.querySelector('#videoPlaceholder');
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
const levelMenuButton = document.querySelector('#levelMenuButton');
const levelMenu = document.querySelector('#levelMenu');
const episodeMenuButton = document.querySelector('#episodeMenuButton');
const episodeMenu = document.querySelector('#episodeMenu');
const speedMenuButton = document.querySelector('#speedMenuButton');
const speedMenu = document.querySelector('#speedMenu');
const levelMenuItems = document.querySelectorAll('[data-vocabulary-level]');
const playbackSpeedButtons = document.querySelectorAll('.playback-speed-button');


const footerMenus = [
  { name: 'level', button: levelMenuButton, menu: levelMenu },
  { name: 'episodes', button: episodeMenuButton, menu: episodeMenu },
  { name: 'speed', button: speedMenuButton, menu: speedMenu },
];

function closeFooterMenus() {
  openFooterMenuName = null;
  footerMenus.forEach(({ button, menu }) => {
    button?.setAttribute('aria-expanded', 'false');
    menu?.classList.remove('is-open');
  });
}

function openFooterMenu(menuName) {
  openFooterMenuName = menuName;
  footerMenus.forEach(({ name, button, menu }) => {
    const isOpen = name === menuName;

    button?.setAttribute('aria-expanded', String(isOpen));
    menu?.classList.toggle('is-open', isOpen);
  });
}

function toggleFooterMenu(menuName) {
  if (openFooterMenuName === menuName) {
    closeFooterMenus();
    return;
  }

  openFooterMenu(menuName);
}

function isFooterMenuElement(target) {
  return footerMenus.some(({ button, menu }) => button?.contains(target) || menu?.contains(target));
}

function renderVocabularyLevelControls() {
  levelMenuItems.forEach((item) => {
    const isSelected = item.dataset.vocabularyLevel === currentVocabularyLevel;

    item.classList.toggle('is-selected', isSelected);
    item.setAttribute('aria-checked', String(isSelected));
  });
}

async function reloadCurrentVocabularyLevel() {
  if (activeDataSource === 'real') {
    await loadRealEpisodeData();
    return;
  }

  const subtitleText = subtitleSegments.map((segment) => segment.text).join('\n\n') || DEFAULT_SUBTITLE_TEXT;
  replaceObstacleStream(analyzeSubtitleText(subtitleText, { level: currentVocabularyLevel }), subtitleText);
  renderCards();
}

async function handleVocabularyLevelSelection(event) {
  const nextLevel = event.currentTarget.dataset.vocabularyLevel;

  if (!nextLevel) {
    return;
  }

  currentVocabularyLevel = nextLevel;
  renderVocabularyLevelControls();
  closeFooterMenus();
  await reloadCurrentVocabularyLevel();
}


function renderPlaybackSpeedControls() {
  playbackSpeedButtons.forEach((button) => {
    const buttonRate = Number(button.dataset.playbackRate);
    const isSelected = buttonRate === playbackRate;

    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
    button.setAttribute('aria-checked', String(isSelected));
  });
}

function handlePlaybackSpeedSelection(event) {
  const nextPlaybackRate = Number(event.currentTarget.dataset.playbackRate);

  if (!Number.isFinite(nextPlaybackRate)) {
    return;
  }

  playbackRate = nextPlaybackRate;
  if (realVideo) {
    realVideo.playbackRate = playbackRate;
  }
  renderPlaybackSpeedControls();
  closeFooterMenus();
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
  return rows
    .filter((row) => validateRuntimeObstacle(row))
    .map((row, rowIndex) => normalizeObstacle(row, rowIndex));
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


function validateRuntimeShadowArtifacts(candidateArtifact, reviewArtifact) {
  const reviewPayload = reviewArtifact?.payload;
  const candidatePayload = candidateArtifact?.payload;

  if (reviewPayload?.runtimeConsumptionReviewDecision !== 'approved_for_p2_runtime_integration') {
    throw new Error('runtime consumption review decision is not approved for P2 runtime integration');
  }

  if (reviewPayload?.runtimeMayConsumeDecision !== true) {
    throw new Error('runtime consumption review does not explicitly approve runtimeMayConsumeDecision');
  }

  if (candidateArtifact?.runtimeConsumable !== false) {
    throw new Error('runtime candidate artifact is not marked runtimeConsumable=false');
  }

  if (candidatePayload?.runtimeMayConsume !== false) {
    throw new Error('runtime candidate payload is not marked runtimeMayConsume=false');
  }

  if (!Array.isArray(candidatePayload?.runtimeCandidates)) {
    throw new Error('runtime candidate artifact payload.runtimeCandidates is not an array');
  }

  return {
    approved: true,
    candidates: candidatePayload.runtimeCandidates.map((candidate) => ({ ...candidate })),
  };
}

async function runRuntimeShadowProbeIfEnabled() {
  if (!isRuntimeShadowOptInEnabled()) {
    return null;
  }

  try {
    const [candidateArtifact, reviewArtifact] = await Promise.all([
      fetchJson(RUNTIME_SHADOW_CANDIDATE_ARTIFACT_URL),
      fetchJson(RUNTIME_SHADOW_REVIEW_ARTIFACT_URL),
    ]);
    const shadowModel = validateRuntimeShadowArtifacts(candidateArtifact, reviewArtifact);
    const productionObstacleCount = Array.isArray(obstacles) ? obstacles.length : 0;

    console.info(
      `[P2-C Runtime Shadow] loaded=${shadowModel.candidates.length} production=${productionObstacleCount} approved=${shadowModel.approved} activeDataSource=${activeDataSource}`,
    );
    return shadowModel;
  } catch (error) {
    console.warn(`[P2-C Runtime Shadow] skipped: ${error?.message || error}`);
    return null;
  }
}

function failClosedRuntimeCandidateOptIn(reason) {
  console.warn(`P2-E runtime candidate opt-in unavailable; production flow retained: ${reason}`);
  return false;
}

function validateRuntimeCandidateOptInArtifacts(candidateArtifact, reviewArtifact) {
  const reviewPayload = reviewArtifact?.payload;
  const candidatePayload = candidateArtifact?.payload;

  if (reviewPayload?.runtimeConsumptionReviewDecision !== 'approved_for_p2_runtime_integration') {
    throw new Error('runtime consumption review decision is not approved for P2 runtime integration');
  }

  if (reviewPayload?.runtimeMayConsumeDecision !== true) {
    throw new Error('runtime consumption review does not explicitly approve runtimeMayConsumeDecision');
  }

  if (candidateArtifact?.runtimeConsumable !== true) {
    throw new Error('runtime candidate artifact is not marked runtimeConsumable=true');
  }

  if (candidatePayload?.runtimeMayConsume !== true) {
    throw new Error('runtime candidate payload is not marked runtimeMayConsume=true');
  }

  if (!Array.isArray(candidatePayload?.runtimeCandidates)) {
    throw new Error('runtime candidate artifact payload.runtimeCandidates is not an array');
  }

  return {
    approved: true,
    candidates: candidatePayload.runtimeCandidates.map((candidate) => ({ ...candidate })),
  };
}

async function activateRuntimeCandidateOptInIfEnabled() {
  if (!isRuntimeCandidateOptInEnabled()) {
    return false;
  }

  try {
    const [candidateArtifact, reviewArtifact] = await Promise.all([
      fetchJson(RUNTIME_SHADOW_CANDIDATE_ARTIFACT_URL),
      fetchJson(RUNTIME_SHADOW_REVIEW_ARTIFACT_URL),
    ]);
    const candidateModel = validateRuntimeCandidateOptInArtifacts(candidateArtifact, reviewArtifact);

    console.info(`P2-E runtime candidate opt-in active: ${candidateModel.candidates.length} candidates`);
    return true;
  } catch (error) {
    return failClosedRuntimeCandidateOptIn(error?.message || error);
  }
}

function getVisualMappingWordBoxes(payload) {
  const rootWordBoxes = Array.isArray(payload?.wordBoxes) ? payload.wordBoxes : [];
  const subtitleWordBoxes = Array.isArray(payload?.subtitles)
    ? payload.subtitles.flatMap((subtitle) => (Array.isArray(subtitle?.wordBoxes) ? subtitle.wordBoxes : []))
    : [];

  return [...rootWordBoxes, ...subtitleWordBoxes];
}

function hasUsableVisualBox(wordBox, coordinateSpace) {
  const box = wordBox?.box;

  return Boolean(
    wordBox?.obstacleId
    && box
    && Number.isFinite(Number(box.x))
    && Number.isFinite(Number(box.y))
    && Number.isFinite(Number(box.width))
    && Number.isFinite(Number(box.height))
    && Number.isFinite(Number(coordinateSpace?.width))
    && Number.isFinite(Number(coordinateSpace?.height))
    && Number(box.width) > 0
    && Number(box.height) > 0
    && Number(coordinateSpace.width) > 0
    && Number(coordinateSpace.height) > 0,
  );
}


function validateRuntimePilotObstacle(row, rowIndex) {
  const type = row?.type;

  if (!['vocabulary', 'comprehension'].includes(type)) {
    throw new Error(`obstacle ${rowIndex + 1} has unsupported type: ${type}`);
  }

  const sourceEn = row?.source_en;
  const markerStart = Number(row?.markerStart);
  const markerEnd = Number(row?.markerEnd);

  if (typeof sourceEn !== 'string') {
    throw new Error(`obstacle ${rowIndex + 1} has invalid source_en`);
  }

  if (!Number.isFinite(markerStart) || !Number.isFinite(markerEnd)) {
    throw new Error(`obstacle ${rowIndex + 1} has non-finite marker bounds`);
  }

  if (markerStart < 0 || markerStart >= markerEnd || markerEnd > sourceEn.length) {
    throw new Error(`obstacle ${rowIndex + 1} marker bounds are outside source_en`);
  }
}

function validateRuntimePilotObstaclePayload(payload) {
  const SUPPORTED_RUNTIME_PILOT_SCHEMAS = [
    'p0-4a-runtime-obstacles-pilot-v1',
    'p0-5b-30-obstacle-runtime.v1'
  ];
  if (!SUPPORTED_RUNTIME_PILOT_SCHEMAS.includes(payload?.schemaVersion)) {
    throw new Error('schemaVersion mismatch');
  }

  if (payload?.runtimeMayConsume !== true) {
    throw new Error('runtimeMayConsume is not true');
  }

  if (!Array.isArray(payload?.obstacles)) {
    throw new Error('obstacles is not an array');
  }

  payload.obstacles.forEach(validateRuntimePilotObstacle);
  return payload.obstacles;
}

async function loadRuntimePilotObstacles() {
  try {
    const payload = await fetchJson(RUNTIME_PILOT_OBSTACLE_DATA_URL);
    const loadedObstacles = validateRuntimePilotObstaclePayload(payload);
    console.log(`P0-4B-1 runtime pilot obstacles loaded: ${loadedObstacles.length}`);
    return loadedObstacles;
  } catch (error) {
    console.warn('P0-4B-1 runtime pilot obstacle load skipped:', error?.message || error);
    return [];
  }
}

function getRuntimePilotObstacleCandidates() {
  if (!Array.isArray(runtimeObstacles) || runtimeObstacles.length === 0) {
    return [];
  }

  try {
    runtimeObstacles.forEach(validateRuntimePilotObstacle);
    return runtimeObstacles;
  } catch (error) {
    console.warn('P0-4B-2A runtime pilot obstacle candidates unavailable:', error?.message || error);
    return [];
  }
}

function getNormalizedRuntimePilotObstacleCandidates() {
  try {
    return normalizeObstacles(getRuntimePilotObstacleCandidates());
  } catch (error) {
    console.warn('P0-4B-2B normalized runtime pilot obstacle candidates unavailable:', error?.message || error);
    return [];
  }
}

function getRuntimePilotReadOnlySelectionCandidates() {
  try {
    const normalizedRuntimePilotCandidates = getNormalizedRuntimePilotObstacleCandidates();

    if (!Array.isArray(normalizedRuntimePilotCandidates) || normalizedRuntimePilotCandidates.length === 0) {
      return [];
    }

    return normalizedRuntimePilotCandidates.map((candidate) => ({
      id: candidate?.id,
      type: candidate?.type,
      kind: candidate?.kind,
      index: candidate?.index,
      end: candidate?.end,
      markerStart: candidate?.markerStart,
      markerEnd: candidate?.markerEnd,
      source: candidate?.source,
      sourceZh: candidate?.sourceZh,
      timeMs: candidate?.timeMs,
      endTimeMs: candidate?.endTimeMs,
      word: candidate?.word,
      phrase: candidate?.phrase,
      prototype: candidate?.prototype,
    }));
  } catch (error) {
    console.warn('P0-4B-3A runtime pilot read-only selection candidates unavailable:', error?.message || error);
    return [];
  }
}

function initializeRuntimePilotObstacles() {
  return loadRuntimePilotObstacles().then((loadedObstacles) => {
    runtimeObstacles = loadedObstacles;
    console.info(`P0-4B-2A runtime pilot obstacle candidates available: ${getRuntimePilotObstacleCandidates().length}`);
  });
}

function logNormalizedRuntimePilotObstacleCandidatesAvailable() {
  console.info(`P0-4B-2B normalized runtime pilot obstacle candidates available: ${getNormalizedRuntimePilotObstacleCandidates().length}`);
}

function hasRuntimePilotFieldValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function hasAnyRuntimePilotFieldValue(row, fields) {
  return fields.some((field) => hasRuntimePilotFieldValue(row?.[field]));
}

function hasCompleteRuntimePilotRequiredFields(row) {
  const hasCommonRequiredFields = hasAnyRuntimePilotFieldValue(row, ['obstacleId', 'id'])
    && hasRuntimePilotFieldValue(row?.type)
    && hasRuntimePilotFieldValue(row?.subtitleIndex)
    && hasRuntimePilotFieldValue(row?.source_en)
    && hasRuntimePilotFieldValue(row?.markerStart)
    && hasRuntimePilotFieldValue(row?.markerEnd);

  if (!hasCommonRequiredFields) {
    return false;
  }

  if (row?.type === 'vocabulary') {
    return hasRuntimePilotFieldValue(row?.word)
      && hasRuntimePilotFieldValue(row?.phonetic)
      && hasRuntimePilotFieldValue(row?.partOfSpeech)
      && hasRuntimePilotFieldValue(row?.sentenceMeaning);
  }

  if (row?.type === 'comprehension') {
    return hasAnyRuntimePilotFieldValue(row, ['phrase', 'prototype', 'text'])
      && hasRuntimePilotFieldValue(row?.literal)
      && hasRuntimePilotFieldValue(row?.actual)
      && hasRuntimePilotFieldValue(row?.grammar);
  }

  return false;
}

function buildRuntimePilotShadowComparison() {
  try {
    const rawRuntimePilotCandidates = getRuntimePilotObstacleCandidates();
    const normalizedRuntimePilotCandidates = getNormalizedRuntimePilotObstacleCandidates();

    return {
      productionObstacleCount: Array.isArray(obstacles) ? obstacles.length : 0,
      runtimePilotRawCount: rawRuntimePilotCandidates.length,
      runtimePilotNormalizedCount: normalizedRuntimePilotCandidates.length,
      subtitleIndexPresentCount: rawRuntimePilotCandidates.filter((row) => hasRuntimePilotFieldValue(row?.subtitleIndex)).length,
      markerStartPresentCount: rawRuntimePilotCandidates.filter((row) => hasRuntimePilotFieldValue(row?.markerStart)).length,
      markerEndPresentCount: rawRuntimePilotCandidates.filter((row) => hasRuntimePilotFieldValue(row?.markerEnd)).length,
      requiredFieldsCompleteCount: rawRuntimePilotCandidates.filter(hasCompleteRuntimePilotRequiredFields).length,
    };
  } catch (error) {
    console.warn('P0-4B-2C shadow comparison unavailable:', error?.message || error);
    return {
      productionObstacleCount: 0,
      runtimePilotRawCount: 0,
      runtimePilotNormalizedCount: 0,
      subtitleIndexPresentCount: 0,
      markerStartPresentCount: 0,
      markerEndPresentCount: 0,
      requiredFieldsCompleteCount: 0,
    };
  }
}

function logRuntimePilotShadowComparison() {
  const comparison = buildRuntimePilotShadowComparison();
  const rawCount = comparison.runtimePilotRawCount;

  console.info([
    'P0-4B-2C shadow comparison:',
    `production obstacle count: ${comparison.productionObstacleCount}`,
    `runtime pilot raw count: ${comparison.runtimePilotRawCount}`,
    `runtime pilot normalized count: ${comparison.runtimePilotNormalizedCount}`,
    `runtime subtitleIndex present: ${comparison.subtitleIndexPresentCount}/${rawCount}`,
    `runtime markerStart present: ${comparison.markerStartPresentCount}/${rawCount}`,
    `runtime markerEnd present: ${comparison.markerEndPresentCount}/${rawCount}`,
    `runtime required fields complete: ${comparison.requiredFieldsCompleteCount}/${rawCount}`,
  ].join('\n'));
}

function logRuntimePilotReadOnlySelectionCandidatesAvailable() {
  console.info(`P0-4B-3A runtime pilot read-only selection candidates available: ${getRuntimePilotReadOnlySelectionCandidates().length}`);
}

function failClosedRuntimePilotOptIn(reason) {
  console.warn(`P0-4B-4A runtime pilot opt-in unavailable; production flow retained: ${reason}`);
  return false;
}

function hasUsableRuntimePilotCandidateId(candidate) {
  return typeof candidate?.id === 'string' && candidate.id.trim() !== '';
}

function activateRuntimePilotOptInIfEnabled() {
  if (!isRuntimePilotOptInEnabled()) {
    console.log('P0-4B-4A runtime pilot opt-in inactive; production flow active');
    return false;
  }

  let normalizedRuntimePilotCandidates;

  try {
    normalizedRuntimePilotCandidates = getNormalizedRuntimePilotObstacleCandidates();
  } catch (error) {
    return failClosedRuntimePilotOptIn(error?.message || error);
  }

  if (!Array.isArray(normalizedRuntimePilotCandidates) || normalizedRuntimePilotCandidates.length === 0) {
    return failClosedRuntimePilotOptIn('normalized runtime pilot candidates are unavailable or empty');
  }

  if (!normalizedRuntimePilotCandidates.every(hasUsableRuntimePilotCandidateId)) {
    return failClosedRuntimePilotOptIn('normalized runtime pilot candidates include unusable ids');
  }

  obstacles = normalizedRuntimePilotCandidates;
  activeDataSource = 'runtime-pilot';
  selectedObstacleId = null;
  streamMode = 'dynamic';
  currentEpisodeProgressKey = getEpisodeProgressKey(JSON.stringify({
    source: 'runtime-pilot',
    subtitles: subtitleSegments.map((segment) => segment.text),
    obstacles: normalizedRuntimePilotCandidates.map((candidate) => candidate.id),
  }));
  applyStoredEpisodeProgress(currentEpisodeProgressKey);
  saveEpisodeProgress();
  renderVideoState();
  renderCards();
  syncPlaybackClock();
  console.log(`P0-4B-4A runtime pilot opt-in active: ${normalizedRuntimePilotCandidates.length} obstacles`);
  return true;
}

function getCurrentProgressKeyScope() {
  if (activeDataSource === 'runtime-pilot') {
    return 'runtime-pilot';
  }

  if (activeDataSource === 'real') {
    return 'production';
  }

  return 'unknown';
}

function logRuntimePilotExitIsolationVerification() {
  const progressCounts = getEpisodeProgressCounts();
  const hiddenObstacleIdsCount = hiddenObstacleIds instanceof Set ? hiddenObstacleIds.size : 0;
  const dismissedObstacleHistoryCount = Array.isArray(dismissedObstacleHistory) ? dismissedObstacleHistory.length : 0;

  console.info([
    'P0-4B-4B exit/isolation verification:',
    `runtime pilot opt-in enabled: ${isRuntimePilotOptInEnabled()}`,
    `active data source: ${activeDataSource}`,
    `obstacle count: ${Array.isArray(obstacles) ? obstacles.length : 0}`,
    `pending obstacle count: ${getPendingObstacles().length}`,
    `progress total: ${progressCounts.total}`,
    `progress conquered: ${progressCounts.conquered}`,
    `progress remaining: ${progressCounts.remaining}`,
    `currentEpisodeProgressKey: ${currentEpisodeProgressKey || ''}`,
    `progress key scope: ${getCurrentProgressKeyScope()}`,
    `hidden obstacle ids count: ${hiddenObstacleIdsCount}`,
    `dismissed obstacle history count: ${dismissedObstacleHistoryCount}`,
  ].join('\n'));
}

function buildRuntimePilotSelectionShadowComparison() {
  const emptyComparison = {
    currentSegmentProductionCount: 0,
    currentSegmentRuntimePilotCount: 0,
    productionSelectedSegmentCount: 0,
    runtimePilotSelectedSegmentCount: 0,
    productionTotalSelectableCount: 0,
    runtimePilotTotalSelectableCount: 0,
    currentSegmentProductionIds: [],
    currentSegmentRuntimePilotIds: [],
  };

  try {
    if (!Array.isArray(subtitleSegments) || subtitleSegments.length === 0) {
      return emptyComparison;
    }

    const productionSelectableCandidates = Array.isArray(obstacles)
      ? getPendingObstacles()
      : [];
    const runtimePilotSelectableCandidates = getRuntimePilotReadOnlySelectionCandidates();
    const safeRuntimePilotSelectableCandidates = Array.isArray(runtimePilotSelectableCandidates)
      ? runtimePilotSelectableCandidates
      : [];
    const currentSegment = getCurrentSubtitleSegment();
    const currentSegmentProductionCandidates = sortObstaclesForLearningTips(
      getObstaclesInSegment(currentSegment, productionSelectableCandidates),
    );
    const currentSegmentRuntimePilotCandidates = sortObstaclesForLearningTips(
      getObstaclesInSegment(currentSegment, safeRuntimePilotSelectableCandidates),
    );

    return {
      currentSegmentProductionCount: currentSegmentProductionCandidates.length,
      currentSegmentRuntimePilotCount: currentSegmentRuntimePilotCandidates.length,
      productionSelectedSegmentCount: subtitleSegments.filter((segment) => (
        getObstaclesInSegment(segment, productionSelectableCandidates).length > 0
      )).length,
      runtimePilotSelectedSegmentCount: subtitleSegments.filter((segment) => (
        getObstaclesInSegment(segment, safeRuntimePilotSelectableCandidates).length > 0
      )).length,
      productionTotalSelectableCount: productionSelectableCandidates.length,
      runtimePilotTotalSelectableCount: safeRuntimePilotSelectableCandidates.length,
      currentSegmentProductionIds: currentSegmentProductionCandidates.map((obstacle) => obstacle.id),
      currentSegmentRuntimePilotIds: currentSegmentRuntimePilotCandidates.map((obstacle) => obstacle.id),
    };
  } catch (error) {
    console.warn('P0-4B-3B selection shadow comparison unavailable:', error?.message || error);
    return emptyComparison;
  }
}

function logRuntimePilotSelectionShadowComparison() {
  const comparison = buildRuntimePilotSelectionShadowComparison();

  console.info([
    'P0-4B-3B selection shadow comparison:',
    `current segment production selected: ${comparison.currentSegmentProductionCount}`,
    `current segment runtime pilot selected: ${comparison.currentSegmentRuntimePilotCount}`,
    `production selectable total: ${comparison.productionTotalSelectableCount}`,
    `runtime pilot selectable total: ${comparison.runtimePilotTotalSelectableCount}`,
    `production selected segment count: ${comparison.productionSelectedSegmentCount}`,
    `runtime pilot selected segment count: ${comparison.runtimePilotSelectedSegmentCount}`,
    `current segment production ids: ${comparison.currentSegmentProductionIds.join(', ')}`,
    `current segment runtime pilot ids: ${comparison.currentSegmentRuntimePilotIds.join(', ')}`,
  ].join('\n'));
}

async function loadVisualMapping() {
  visualMappingByObstacleId.clear();

  try {
    const payload = await fetchJson(REAL_VISUAL_MAPPING_DATA_URL);
    const coordinateSpace = payload?.coordinateSpace;
    const currentObstacleIds = new Set(obstacles.map((obstacle) => obstacle.id));

    getVisualMappingWordBoxes(payload).forEach((wordBox) => {
      if (!hasUsableVisualBox(wordBox, coordinateSpace)) {
        return;
      }

      if (!currentObstacleIds.has(wordBox.obstacleId) || visualMappingByObstacleId.has(wordBox.obstacleId)) {
        return;
      }

      visualMappingByObstacleId.set(wordBox.obstacleId, {
        ...wordBox,
        coordinateSpace,
        runtimePolicy: payload.runtimePolicy,
      });
    });
  } catch (error) {
    console.warn('[subtitle-marker] Visual mapping unavailable; production markers without coordinates will stay hidden.', error);
  }
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
  await loadVisualMapping();
  activeDataSource = 'real';
  currentEpisodeProgressKey = getEpisodeProgressKey(JSON.stringify({ source: 'real', subtitles: subtitleSegments.map((segment) => segment.text) }));
  applyStoredEpisodeProgress(currentEpisodeProgressKey);
  saveEpisodeProgress();
  currentSegmentIndex = 0;
  currentTimeMs = realVideo ? realVideo.currentTime * 1000 : 0;
  selectedObstacleId = null;
  streamMode = 'dynamic';
  renderVideoState();
  renderCards();
  syncPlaybackClock();
  return true;
}

function loadDemoEpisodeData() {
  subtitleSegments = parseSubtitleSegments(DEFAULT_SUBTITLE_TEXT);
  obstacles = analyzeSubtitleText(DEFAULT_SUBTITLE_TEXT, { level: currentVocabularyLevel });
  activeDataSource = 'demo';
  currentEpisodeProgressKey = getEpisodeProgressKey(DEFAULT_SUBTITLE_TEXT);
  applyStoredEpisodeProgress(currentEpisodeProgressKey);
  saveEpisodeProgress();
  currentSegmentIndex = 0;
  currentTimeMs = realVideo ? realVideo.currentTime * 1000 : 0;
  selectedObstacleId = null;
  streamMode = 'dynamic';
  renderVideoState();
  renderCards();
  syncPlaybackClock();
}

async function initApp() {
  const runtimePilotObstacleLoad = initializeRuntimePilotObstacles();

  try {
    await loadRealEpisodeData();
    await runtimePilotObstacleLoad;
    logNormalizedRuntimePilotObstacleCandidatesAvailable();
    logRuntimePilotShadowComparison();
    logRuntimePilotReadOnlySelectionCandidatesAvailable();
    logRuntimePilotSelectionShadowComparison();
    await runRuntimeShadowProbeIfEnabled();
    await activateRuntimeCandidateOptInIfEnabled();
    activateRuntimePilotOptInIfEnabled();
    logRuntimePilotExitIsolationVerification();
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

function getRealVideoDurationMs() {
  if (!realVideo || !Number.isFinite(realVideo.duration) || realVideo.duration <= 0) {
    return 0;
  }

  return realVideo.duration * 1000;
}

function syncTimeFromRealVideo() {
  if (!realVideo || !Number.isFinite(realVideo.currentTime)) {
    return false;
  }

  currentTimeMs = realVideo.currentTime * 1000;
  currentSegmentIndex = getSegmentIndexForTime(currentTimeMs);
  return true;
}

function getTotalDurationMs() {
  const realVideoDuration = getRealVideoDurationMs();

  if (realVideoDuration > 0) {
    return realVideoDuration;
  }

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

function hasSeekableRealVideoDuration() {
  return Boolean(realVideo && Number.isFinite(realVideo.duration) && realVideo.duration > 0);
}

function getRealVideoSeekDurationMs() {
  return hasSeekableRealVideoDuration() ? realVideo.duration * 1000 : 0;
}

function clampRealVideoSeekTimeMs(timeMs) {
  if (!Number.isFinite(timeMs)) {
    return null;
  }

  const durationMs = getRealVideoSeekDurationMs();

  if (durationMs <= 0) {
    return null;
  }

  return Math.max(0, Math.min(timeMs, durationMs));
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
  const safeTimeMs = Number.isFinite(timeMs) ? Math.max(0, timeMs) : 0;
  const totalSeconds = Math.floor(safeTimeMs / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${minutes}:${seconds}`;
}

function getTimelinePercent(timeMs) {
  const durationMs = getRealVideoSeekDurationMs();

  if (durationMs <= 0 || !Number.isFinite(timeMs)) {
    return 0;
  }

  return (Math.max(0, Math.min(timeMs, durationMs)) / durationMs) * 100;
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


function getActiveSubtitleSegmentForMarkers() {
  const currentSegment = getCurrentSubtitleSegment();

  if (currentSegment && Number.isFinite(currentSegment.startMs) && Number.isFinite(currentSegment.endMs)) {
    const startsWithinTolerance = currentTimeMs >= currentSegment.startMs - SUBTITLE_MARKER_TIMING_TOLERANCE_MS;
    const endsWithinTolerance = currentTimeMs < currentSegment.endMs + SUBTITLE_MARKER_TIMING_TOLERANCE_MS;

    if (startsWithinTolerance && endsWithinTolerance) {
      return currentSegment;
    }
  }

  return subtitleSegments.find((segment) => (
    Number.isFinite(segment.startMs)
    && Number.isFinite(segment.endMs)
    && currentTimeMs >= segment.startMs - SUBTITLE_MARKER_TIMING_TOLERANCE_MS
    && currentTimeMs < segment.endMs + SUBTITLE_MARKER_TIMING_TOLERANCE_MS
  )) || currentSegment;
}

function clearRealSubtitleMarkers() {
  if (!subtitleMarkerOverlay) {
    return;
  }

  subtitleMarkerOverlay.querySelectorAll('.subtitle-marker-overlay__marker').forEach((marker) => marker.remove());
}

function getObstacleMarkerVisualType(obstacle) {
  return obstacle?.kind === 'word' || obstacle?.type === 'vocab' ? 'vocabulary' : 'comprehension';
}

function getVisualMarkerTopPercent(box, coordinateSpace, visualType) {
  const gapPx = visualType === 'vocabulary'
    ? VISUAL_MARKER_GAP_PX
    : VISUAL_MARKER_GAP_PX + 14;

  return ((Number(box.y) + Number(box.height) + gapPx) / Number(coordinateSpace.height)) * 100;
}

function renderVisualMappingMarker(obstacle) {
  const visualMapping = visualMappingByObstacleId.get(obstacle.id);
  const box = visualMapping?.box;
  const coordinateSpace = visualMapping?.coordinateSpace;

  if (!hasUsableVisualBox(visualMapping, coordinateSpace)) {
    return null;
  }

  const visualType = getObstacleMarkerVisualType(obstacle);
  const marker = document.createElement('span');
  const boxLeftPercent = (Number(box.x) / Number(coordinateSpace.width)) * 100;
  const boxWidthPercent = (Number(box.width) / Number(coordinateSpace.width)) * 100;

  marker.className = `subtitle-marker-overlay__marker subtitle-marker-overlay__marker--visual subtitle-marker-overlay__marker--${visualType}`;
  marker.textContent = visualType === 'vocabulary' ? '···' : '';
  marker.style.left = `${boxLeftPercent}%`;
  marker.style.top = `${getVisualMarkerTopPercent(box, coordinateSpace, visualType)}%`;
  marker.style.width = visualType === 'vocabulary'
    ? `${Math.min(Number(box.width), VOCABULARY_MARKER_MAX_WIDTH_PX)}px`
    : `${boxWidthPercent}%`;
  marker.setAttribute('data-obstacle-id', obstacle.id);
  marker.setAttribute('data-marker-type', visualType);
  marker.setAttribute('data-visual-mapping', 'true');
  marker.setAttribute('aria-hidden', 'true');

  if (visualType === 'vocabulary') {
    marker.style.transform = 'translateX(-50%)';
    marker.style.left = `${boxLeftPercent + (boxWidthPercent / 2)}%`;
  }

  return marker;
}

function createDebugFrozenRangeMarker(range, segment, lineLeftPercent, lineWidthPercent) {
  if (!DEBUG_FROZEN_RANGE_MARKER_FALLBACK) {
    return null;
  }

  const subtitleLength = segment.text.length;
  const relativeStart = Math.max(0, Math.min(1, range.start / subtitleLength));
  const relativeEnd = Math.max(relativeStart, Math.min(1, range.end / subtitleLength));
  const marker = document.createElement('span');
  const leftPercent = lineLeftPercent + (relativeStart * lineWidthPercent);
  const widthPercent = Math.max(0.01, (relativeEnd - relativeStart) * lineWidthPercent);
  const visualType = getObstacleMarkerVisualType(range.obstacle);

  marker.className = `subtitle-marker-overlay__marker subtitle-marker-overlay__marker--debug-fallback subtitle-marker-overlay__marker--${visualType}`;
  marker.textContent = visualType === 'vocabulary' ? '···' : '';
  marker.style.left = `${leftPercent}%`;
  marker.style.width = `${Math.min(widthPercent, lineLeftPercent + lineWidthPercent - leftPercent)}%`;
  marker.setAttribute('data-obstacle-id', range.obstacle.id);
  marker.setAttribute('data-marker-type', visualType);
  marker.setAttribute('data-visual-mapping', 'false');
  marker.setAttribute('data-debug-fallback', 'true');
  marker.setAttribute('aria-hidden', 'true');

  return marker;
}

function createRealSubtitleMarker(range, segment, lineLeftPercent, lineWidthPercent) {
  return renderVisualMappingMarker(range.obstacle)
    || createDebugFrozenRangeMarker(range, segment, lineLeftPercent, lineWidthPercent);
}

function renderRealSubtitleMarkers() {
  if (!subtitleMarkerOverlay) {
    return;
  }

  clearRealSubtitleMarkers();

  const segment = getActiveSubtitleSegmentForMarkers();
  const ranges = segment ? getMarkerRangesForSegment(segment) : [];

  if (!segment || !segment.text || ranges.length === 0) {
    return;
  }

  const lineWidthPercent = BURNED_ENGLISH_LINE_WIDTH_RATIO * 100;
  const lineLeftPercent = (100 - lineWidthPercent) / 2;

  ranges.forEach((range) => {
    const marker = createRealSubtitleMarker(range, segment, lineLeftPercent, lineWidthPercent);

    if (marker) {
      subtitleMarkerOverlay.append(marker);
    }
  });
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

  if (!SHOW_GENERATED_SUBTITLE_OVERLAY) {
    if (subtitleOverlay) {
      subtitleOverlay.hidden = true;
    }
    return;
  }

  if (subtitleOverlay) {
    subtitleOverlay.hidden = false;
  }

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

function getContainedVideoRect() {
  if (!videoFrame || !hasLoadedRealVideoFrame()) {
    return null;
  }

  const frameRect = videoFrame.getBoundingClientRect();
  const frameWidth = frameRect.width;
  const frameHeight = frameRect.height;
  const frameRatio = frameWidth / frameHeight;
  const videoRatio = realVideo.videoWidth / realVideo.videoHeight;

  if (!Number.isFinite(frameRatio) || !Number.isFinite(videoRatio) || frameWidth <= 0 || frameHeight <= 0) {
    return null;
  }

  if (frameRatio > videoRatio) {
    const width = frameHeight * videoRatio;
    return {
      width,
      height: frameHeight,
      left: (frameWidth - width) / 2,
      top: 0,
    };
  }

  const height = frameWidth / videoRatio;
  return {
    width: frameWidth,
    height,
    left: 0,
    top: (frameHeight - height) / 2,
  };
}

function syncSubtitleMarkerOverlayBounds() {
  if (!subtitleMarkerOverlay) {
    return;
  }

  const videoRect = getContainedVideoRect();
  subtitleMarkerOverlay.classList.toggle('has-test-marker', SHOW_SUBTITLE_MARKER_OVERLAY_TEST_MARKER);

  if (!videoRect) {
    subtitleMarkerOverlay.hidden = true;
    return;
  }

  subtitleMarkerOverlay.hidden = false;
  subtitleMarkerOverlay.style.setProperty('--burned-english-marker-bottom', `${BURNED_ENGLISH_MARKER_BOTTOM_RATIO * 100}%`);
  renderRealSubtitleMarkers();
  subtitleMarkerOverlay.style.left = `${videoRect.left}px`;
  subtitleMarkerOverlay.style.top = `${videoRect.top}px`;
  subtitleMarkerOverlay.style.width = `${videoRect.width}px`;
  subtitleMarkerOverlay.style.height = `${videoRect.height}px`;
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
  renderRealSubtitleMarkers();
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

  const previousSegmentIndex = currentSegmentIndex;
  syncTimeFromRealVideo();
  renderVideoState();

  if (currentSegmentIndex !== previousSegmentIndex) {
    renderCards();
  }
}

function startPlaybackTimer() {
  stopPlaybackTimer();
  syncTimeFromRealVideo();
  playbackStartedAt = Date.now();
  playbackStartedTimeMs = currentTimeMs;
  playbackTimer = window.setInterval(updatePlaybackProgress, 250);
  timelineRenderTimer = window.setInterval(() => {
    syncTimeFromRealVideo();
    renderTimelines();
  }, 100);
}

function syncPlaybackClock() {
  if (isVideoPlaying) {
    if (!playbackTimer) {
      startPlaybackTimer();
    } else {
      syncTimeFromRealVideo();
      playbackStartedAt = Date.now();
      playbackStartedTimeMs = currentTimeMs;
    }
    return;
  }

  stopPlaybackTimer();
}


function seekToTime(timeMs) {
  const nextTimeMs = clampRealVideoSeekTimeMs(timeMs);

  if (nextTimeMs === null) {
    return;
  }

  const wasPlaying = isVideoPlaying;
  const nextSegmentIndex = getSegmentIndexForTime(nextTimeMs);
  const didSubtitleChange = nextSegmentIndex !== currentSegmentIndex;

  currentTimeMs = nextTimeMs;
  realVideo.currentTime = currentTimeMs / 1000;
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

let isTimelineDragging = false;

function getTimelinePercentFromClientX(clientX) {
  if (!videoTimeline) {
    return null;
  }

  const rect = videoTimeline.getBoundingClientRect();

  if (rect.width <= 0) {
    return null;
  }

  return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
}

function seekTimelineToPercent(percent) {
  const seekDurationMs = getRealVideoSeekDurationMs();

  if (seekDurationMs <= 0 || !Number.isFinite(percent)) {
    return;
  }

  if (videoTimeline) {
    videoTimeline.value = String(Math.max(0, Math.min(100, percent)));
  }

  seekToTime((Math.max(0, Math.min(100, percent)) / 100) * seekDurationMs);
}

function stopTimelineEvent(event) {
  event.stopPropagation();
}

function handleTimelinePointerEvent(event) {
  stopTimelineEvent(event);

  if (event.type === 'pointermove' && !isTimelineDragging) {
    return;
  }

  if (event.cancelable) {
    event.preventDefault();
  }

  const percent = getTimelinePercentFromClientX(event.clientX);

  if (percent === null) {
    return;
  }

  seekTimelineToPercent(percent);
}

function handleTimelinePointerDown(event) {
  isTimelineDragging = true;
  handleTimelinePointerEvent(event);

  if (videoTimeline && typeof videoTimeline.setPointerCapture === 'function') {
    videoTimeline.setPointerCapture(event.pointerId);
  }
}

function handleTimelinePointerUp(event) {
  handleTimelinePointerEvent(event);
  isTimelineDragging = false;

  if (
    videoTimeline
    && typeof videoTimeline.releasePointerCapture === 'function'
    && (!videoTimeline.hasPointerCapture || videoTimeline.hasPointerCapture(event.pointerId))
  ) {
    videoTimeline.releasePointerCapture(event.pointerId);
  }
}

function handleTimelineClick(event) {
  handleTimelinePointerEvent(event);
}

function handleTimelineInput(event) {
  stopTimelineEvent(event);
  seekTimelineToPercent(Number(event.target.value) || 0);
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
    timelineTimeText.textContent = `${formatTimelineTime(currentTimeMs)} / ${formatTimelineTime(getRealVideoSeekDurationMs())}`;
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
  isVideoPlaying = Boolean(nextIsPlaying);

  if (!realVideo) {
    syncPlaybackClock();
    renderVideoState();
    renderCards();
    return;
  }

  realVideo.playbackRate = playbackRate;

  if (isVideoPlaying) {
    hideLearningPauseHint();
    const playPromise = realVideo.play();

    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        isVideoPlaying = false;
        syncPlaybackClock();
        renderVideoState();
        renderCards();
      });
    }
  } else {
    realVideo.pause();
    syncTimeFromRealVideo();
  }

  syncPlaybackClock();
  renderVideoState();
  renderCards();
}


function hasLoadedRealVideoFrame() {
  return Boolean(
    realVideo
      && realVideo.readyState >= HTMLMediaElement.HAVE_METADATA
      && realVideo.videoWidth > 0
      && realVideo.videoHeight > 0,
  );
}

function renderRealVideoAvailability() {
  const hasRealVideoFrame = hasLoadedRealVideoFrame();

  videoFrame?.classList.toggle('has-real-video', hasRealVideoFrame);
  videoPlaceholder?.classList.toggle('is-hidden', hasRealVideoFrame);
  syncSubtitleMarkerOverlayBounds();
}

function handleRealVideoMetadataLoaded() {
  syncTimeFromRealVideo();
  renderRealVideoAvailability();
  renderVideoState();
}

function handleRealVideoTimeUpdate() {
  const previousSegmentIndex = currentSegmentIndex;

  syncTimeFromRealVideo();
  renderVideoState();

  if (currentSegmentIndex !== previousSegmentIndex) {
    renderCards();
  }
}

function handleRealVideoPlay() {
  isVideoPlaying = true;
  syncPlaybackClock();
  renderVideoState();
}

function handleRealVideoPause() {
  isVideoPlaying = false;
  syncTimeFromRealVideo();
  syncPlaybackClock();
  renderVideoState();
}

function handleRealVideoEnded() {
  isVideoPlaying = false;
  syncTimeFromRealVideo();
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

if (realVideo) {
  realVideo.src = REAL_VIDEO_URL;
  realVideo.playbackRate = playbackRate;
  realVideo.addEventListener('loadedmetadata', handleRealVideoMetadataLoaded);
  realVideo.addEventListener('loadeddata', renderRealVideoAvailability);
  realVideo.addEventListener('timeupdate', handleRealVideoTimeUpdate);
  realVideo.addEventListener('durationchange', handleRealVideoMetadataLoaded);
  realVideo.addEventListener('play', handleRealVideoPlay);
  realVideo.addEventListener('pause', handleRealVideoPause);
  realVideo.addEventListener('ended', handleRealVideoEnded);
  renderRealVideoAvailability();
}

if (videoFrame && typeof ResizeObserver === 'function') {
  const subtitleMarkerOverlayResizeObserver = new ResizeObserver(syncSubtitleMarkerOverlayBounds);
  subtitleMarkerOverlayResizeObserver.observe(videoFrame);
}

window.addEventListener('resize', syncSubtitleMarkerOverlayBounds);
document.addEventListener('fullscreenchange', syncSubtitleMarkerOverlayBounds);

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
  videoTimeline.disabled = false;
  videoTimeline.addEventListener('pointerdown', handleTimelinePointerDown);
  videoTimeline.addEventListener('pointermove', handleTimelinePointerEvent);
  videoTimeline.addEventListener('pointerup', handleTimelinePointerUp);
  videoTimeline.addEventListener('click', handleTimelineClick);
  videoTimeline.addEventListener('input', handleTimelineInput);
  videoTimeline.addEventListener('change', handleTimelineInput);
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

footerMenus.forEach(({ name, button, menu }) => {
  button?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleFooterMenu(name);
  });

  menu?.addEventListener('click', stopMarkerEvent);
  menu?.addEventListener('pointerup', stopMarkerEvent);
});
levelMenuItems.forEach((item) => {
  item.addEventListener('click', handleVocabularyLevelSelection);
});
document.addEventListener('click', (event) => {
  if (!isFooterMenuElement(event.target)) {
    closeFooterMenus();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeFooterMenus();
  }
});
playbackSpeedButtons.forEach((button) => {
  button.addEventListener('click', handlePlaybackSpeedSelection);
});
renderVocabularyLevelControls();
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
