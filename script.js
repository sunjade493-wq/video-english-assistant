const DEFAULT_SUBTITLE_TEXT = `If you enjoyed this lecture,
I'm sure you're too busy to lay it on us.

Can you give me a hand?

I was pulled off the project.

Let's call it a day.`;
const DEFAULT_VOCABULARY_LEVEL = 'junior';

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
      end: rawWordMatch.index + rawWordMatch[0].length,
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

let subtitleSegments = parseSubtitleSegments(DEFAULT_SUBTITLE_TEXT);
let currentSegmentIndex = 0;
let isVideoPlaying = true;
let playbackTimer = null;
let obstacles = analyzeSubtitleText(DEFAULT_SUBTITLE_TEXT, { level: DEFAULT_VOCABULARY_LEVEL });
let hiddenObstacleIds = new Set();
let streamMode = 'dynamic';
const LEARNING_TIPS_MODE = 'auto';
let selectedObstacleId = null;
let learningPauseHintTimer = null;
let currentTimeMs = 0;
let playbackStartedAt = 0;
let playbackStartedTimeMs = 0;
let timelineRenderTimer = null;
let activeHeatCluster = null;

const SEGMENT_DURATION_MS = 3600;
const LEARNING_PAUSE_HINT_STORAGE_KEY = 'videoEnglishAssistant.learningPauseHintDismissed';
const HEAT_AXIS_CLUSTER_THRESHOLD_PX = 56;
const cardStream = document.querySelector('#cardStream');
const restoreAllButton = document.querySelector('#restoreAllButton');
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
  return obstacle.kind === 'word' ? obstacle.word : obstacle.source || obstacle.phrase;
}

function getPendingObstacles() {
  return obstacles.filter((obstacle) => !hiddenObstacleIds.has(obstacle.id));
}

function getSegmentObstacles(segment = getCurrentSubtitleSegment()) {
  if (!segment) {
    return [];
  }

  return getPendingObstacles().filter((obstacle) => (
    obstacle.index >= segment.start
    && obstacle.index < segment.end
  ));
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
    understanding: 1,
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

function getObstacleNavigationItems() {
  return sortObstaclesForLearningTips(getPendingObstacles()).map((obstacle) => ({
    ...obstacle,
    timeMs: getObstacleTimeMs(obstacle),
    percent: getTimelinePercent(getObstacleTimeMs(obstacle)),
  })).sort((firstObstacle, secondObstacle) => firstObstacle.timeMs - secondObstacle.timeMs);
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
      return;
    }

    clusters.push({
      items: [item],
      centerPercent: item.percent,
      lastPixel: pixel,
    });
  });

  return clusters;
}

function createHeatClusterButton(cluster) {
  const button = document.createElement('button');
  button.className = 'heat-cluster-button';
  button.type = 'button';
  button.textContent = cluster.items.length;
  button.style.left = `${cluster.centerPercent}%`;
  button.setAttribute('aria-label', `打开当前区域障碍（${cluster.items.length}）`);
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
  activeHeatCluster = null;

  if (bottomSheetBackdrop) {
    bottomSheetBackdrop.hidden = true;
    bottomSheetBackdrop.classList.remove('is-visible');
  }

  if (obstacleBottomSheet) {
    obstacleBottomSheet.hidden = true;
    obstacleBottomSheet.classList.remove('is-visible');
  }
}

function getSortedClusterItems(cluster) {
  return sortObstaclesForLearningTips(cluster.items);
}

function createBottomSheetItem(obstacle) {
  const button = document.createElement('button');
  button.className = 'bottom-sheet__item';
  button.type = 'button';
  button.textContent = `${obstacle.kind === 'word' ? '○' : '●'} ${obstacle.kind === 'word' ? obstacle.word : obstacle.phrase}`;
  button.addEventListener('click', () => {
    const wasPlaying = isVideoPlaying;
    seekToTime(obstacle.timeMs);
    isVideoPlaying = wasPlaying;
    syncPlaybackClock();
    closeBottomSheet();
    renderVideoState();
    renderCards();
  });

  return button;
}

function openBottomSheet(cluster) {
  activeHeatCluster = cluster;
  const clusterItems = getSortedClusterItems(cluster);

  if (bottomSheetTitle) {
    bottomSheetTitle.textContent = `当前区域障碍（${clusterItems.length}）`;
  }

  if (bottomSheetContent) {
    bottomSheetContent.innerHTML = '';
    clusterItems.forEach((obstacle) => bottomSheetContent.append(createBottomSheetItem(obstacle)));
  }

  if (bottomSheetBackdrop) {
    bottomSheetBackdrop.hidden = false;
    bottomSheetBackdrop.classList.add('is-visible');
  }

  if (obstacleBottomSheet) {
    obstacleBottomSheet.hidden = false;
    obstacleBottomSheet.classList.add('is-visible');
  }
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

function resetObstacleStream(nextObstacles, text = subtitleTextInput.value) {
  obstacles = nextObstacles;
  hiddenObstacleIds = new Set();
  streamMode = 'dynamic';
  selectedObstacleId = null;
  currentSegmentIndex = 0;
  currentTimeMs = 0;
  subtitleSegments = parseSubtitleSegments(text);
  closeBottomSheet();
  renderVideoState();
  syncPlaybackClock();
}

function hideCurrentObstacle(obstacleId) {
  hiddenObstacleIds.add(obstacleId);

  if (selectedObstacleId === obstacleId) {
    selectedObstacleId = null;
  }

  streamMode = 'dynamic';
  renderVideoState();
  renderCards();
}

function restoreAllCurrentObstacles() {
  hiddenObstacleIds = new Set();
  streamMode = 'dynamic';
  selectedObstacleId = null;
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
  resetObstacleStream(analyzeSubtitleText(text, options), text);
  return renderCards();
}

function handleAnalyzeClick() {
  analyzeAndRender(subtitleTextInput.value, { level: DEFAULT_VOCABULARY_LEVEL });
}

analyzeButton.addEventListener('click', handleAnalyzeClick);
restoreAllButton.addEventListener('click', restoreAllCurrentObstacles);
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
renderVideoState();
renderCards();
syncPlaybackClock();

window.ObstacleDetectionEngine = {
  Analyze: analyzeAndRender,
  analyze: analyzeAndRender,
  analyzeSubtitleText,
  detectVocabularyObstacles,
  detectUnderstandingObstacles,
  restoreAllCurrentObstacles,
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
