const OBSTACLE_DATA_URL = 'output_text/v29a_obstacles.json';
const LOCAL_SERVER_HINT = 'py -3.11 -m http.server 8000';
const LOCAL_SERVER_URL = 'http://localhost:8000';
const DEFAULT_SUBTITLE_TEXT = `If you enjoyed this lecture,
I'm sure you're too busy to lay it on us.

Can you give me a hand?

I was pulled off the project.

Let's call it a day.`;
const DEFAULT_VOCABULARY_LEVEL = 'junior';
const EPISODE_PROGRESS_STORAGE_PREFIX = 'videoEnglishAssistant.episodeProgress.v29b.';
const SEGMENT_DURATION_MS = 3600;
const LEARNING_PAUSE_HINT_STORAGE_KEY = 'videoEnglishAssistant.learningPauseHintDismissed';
const HEAT_AXIS_CLUSTER_THRESHOLD_PX = 56;
const REAL_DATA_FAILURE_MESSAGE = `真实障碍数据加载失败，当前显示 Demo 数据。请使用本地服务器运行：${LOCAL_SERVER_HINT}`;

const subtitleTranslations = new Map([
  [
    "If you enjoyed this lecture, I'm sure you're too busy to lay it on us.",
    '如果你喜欢这堂讲座，我相信你也很忙，但请直接告诉我们。',
  ],
  ['Can you give me a hand?', '你能帮我一下吗？'],
  ['I was pulled off the project.', '我被调离了这个项目。'],
  ["Let's call it a day.", '今天就到这里吧。'],
]);

let subtitleSegments = parseSubtitleSegments(DEFAULT_SUBTITLE_TEXT);
let currentSegmentIndex = 0;
let isVideoPlaying = true;
let playbackTimer = null;
let timelineRenderTimer = null;
let obstacles = [];
let hiddenObstacleIds = new Set();
let dismissedObstacleHistory = [];
let currentEpisodeProgressKey = '';
let selectedObstacleId = null;
let currentTimeMs = 0;
let playbackStartedAt = 0;
let playbackStartedTimeMs = 0;
let activeHeatClusterKey = null;
let learningPauseHintTimer = null;
let obstacleDataSource = 'demo';
let obstacleDataVersion = 'demo';
let latestObstacleSourceText = DEFAULT_SUBTITLE_TEXT;

const cardStream = document.querySelector('#cardStream');
const conqueredObstacleCount = document.querySelector('#conqueredObstacleCount');
const remainingObstacleCount = document.querySelector('#remainingObstacleCount');
const episodeUndoButton = document.querySelector('#episodeUndoButton');
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
const dataLoadWarning = document.querySelector('#dataLoadWarning');

function getAnalyzeEngine() {
  return window.AnalyzeEngine || globalThis.AnalyzeEngine;
}

function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9']+/g, ' ').replace(/\s+/g, ' ').trim();
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
      id: `subtitle-${textStart}`,
      text: textContent.replace(/\s*\n\s*/g, ' '),
      translation: subtitleTranslations.get(textContent.replace(/\s*\n\s*/g, ' ')) || '（中文字幕待补充）',
      start: textStart,
      end: textStart + textContent.length,
      startTime: (matches.indexOf(match) * SEGMENT_DURATION_MS) / 1000,
      endTime: ((matches.indexOf(match) + 1) * SEGMENT_DURATION_MS) / 1000,
    };
  });
}

function getObstacleText(obstacle) {
  if (obstacle.type === 'vocabulary') {
    return obstacle.word || obstacle.surfaceText || obstacle.baseForm || '';
  }

  return obstacle.text || obstacle.surfaceText || obstacle.source || obstacle.phrase || '';
}

function findMarkerOffset(sourceText, needle) {
  const text = String(sourceText || '');
  const target = String(needle || '').trim();

  if (!text || !target) {
    return -1;
  }

  const directIndex = text.toLowerCase().indexOf(target.toLowerCase());

  if (directIndex >= 0) {
    return directIndex;
  }

  const normalizedNeedle = normalizeText(target);
  const words = [...text.matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g)];

  for (let index = 0; index < words.length; index += 1) {
    const phrase = words.slice(index, index + normalizedNeedle.split(' ').length).map((match) => match[0]).join(' ');

    if (normalizeText(phrase) === normalizedNeedle) {
      return words[index].index;
    }
  }

  return -1;
}

function buildSubtitleSegmentsFromObstacles(sourceObstacles) {
  const segments = [];
  const segmentByKey = new Map();
  let cursor = 0;

  sourceObstacles
    .filter((obstacle) => obstacle.source_en)
    .sort((first, second) => (first.start ?? 0) - (second.start ?? 0))
    .forEach((obstacle) => {
      const text = String(obstacle.source_en || '').trim();
      const translation = String(obstacle.source_zh || '').trim() || '（中文字幕待补充）';
      const key = `${text}\n${translation}`;

      if (segmentByKey.has(key)) {
        return;
      }

      const segment = {
        id: `real-subtitle-${segments.length + 1}`,
        text,
        translation,
        start: cursor,
        end: cursor + text.length,
        startTime: Number.isFinite(Number(obstacle.start)) ? Number(obstacle.start) : segments.length * (SEGMENT_DURATION_MS / 1000),
        endTime: Number.isFinite(Number(obstacle.end)) ? Number(obstacle.end) : (segments.length + 1) * (SEGMENT_DURATION_MS / 1000),
      };

      segments.push(segment);
      segmentByKey.set(key, segment);
      cursor += text.length + 2;
    });

  return segments.length > 0 ? segments : parseSubtitleSegments(DEFAULT_SUBTITLE_TEXT);
}

function normalizeObstacle(rawObstacle, index, segments) {
  const type = rawObstacle.type === 'vocabulary' || rawObstacle.type === 'vocab' ? 'vocabulary' : 'comprehension';
  const priority = type === 'vocabulary' ? 1 : 2;
  const start = Number.isFinite(Number(rawObstacle.start)) ? Number(rawObstacle.start) : index;
  const end = Number.isFinite(Number(rawObstacle.end)) ? Number(rawObstacle.end) : start;
  const sourceEn = String(rawObstacle.source_en || rawObstacle.source || rawObstacle.subtitleText || '').trim();
  const sourceZh = String(rawObstacle.source_zh || '').trim();
  const markerText = type === 'vocabulary'
    ? String(rawObstacle.word || rawObstacle.surfaceText || rawObstacle.baseForm || '').trim()
    : String(rawObstacle.text || rawObstacle.surfaceText || rawObstacle.source || rawObstacle.phrase || rawObstacle.baseForm || '').trim();
  const rawSubtitleIndex = Number(String(rawObstacle.subtitleId || '').replace(/[^0-9]/g, '')) - 1;
  const matchingSegment = (Number.isInteger(rawSubtitleIndex) && rawSubtitleIndex >= 0 ? segments[rawSubtitleIndex] : null)
    || segments.find((segment) => segment.text === sourceEn)
    || segments.find((segment) => start >= segment.startTime && start <= segment.endTime)
    || segments[index % Math.max(segments.length, 1)];
  const markerOffset = matchingSegment ? findMarkerOffset(matchingSegment.text, markerText) : -1;
  const markerStart = matchingSegment && markerOffset >= 0 ? matchingSegment.start + markerOffset : index;
  const markerEnd = markerStart + Math.max(1, markerText.length);

  return {
    ...rawObstacle,
    id: rawObstacle.id || `${type}-${index + 1}-${String(markerText || start).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`,
    type,
    kind: type === 'vocabulary' ? 'word' : 'understanding',
    priority,
    start,
    end,
    source_en: sourceEn,
    source_zh: sourceZh,
    index: markerStart,
    markerEnd,
    segmentId: matchingSegment?.id || '',
    word: type === 'vocabulary' ? String(rawObstacle.word || rawObstacle.surfaceText || rawObstacle.baseForm || markerText || '').trim() : undefined,
    phonetic: type === 'vocabulary' ? String(rawObstacle.phonetic || '') : undefined,
    translation: type === 'vocabulary' ? String(rawObstacle.translation || rawObstacle.sentenceMeaning || '') : undefined,
    text: type === 'comprehension' ? String(rawObstacle.text || rawObstacle.surfaceText || rawObstacle.source || rawObstacle.phrase || markerText || '').trim() : undefined,
    literal: type === 'comprehension' ? String(rawObstacle.literal || '') : undefined,
    actual: type === 'comprehension' ? String(rawObstacle.actual || '') : undefined,
    grammar: type === 'comprehension' ? String(rawObstacle.grammar || '') : undefined,
  };
}

function sortObstaclesForLearningTips(obstaclesToSort) {
  return [...obstaclesToSort].sort((firstObstacle, secondObstacle) => {
    const firstPriority = Number.isFinite(Number(firstObstacle.priority)) ? Number(firstObstacle.priority) : 99;
    const secondPriority = Number.isFinite(Number(secondObstacle.priority)) ? Number(secondObstacle.priority) : 99;

    if (firstPriority !== secondPriority) {
      return firstPriority - secondPriority;
    }

    return (Number(firstObstacle.start) || 0) - (Number(secondObstacle.start) || 0);
  });
}

function normalizeObstacleList(rawObstacles, segments = subtitleSegments) {
  return sortObstaclesForLearningTips(
    (rawObstacles || [])
      .filter((obstacle) => obstacle && (obstacle.type === 'vocabulary' || obstacle.type === 'vocab' || obstacle.type === 'comprehension'))
      .map((obstacle, index) => normalizeObstacle(obstacle, index, segments)),
  );
}

function createSubtitleItemsFromText(text) {
  return parseSubtitleSegments(text).map((segment, index) => ({
    id: `subtitle-${index + 1}`,
    text: segment.text,
    start: segment.start,
    end: segment.end,
  }));
}

function analyzeSubtitleText(text, options = {}) {
  const engine = getAnalyzeEngine();

  if (!engine) {
    return [];
  }

  const analyzedObstacles = engine.analyzeSubtitleItems(createSubtitleItemsFromText(text), options);
  const segments = parseSubtitleSegments(text);
  return normalizeObstacleList(analyzedObstacles, segments);
}

function detectVocabularyObstacles(text, levelName = DEFAULT_VOCABULARY_LEVEL, customWords = []) {
  return analyzeSubtitleText(text, { level: levelName, customWords }).filter((obstacle) => obstacle.type === 'vocabulary');
}

function detectUnderstandingObstacles(text) {
  return analyzeSubtitleText(text, { level: 'custom', customWords: String(text || '').match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [] })
    .filter((obstacle) => obstacle.type === 'comprehension');
}

function getDemoObstacles() {
  return analyzeSubtitleText(DEFAULT_SUBTITLE_TEXT, { level: DEFAULT_VOCABULARY_LEVEL });
}

function getCurrentSubtitleSegment() {
  return subtitleSegments[currentSegmentIndex] || null;
}

function getTotalDurationMs() {
  const timedEnd = subtitleSegments.reduce((maxEnd, segment) => Math.max(maxEnd, Number(segment.endTime || 0) * 1000), 0);
  return Math.max(SEGMENT_DURATION_MS, timedEnd || subtitleSegments.length * SEGMENT_DURATION_MS);
}

function clampTime(timeMs) {
  return Math.max(0, Math.min(timeMs, getTotalDurationMs()));
}

function getTimeForSegmentIndex(segmentIndex) {
  const segment = subtitleSegments[Math.max(0, segmentIndex)] || subtitleSegments[0];
  return segment ? Number(segment.startTime || 0) * 1000 : 0;
}

function getSegmentIndexForTime(timeMs) {
  if (subtitleSegments.length === 0) {
    return 0;
  }

  const timeSeconds = clampTime(timeMs) / 1000;
  const timedIndex = subtitleSegments.findIndex((segment) => timeSeconds >= Number(segment.startTime || 0) && timeSeconds < Number(segment.endTime || 0));

  if (timedIndex >= 0) {
    return timedIndex;
  }

  return Math.min(subtitleSegments.length - 1, Math.max(0, Math.floor(clampTime(timeMs) / SEGMENT_DURATION_MS)));
}

function getObstacleTimeMs(obstacle) {
  return Math.max(0, Number(obstacle.start || 0) * 1000);
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
  return getObstacleText(obstacle);
}

function getPendingObstacles() {
  return obstacles.filter((obstacle) => !hiddenObstacleIds.has(obstacle.id));
}

function getVisibleObstacles() {
  const pendingObstacles = getPendingObstacles();

  if (selectedObstacleId) {
    const selectedObstacle = pendingObstacles.find((obstacle) => obstacle.id === selectedObstacleId);

    if (selectedObstacle) {
      return [selectedObstacle];
    }
  }

  return pendingObstacles.length > 0 ? [sortObstaclesForLearningTips(pendingObstacles)[0]] : [];
}

function getObstaclesInSegment(segment, sourceObstacles = obstacles) {
  if (!segment) {
    return [];
  }

  return sourceObstacles.filter((obstacle) => obstacle.segmentId === segment.id || (obstacle.index >= segment.start && obstacle.index < segment.end));
}

function findSegmentIndexForObstacle(obstacleId) {
  const obstacle = obstacles.find((item) => item.id === obstacleId);

  if (!obstacle) {
    return -1;
  }

  const segmentIdIndex = subtitleSegments.findIndex((segment) => segment.id === obstacle.segmentId);

  if (segmentIdIndex >= 0) {
    return segmentIdIndex;
  }

  return subtitleSegments.findIndex((segment) => obstacle.index >= segment.start && obstacle.index < segment.end);
}

function syncSubtitleSegmentToObstacle(obstacleId) {
  const matchingSegmentIndex = findSegmentIndexForObstacle(obstacleId);

  if (matchingSegmentIndex >= 0) {
    currentSegmentIndex = matchingSegmentIndex;
    currentTimeMs = getTimeForSegmentIndex(matchingSegmentIndex);
  }
}

function isObstacleInSegment(obstacle, segment) {
  return Boolean(segment) && (obstacle.segmentId === segment.id || (obstacle.index >= segment.start && obstacle.index < segment.end));
}

function getMarkerRangeForObstacle(segment, obstacle) {
  return {
    obstacle,
    start: Math.max(0, obstacle.index - segment.start),
    end: Math.min(segment.text.length, (obstacle.markerEnd || obstacle.end || obstacle.index + getObstacleLabel(obstacle).length) - segment.start),
  };
}

function getMarkerRangesForSegment(segment) {
  return getObstaclesInSegment(segment, getPendingObstacles())
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

function pauseVideoForObstacle(obstacleId) {
  selectedObstacleId = obstacleId;
  syncSubtitleSegmentToObstacle(obstacleId);
  setVideoPlayback(false);
  showLearningPauseHint();
  renderCards();
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

  marker.addEventListener('pointerup', (event) => {
    stopMarkerEvent(event);
    pauseVideoForObstacle(obstacle.id);
  });
  marker.addEventListener('touchend', (event) => {
    stopMarkerEvent(event);
    pauseVideoForObstacle(obstacle.id);
  });
  marker.addEventListener('click', (event) => {
    stopMarkerEvent(event);
    pauseVideoForObstacle(obstacle.id);
  });

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
  chineseLine.textContent = segment.translation || subtitleTranslations.get(segment.text) || '（中文字幕待补充）';
  currentSubtitleLine.append(englishLine, chineseLine);
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
    videoStatusText.textContent = `V29B Obstacle Stream · ${getLearningStateLabel()}`;
  }

  renderSubtitleMarkers();
  renderTimelines();
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

  currentTimeMs = nextTimeMs;
  currentSegmentIndex = nextSegmentIndex;
  renderVideoState();
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
  currentTimeMs = nextTimeMs >= getTotalDurationMs() ? 0 : nextTimeMs;
  currentSegmentIndex = getSegmentIndexForTime(currentTimeMs);

  if (wasPlaying) {
    playbackStartedAt = Date.now();
    playbackStartedTimeMs = currentTimeMs;
  }

  selectedObstacleId = null;
  renderVideoState();
  renderCards();
}

function handleTimelineInput(event) {
  const percent = Number(event.target.value) || 0;
  seekToTime((percent / 100) * getTotalDurationMs());
}

function createObstacleNavigationGroup(segment, segmentIndex) {
  const timeMs = getTimeForSegmentIndex(segmentIndex);
  const segmentObstacles = sortObstaclesForLearningTips(getObstaclesInSegment(segment, obstacles)).map((obstacle) => ({
    ...obstacle,
    timeMs: getObstacleTimeMs(obstacle),
    percent: getTimelinePercent(getObstacleTimeMs(obstacle)),
  }));

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
  return cluster.items.map((item) => item.id).join('|');
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
  const obstacleCount = getClusterObstacleCount(cluster);

  button.className = 'heat-cluster-button';
  button.type = 'button';
  button.textContent = obstacleCount;
  button.style.left = `${cluster.centerPercent}%`;
  button.setAttribute('aria-label', `打开当前区域障碍（${obstacleCount}）`);
  button.setAttribute('aria-pressed', clusterKey === activeHeatClusterKey ? 'true' : 'false');

  if (clusterKey === activeHeatClusterKey) {
    button.classList.add('is-selected');
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

function createBottomSheetObstacleButton(obstacle) {
  const button = document.createElement('button');
  button.className = 'bottom-sheet__obstacle';
  button.type = 'button';
  button.textContent = `${obstacle.type === 'vocabulary' ? '○' : '●'} ${getObstacleLabel(obstacle)}`;
  button.addEventListener('click', () => {
    const wasPlaying = isVideoPlaying;
    selectedObstacleId = obstacle.id;
    seekToTime(getObstacleTimeMs(obstacle));
    isVideoPlaying = wasPlaying;
    selectedObstacleId = obstacle.id;
    syncPlaybackClock();
    closeBottomSheet();
    renderVideoState();
    renderCards();
  });

  return button;
}

function openBottomSheet(cluster) {
  activeHeatClusterKey = getHeatClusterKey(cluster);
  const groups = cluster.items.filter((item) => Array.isArray(item.obstacles));
  const obstacleCount = getClusterObstacleCount(cluster);

  if (bottomSheetTitle) {
    bottomSheetTitle.textContent = `当前区域障碍（${obstacleCount}）`;
  }

  if (bottomSheetContent) {
    bottomSheetContent.innerHTML = '';
    groups.forEach((group) => {
      const groupElement = document.createElement('article');
      groupElement.className = 'bottom-sheet__subtitle-group';

      const time = document.createElement('div');
      time.className = 'bottom-sheet__time';
      time.textContent = formatTimelineTime(group.timeMs);

      const subtitle = document.createElement('p');
      subtitle.className = 'bottom-sheet__subtitle';
      subtitle.textContent = group.segment.text;

      const obstacleList = document.createElement('div');
      obstacleList.className = 'bottom-sheet__obstacles';
      group.obstacles.forEach((obstacle) => obstacleList.append(createBottomSheetObstacleButton(obstacle)));

      groupElement.append(time, subtitle, obstacleList);
      bottomSheetContent.append(groupElement);
    });
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

function hashEpisodeText(text) {
  const source = normalizeText(String(text || '')).replace(/'/g, '') || 'empty';
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(36);
}

function getEpisodeProgressKey(text) {
  return `${EPISODE_PROGRESS_STORAGE_PREFIX}${obstacleDataSource}.${obstacleDataVersion}.${hashEpisodeText(text)}`;
}

function getCurrentObstacleIdSet() {
  return new Set(obstacles.map((obstacle) => obstacle.id));
}

function filterObstacleIdsForCurrentEpisode(obstacleIds) {
  const currentObstacleIds = getCurrentObstacleIdSet();
  return [...new Set(obstacleIds || [])].filter((obstacleId) => currentObstacleIds.has(obstacleId));
}

function readStoredEpisodeProgress(progressKey) {
  try {
    const storedProgress = window.localStorage.getItem(progressKey);
    return storedProgress ? JSON.parse(storedProgress) : null;
  } catch (error) {
    return null;
  }
}

function saveEpisodeProgress() {
  if (!currentEpisodeProgressKey) {
    return;
  }

  const hiddenIds = filterObstacleIdsForCurrentEpisode([...hiddenObstacleIds]);
  const historyIds = dismissedObstacleHistory.filter((obstacleId) => hiddenIds.includes(obstacleId));

  window.localStorage.setItem(currentEpisodeProgressKey, JSON.stringify({
    version: 2,
    dataSource: obstacleDataSource,
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
  dismissedObstacleHistory = filterObstacleIdsForCurrentEpisode(storedProgress?.dismissedObstacleHistory || hiddenIds)
    .filter((obstacleId) => hiddenObstacleIds.has(obstacleId));
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

  if (restoreAllButton) {
    restoreAllButton.disabled = conquered === 0;
  }
}

function undoLastDismissedObstacle() {
  while (dismissedObstacleHistory.length > 0) {
    const obstacleId = dismissedObstacleHistory.pop();

    if (hiddenObstacleIds.has(obstacleId)) {
      hiddenObstacleIds.delete(obstacleId);
      selectedObstacleId = obstacleId;
      syncSubtitleSegmentToObstacle(obstacleId);
      saveEpisodeProgress();
      renderVideoState();
      renderCards();
      return obstacles.find((obstacle) => obstacle.id === obstacleId) || null;
    }
  }

  saveEpisodeProgress();
  renderCards();
  return null;
}

function replaceObstacleStream(nextObstacles, text = latestObstacleSourceText, source = obstacleDataSource, version = obstacleDataVersion) {
  obstacles = sortObstaclesForLearningTips(nextObstacles);
  latestObstacleSourceText = text;
  obstacleDataSource = source;
  obstacleDataVersion = version;
  currentEpisodeProgressKey = getEpisodeProgressKey(`${text}\n${obstacles.map((obstacle) => obstacle.id).join('|')}`);
  applyStoredEpisodeProgress(currentEpisodeProgressKey);
  selectedObstacleId = null;
  currentSegmentIndex = 0;
  currentTimeMs = 0;
  saveEpisodeProgress();
  closeBottomSheet();
  renderVideoState();
  syncPlaybackClock();
  renderCards();
}

function hideCurrentObstacle(obstacleId) {
  if (!hiddenObstacleIds.has(obstacleId)) {
    hiddenObstacleIds.add(obstacleId);
    dismissedObstacleHistory.push(obstacleId);
  }

  if (selectedObstacleId === obstacleId) {
    selectedObstacleId = null;
  }

  saveEpisodeProgress();
  renderVideoState();
  renderCards();
}

function restoreAllCurrentObstacles() {
  hiddenObstacleIds = new Set();
  dismissedObstacleHistory = [];
  selectedObstacleId = null;
  currentSegmentIndex = 0;
  currentTimeMs = 0;
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
  content.textContent = String(text || '');

  block.append(label, content);
  return block;
}

function createWordSummary(obstacle) {
  const wrapper = document.createElement('div');
  wrapper.className = 'word-summary';

  const word = document.createElement('p');
  word.className = 'word-summary__word';
  word.textContent = obstacle.word || '';

  const phonetic = document.createElement('p');
  phonetic.className = 'word-summary__phonetic';
  phonetic.textContent = obstacle.phonetic || '';

  const translation = document.createElement('p');
  translation.className = 'word-summary__translation';
  translation.textContent = obstacle.translation || '';

  wrapper.append(word, phonetic, translation);
  return wrapper;
}

function createComprehensionSummary(obstacle) {
  const summary = document.createElement('p');
  summary.className = 'understanding-summary';
  summary.textContent = obstacle.text || '';
  return summary;
}

function createCard(obstacle) {
  const card = document.createElement('article');
  card.className = 'obstacle-card';

  const inner = document.createElement('div');
  inner.className = 'card-inner';

  const label = document.createElement('span');
  label.className = 'type-label';
  label.textContent = obstacle.type === 'vocabulary' ? '生词障碍' : '理解障碍';

  const content = document.createElement('div');
  content.className = 'card-content';

  if (obstacle.type === 'vocabulary') {
    content.append(createWordSummary(obstacle));
  } else {
    content.append(
      createComprehensionSummary(obstacle),
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

function renderCards() {
  renderEpisodeProgress();
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

function showDataWarning(message) {
  if (!dataLoadWarning) {
    return;
  }

  dataLoadWarning.hidden = false;
  dataLoadWarning.textContent = `${message}。如果你正在用 file:// 打开页面，浏览器可能因 CORS 阻止读取 JSON；请运行：${LOCAL_SERVER_HINT}，然后访问：${LOCAL_SERVER_URL}`;
}

function hideDataWarning() {
  if (!dataLoadWarning) {
    return;
  }

  dataLoadWarning.hidden = true;
  dataLoadWarning.textContent = '';
}

async function loadRealObstacleData() {
  const response = await fetch(OBSTACLE_DATA_URL, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json();

  if (!payload || !Array.isArray(payload.obstacles)) {
    throw new Error('Invalid v29a obstacle payload');
  }

  const realSegments = buildSubtitleSegmentsFromObstacles(payload.obstacles);
  const realObstacles = normalizeObstacleList(payload.obstacles, realSegments);

  if (realObstacles.length === 0) {
    throw new Error('No supported vocabulary/comprehension obstacles');
  }

  subtitleSegments = realSegments;
  latestObstacleSourceText = realSegments.map((segment) => segment.text).join('\n\n');

  if (subtitleTextInput) {
    subtitleTextInput.value = latestObstacleSourceText;
  }

  hideDataWarning();
  replaceObstacleStream(realObstacles, latestObstacleSourceText, 'v29a-json', payload.version || 'v29a');
}

function loadDemoObstacleData() {
  subtitleSegments = parseSubtitleSegments(DEFAULT_SUBTITLE_TEXT);
  latestObstacleSourceText = DEFAULT_SUBTITLE_TEXT;

  if (subtitleTextInput) {
    subtitleTextInput.value = DEFAULT_SUBTITLE_TEXT;
  }

  replaceObstacleStream(getDemoObstacles(), DEFAULT_SUBTITLE_TEXT, 'demo', 'demo');
}

async function initializeObstacleStream() {
  loadDemoObstacleData();

  try {
    await loadRealObstacleData();
  } catch (error) {
    console.warn('Failed to load real obstacle data; using demo fallback.', error);
    showDataWarning(REAL_DATA_FAILURE_MESSAGE);
    loadDemoObstacleData();
  }
}

function analyzeAndRender(text, options = {}) {
  subtitleSegments = parseSubtitleSegments(text);
  latestObstacleSourceText = text;
  hideDataWarning();
  replaceObstacleStream(analyzeSubtitleText(text, options), text, 'manual-demo', 'analyze');
  return renderCards();
}

function handleAnalyzeClick() {
  analyzeAndRender(subtitleTextInput.value, { level: DEFAULT_VOCABULARY_LEVEL });
}

if (analyzeButton) {
  analyzeButton.addEventListener('click', handleAnalyzeClick);
}
if (episodeUndoButton) {
  episodeUndoButton.addEventListener('click', undoLastDismissedObstacle);
}
if (restoreAllButton) {
  restoreAllButton.addEventListener('click', restoreAllCurrentObstacles);
}
if (learningPauseHintDismiss) {
  learningPauseHintDismiss.addEventListener('click', dismissLearningPauseHint);
}
if (learningPauseHint) {
  learningPauseHint.addEventListener('pointerup', stopMarkerEvent);
  learningPauseHint.addEventListener('touchend', stopMarkerEvent);
  learningPauseHint.addEventListener('click', stopMarkerEvent);
}
if (videoFrame) {
  videoFrame.addEventListener('pointerup', handleVideoFrameActivation);
  videoFrame.addEventListener('touchend', handleVideoFrameActivation);
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

initializeObstacleStream();

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
    obstacleDataSource,
  }),
  seekToTime,
  getObstacleNavigationItems,
  clusterObstacleItems,
  renderTimelines,
  openBottomSheet,
  closeBottomSheet,
  getVisibleObstacles,
  pauseVideoForObstacle,
  getCurrentSegmentObstacles: () => getObstaclesInSegment(getCurrentSubtitleSegment(), getPendingObstacles()),
  moveToNextSubtitleSegment: () => seekToTime(getTimeForSegmentIndex((currentSegmentIndex + 1) % Math.max(1, subtitleSegments.length))),
};
