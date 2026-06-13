const DEFAULT_SUBTITLE_TEXT = `If you enjoyed this lecture,
I'm sure you're too busy to lay it on us.

Can you give me a hand?

I was pulled off the project.

Let's call it a day.`;
const DEFAULT_VOCABULARY_LEVEL = 'junior';
const EPISODE_PROGRESS_STORAGE_PREFIX = 'videoEnglishAssistant.episodeProgress.';

const subtitleTranslations = new Map([
  [
    "If you enjoyed this lecture, I'm sure you're too busy to lay it on us.",
    '如果你喜欢这堂讲座，我相信你也很忙，但请直接告诉我们。',
  ],
  ['Can you give me a hand?', '你能帮我一下吗？'],
  ['I was pulled off the project.', '我被调离了这个项目。'],
  ["Let's call it a day.", '今天就到这里吧。'],
]);

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

function analyzeSubtitleText(text, options = {}) {
  const subtitleText = String(text || '').trim();
  const engine = getAnalyzeEngine();

  if (!subtitleText || !engine) {
    return [];
  }

  return engine.analyzeSubtitleItems(createSubtitleItemsFromText(subtitleText), options);
}

let subtitleSegments = parseSubtitleSegments(DEFAULT_SUBTITLE_TEXT);
let currentSegmentIndex = 0;
let isVideoPlaying = true;
let playbackTimer = null;
let obstacles = analyzeSubtitleText(DEFAULT_SUBTITLE_TEXT, { level: DEFAULT_VOCABULARY_LEVEL });
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
  return Math.max(SEGMENT_DURATION_MS, subtitleSegments.length * SEGMENT_DURATION_MS);
}

function clampTime(timeMs) {
  return Math.max(0, Math.min(timeMs, getTotalDurationMs()));
}

function getTimeForSegmentIndex(segmentIndex) {
  return Math.max(0, segmentIndex) * SEGMENT_DURATION_MS;
}

function getSegmentIndexForTime(timeMs) {
  if (subtitleSegments.length === 0) {
    return 0;
  }

  return Math.min(
    subtitleSegments.length - 1,
    Math.max(0, Math.floor(clampTime(timeMs) / SEGMENT_DURATION_MS)),
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
  if (!currentSubtitleLine) {
    return;
  }

  // Route A: the source video already contains burned-in bilingual subtitles.
  // Keep this DOM node available for accessibility/debugging, but do not overlay
  // duplicate subtitles or obstacle marks on top of the video area.
  currentSubtitleLine.innerHTML = '';
}

function getLearningStateLabel() {
  if (isVideoPlaying) {
    return 'Playing';
  }

  return selectedObstacleId ? 'Learning Pause' : 'Paused by you';
}

function renderVideoState() {
  if (playIcon) {
    playIcon.textContent = isVideoPlaying ? '⏸' : '▶';
  }

  if (timelinePlayButton) {
    timelinePlayButton.textContent = isVideoPlaying ? '||' : '▶';
    timelinePlayButton.setAttribute('aria-label', isVideoPlaying ? '暂停视频' : '播放视频');
  }

  if (videoStatusText) {
    videoStatusText.textContent = `V29C UI Cleanup · ${getLearningStateLabel()}`;
  }
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

function getNavigationItemObstacleTypes(item) {
  const sourceObstacles = Array.isArray(item.obstacles) ? item.obstacles : [item];
  return new Set(sourceObstacles.map((obstacle) => obstacle.type || (obstacle.kind === 'word' ? 'vocab' : 'comprehension')));
}

function getHeatClusterTypeClass(cluster) {
  const types = cluster.items.reduce((result, item) => {
    getNavigationItemObstacleTypes(item).forEach((type) => result.add(type));
    return result;
  }, new Set());

  if (types.has('comprehension') && !types.has('vocab')) {
    return 'heat-cluster-button--comprehension';
  }

  if (types.has('vocab') && !types.has('comprehension')) {
    return 'heat-cluster-button--vocab';
  }

  return 'heat-cluster-button--mixed';
}

function createHeatClusterButton(cluster) {
  const button = document.createElement('button');
  const clusterKey = getHeatClusterKey(cluster);

  button.className = `heat-cluster-button ${getHeatClusterTypeClass(cluster)}`;
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
    episodeUndoButton.textContent = '↶ 返回上一个障碍';
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

function getObstaclePartOfSpeech(obstacle) {
  return obstacle.part_of_speech || obstacle.partOfSpeech || '';
}

function getObstacleTranslation(obstacle) {
  return obstacle.translation || obstacle.sentenceMeaning || obstacle.sentence_meaning || '';
}

function createWordSummary(obstacle) {
  const summary = document.createElement('p');
  summary.className = 'word-summary frozen-card-text';
  const word = obstacle.word || obstacle.baseForm || obstacle.surfaceText || '未知单词';
  const phonetic = obstacle.phonetic || '暂无音标';
  const partOfSpeech = getObstaclePartOfSpeech(obstacle);
  const translation = getObstacleTranslation(obstacle) || '暂无';
  const wordLine = [word, phonetic, partOfSpeech].filter(Boolean).join(' ');

  summary.textContent = `${wordLine}\n\n句中含义：${translation}`;
  return summary;
}

function createUnderstandingSummary(obstacle) {
  const summary = document.createElement('p');
  summary.className = 'understanding-summary frozen-card-text';
  summary.textContent = obstacle.phrase || obstacle.baseForm || obstacle.source || obstacle.surfaceText || '暂无';

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
    const summary = createUnderstandingSummary(obstacle);
    summary.textContent = `${summary.textContent}\n\n字面意思：\n${obstacle.literal || '暂无'}\n\n实际意思：\n${obstacle.actual || '暂无'}\n\n语法解释：\n${obstacle.grammar || '暂无'}`;
    content.append(summary);
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
  if (!cardStream) {
    return;
  }

  const emptyState = document.createElement('div');
  emptyState.className = 'empty-state';
  emptyState.textContent = '当前视频内容没有需要处理的障碍。';
  cardStream.append(emptyState);
}

function getVisibleObstacles() {
  return getAutoSyncObstacles();
}

function renderModePrompt() {
  if (!cardStream) {
    return;
  }

  const prompt = document.createElement('div');
  prompt.className = 'empty-state';
  prompt.textContent = '当前字幕没有需要同步显示的障碍。';
  cardStream.append(prompt);
}

function renderCards() {
  renderEpisodeProgress();
  const pendingObstacles = getPendingObstacles();
  const visibleObstacles = getVisibleObstacles();

  if (!cardStream) {
    return visibleObstacles;
  }

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

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeExternalSubtitleItems(payload) {
  const sourceItems = Array.isArray(payload)
    ? payload
    : payload?.subtitles || payload?.subtitle_items || payload?.items || payload?.segments || [];

  return sourceItems.map((item, index) => {
    const english = item.english || item.en || item.text || item.subtitle || item.line || '';
    const chinese = item.chinese || item.zh || item.translation || item.cn || '';

    return {
      id: item.id || item.subtitle_id || `subtitle-${index + 1}`,
      text: String(english || '').trim(),
      chinese: String(chinese || '').trim(),
      startMs: Number.isFinite(Number(item.start_ms)) ? Number(item.start_ms) : null,
      endMs: Number.isFinite(Number(item.end_ms)) ? Number(item.end_ms) : null,
    };
  }).filter((item) => item.text);
}

function mergeExternalSubtitleTranslations(items) {
  items.forEach((item) => {
    if (item.text && item.chinese) {
      subtitleTranslations.set(item.text, item.chinese);
    }
  });
}

function getSubtitleTextFromExternalItems(items) {
  return items.map((item) => item.text).join('\n\n');
}

function normalizeObstacleKind(obstacle) {
  if (obstacle.kind === 'word' || obstacle.type === 'vocab') {
    return 'word';
  }

  return 'understanding';
}

function normalizeExternalObstacles(payload, subtitleText) {
  const sourceObstacles = Array.isArray(payload)
    ? payload
    : payload?.obstacles || payload?.items || payload?.data || [];
  const occurrenceCounts = new Map();

  return sourceObstacles.map((rawObstacle, index) => {
    const rawType = rawObstacle.type || rawObstacle.kind || rawObstacle.obstacle_type || 'vocab';
    const kind = normalizeObstacleKind(rawObstacle);
    const type = kind === 'word' ? 'vocab' : 'comprehension';
    const labelText = kind === 'word'
      ? rawObstacle.word || rawObstacle.baseForm || rawObstacle.base_form || rawObstacle.surfaceText || rawObstacle.text || ''
      : rawObstacle.phrase || rawObstacle.baseForm || rawObstacle.base_form || rawObstacle.source || rawObstacle.surfaceText || rawObstacle.text || '';
    const subtitleTextValue = rawObstacle.subtitle || rawObstacle.subtitle_text || rawObstacle.sentence || '';
    let indexValue = Number(rawObstacle.index ?? rawObstacle.start ?? rawObstacle.start_index);

    if (!Number.isFinite(indexValue)) {
      const searchText = subtitleTextValue || labelText;
      const foundInSubtitle = searchText ? subtitleText.indexOf(searchText) : -1;
      const foundLabel = labelText ? subtitleText.indexOf(labelText) : -1;
      indexValue = foundLabel >= 0 ? foundLabel : Math.max(0, foundInSubtitle);
    }

    const endValue = Number(rawObstacle.end ?? rawObstacle.end_index);
    const safeEnd = Number.isFinite(endValue) ? endValue : indexValue + String(labelText || '').length;
    const idBase = rawObstacle.id || `${type}-${labelText || rawType}-${indexValue}`;
    const occurrence = occurrenceCounts.get(idBase) || 0;
    occurrenceCounts.set(idBase, occurrence + 1);

    return {
      ...rawObstacle,
      id: occurrence > 0 ? `${idBase}-${occurrence + 1}` : String(idBase || `${type}-${index}`),
      type,
      kind,
      label: kind === 'word' ? '生词' : '理解',
      surfaceText: rawObstacle.surfaceText || rawObstacle.surface_text || rawObstacle.source || labelText,
      baseForm: rawObstacle.baseForm || rawObstacle.base_form || labelText,
      index: indexValue,
      start: indexValue,
      end: safeEnd,
      word: rawObstacle.word || rawObstacle.baseForm || rawObstacle.base_form || labelText,
      phrase: rawObstacle.phrase || rawObstacle.baseForm || rawObstacle.base_form || labelText,
      phonetic: rawObstacle.phonetic || '',
      partOfSpeech: rawObstacle.partOfSpeech || rawObstacle.part_of_speech || '',
      sentenceMeaning: rawObstacle.sentenceMeaning || rawObstacle.sentence_meaning || rawObstacle.translation || '',
      translation: rawObstacle.translation || rawObstacle.sentenceMeaning || rawObstacle.sentence_meaning || '',
      literal: rawObstacle.literal || rawObstacle.literal_meaning || '',
      actual: rawObstacle.actual || rawObstacle.actual_meaning || rawObstacle.meaning || '',
      grammar: rawObstacle.grammar || rawObstacle.grammar_explanation || rawObstacle.explanation || '',
    };
  }).filter((obstacle) => Number.isFinite(obstacle.index));
}

async function fetchJsonIfAvailable(path) {
  if (typeof fetch !== 'function') {
    return null;
  }

  try {
    const response = await fetch(path, { cache: 'no-store' });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    return null;
  }
}

async function loadRealEpisodeData() {
  const [subtitlePayload, obstaclePayload] = await Promise.all([
    fetchJsonIfAvailable('output_text/v28d_bilingual_subtitles.json'),
    fetchJsonIfAvailable('output_text/v29a_obstacles.json'),
  ]);

  const externalSubtitleItems = normalizeExternalSubtitleItems(subtitlePayload);
  const externalSubtitleText = externalSubtitleItems.length > 0
    ? getSubtitleTextFromExternalItems(externalSubtitleItems)
    : DEFAULT_SUBTITLE_TEXT;
  const externalObstacles = normalizeExternalObstacles(obstaclePayload, externalSubtitleText);

  if (externalSubtitleItems.length > 0) {
    mergeExternalSubtitleTranslations(externalSubtitleItems);
    if (subtitleTextInput) {
      subtitleTextInput.value = externalSubtitleText;
    }
  }

  if (externalSubtitleItems.length > 0 || externalObstacles.length > 0) {
    replaceObstacleStream(
      externalObstacles.length > 0
        ? externalObstacles
        : analyzeSubtitleText(externalSubtitleText, { level: DEFAULT_VOCABULARY_LEVEL }),
      externalSubtitleText,
    );
    renderCards();
  }
}

function handleAnalyzeClick() {
  analyzeAndRender(subtitleTextInput ? subtitleTextInput.value : DEFAULT_SUBTITLE_TEXT, { level: DEFAULT_VOCABULARY_LEVEL });
}

if (analyzeButton) {
  analyzeButton.addEventListener('click', handleAnalyzeClick);
}
if (episodeUndoButton) {
  episodeUndoButton.addEventListener('click', undoLastDismissedObstacle);
}
if (learningPauseHintDismiss) {
  learningPauseHintDismiss.addEventListener('click', dismissLearningPauseHint);
}
if (learningPauseHint) {
  learningPauseHint.addEventListener('pointerup', stopMarkerEvent);
}
if (learningPauseHint) {
  learningPauseHint.addEventListener('touchend', stopMarkerEvent);
}
if (learningPauseHint) {
  learningPauseHint.addEventListener('click', stopMarkerEvent);
}
if (videoFrame) {
  videoFrame.addEventListener('pointerup', handleVideoFrameActivation);
}
if (videoFrame) {
  videoFrame.addEventListener('touchend', handleVideoFrameActivation);
}
if (videoFrame) {
  videoFrame.addEventListener('click', handleVideoFrameActivation);
}
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
currentEpisodeProgressKey = getEpisodeProgressKey(DEFAULT_SUBTITLE_TEXT);
applyStoredEpisodeProgress(currentEpisodeProgressKey);
saveEpisodeProgress();
renderVideoState();
renderCards();
syncPlaybackClock();
loadRealEpisodeData();

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
