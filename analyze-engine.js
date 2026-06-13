(function attachAnalyzeEngine(global) {
  const DEFAULT_VOCABULARY_LEVEL = 'junior';

  const vocabularyLevels = {
    junior: {
      label: '初中',
      words: [
        'a', 'about', 'after', 'all', 'an', 'and', 'are', 'be', 'busy', 'but', 'can', 'do', 'enjoy',
        'enjoyed', 'for', 'from', 'have', 'he', 'her', 'him', 'i', "i'm", 'if', 'in', 'is', 'it', 'lay',
        'me', 'my', 'not', 'let\'s', 'of', 'on', 'or', 'our', 'she', 'sure', 'that', 'the', 'this', 'to',
        'too', 'us', 'was', 'we', 'you', "you're", 'your', 'give', 'hand', 'pull', 'pulled', 'off', 'project', 'call', 'day',
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

  const vocabularyMockEntries = {
    official: {
      phonetic: '待补充',
      partOfSpeech: 'adj./n.',
      sentenceMeaning: '官方的；官员',
      explanation: 'official 待补充 adj./n.\n句中含义：官方的；官员',
    },
    tradition: {
      phonetic: '待补充',
      partOfSpeech: 'n.',
      sentenceMeaning: '传统',
      explanation: 'tradition 待补充 n.\n句中含义：传统',
    },
    believe: {
      phonetic: '待补充',
      partOfSpeech: 'v.',
      sentenceMeaning: '相信',
      explanation: 'believe 待补充 v.\n句中含义：相信',
    },
    marry: {
      phonetic: '待补充',
      partOfSpeech: 'v.',
      sentenceMeaning: '结婚；嫁；娶',
      explanation: 'marry 待补充 v.\n句中含义：结婚；嫁；娶',
    },
    lecture: {
      phonetic: '/ˈlektʃər/',
      partOfSpeech: 'n./v.',
      sentenceMeaning: '讲座',
      explanation: 'lecture /ˈlektʃər/ n./v.\n句中含义：讲座',
    },
    academic: {
      phonetic: '/ˌækəˈdemɪk/',
      partOfSpeech: 'adj.',
      sentenceMeaning: '学术的',
      explanation: 'academic /ˌækəˈdemɪk/ adj.\n句中含义：学术的',
    },
    project: {
      phonetic: '/ˈprɑːdʒekt/',
      partOfSpeech: 'n.',
      sentenceMeaning: '项目',
      explanation: 'project /ˈprɑːdʒekt/ n.\n句中含义：项目',
    },
    actually: {
      phonetic: '待补充',
      partOfSpeech: 'adv.',
      sentenceMeaning: '实际上；其实',
      explanation: 'actually 待补充 adv.\n句中含义：实际上；其实',
    },
  };

  const comprehensionMockEntries = [
    {
      id: 'lay-it-on-us',
      baseForm: 'lay it on us',
      prototype: 'lay something on somebody',
      literal: '把某件事放到某人身上',
      actual: '把想说的话直接告诉对方；别拐弯抹角。',
      grammar: 'lay + something + on + somebody 的核心动作是“把某物放到某人身上”。当 something 是信息、要求或想法时，on somebody 表示把这些内容直接交给对方承接，所以口语里可以引申为“直接说给某人听”。字幕里的 to lay it on us 用 it 指代前文要说的内容，us 是接收信息的人。',
      patterns: ['lay it on us'],
    },
    {
      id: 'give-me-a-hand',
      baseForm: 'give me a hand',
      prototype: 'give somebody a hand',
      literal: '给某人一只手',
      actual: '帮某人一下；搭把手。',
      grammar: 'give + somebody + a hand 的字面画面是“把一只手给某人”。hand 在动作场景里代表可用的劳力或协助，因此给某人一只手就自然引申为“提供帮助”。字幕里的 me 只是具体对象，结构可以替换成其他人。',
      patterns: ['give me a hand'],
    },
    {
      id: 'pull-me-off-the-project',
      baseForm: 'pull me off the project',
      displayPhrase: 'pull off the project',
      prototype: 'pull somebody off something',
      literal: '把某人从某事物上拉开',
      actual: '让某人退出某项任务；把某人从某事中撤下。',
      grammar: 'pull + somebody + off + something 的核心动作是“把某人拉离某个位置”。off 表示离开原来的接触点或参与位置，所以放到 project、task、case 等工作语境中，就表示把某人从该任务中调离或撤下。字幕中的 was pulled off 是被动形式，强调“我被撤下”。',
      patterns: [
        /\bpull(?:ed)?\s+(?:me\s+|[a-z]+\s+)?off\s+the\s+project\b/i,
      ],
    },
    {
      id: 'be-going-to',
      baseForm: 'be going to',
      prototype: 'be going to',
      literal: '正在去做某事',
      actual: '将要；打算。',
      grammar: 'be going to 用 be + going + to 表示计划、意图或可预见的将来。going 不再只表示移动，而是和 to 后面的动词一起表达“接下来会发生/准备做”。',
      patterns: [
        'be going to',
        /\b(?:am|are|is|was|were|'m|'re|'s)\s+going\s+to(?:\s+[a-z]+)?\b/i,
      ],
    },
    {
      id: 'it-is-to',
      baseForm: 'it is ... to ...',
      prototype: 'It is ... to ...',
      literal: '它是……去……',
      actual: '用 it 作形式主语，把真正动作放在 to 后面。',
      grammar: 'It is + adjective/noun + to + verb 中，It 不指具体事物，而是占住主语位置；to 后面的动作才是真正被评价或说明的内容。',
      patterns: [
        'It is ... to ...',
        /\bit\s+(?:is|'s)\s+[^.?!,;:]+?\s+to\s+[a-z]+\b/i,
      ],
    },
    {
      id: 'call-it-a-day',
      baseForm: 'call it a day',
      prototype: 'call it a day',
      literal: '把某事称为一天的结束',
      actual: '今天到此为止；收工。',
      grammar: 'call + it + a day 的结构里，call 表示“把某事认定为……”，it 指当前正在做的工作或活动，a day 指“一天的工作量/一天的阶段”。把当前活动认定为 a day，就表示这个阶段已经够了，可以停止并结束今天的工作。',
      patterns: ['call it a day'],
    },
  ];

  function normalizeWord(word) {
    return String(word || '').toLowerCase().replace(/^'+|'+$/g, '');
  }

  function tokenize(text) {
    return String(text || '').match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) || [];
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

  function isSingleVocabularyUnit(text) {
    return tokenize(text).length === 1;
  }

  function isComprehensionStructure(entry) {
    return Boolean(entry && !isSingleVocabularyUnit(entry.prototype || entry.baseForm || ''));
  }

  function createFallbackVocabEntry(word) {
    return {
      phonetic: '待补充',
      partOfSpeech: '',
      sentenceMeaning: '待补充',
      explanation: `${word} 待补充\n句中含义：待补充`,
    };
  }

  function findNormalizedPhraseIndex(text, phrase) {
    const phraseWords = tokenize(phrase).map(normalizeWord);

    if (phraseWords.length === 0) {
      return -1;
    }

    const textWords = [...String(text || '').matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g)].map((match) => ({
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

  function findComprehensionMatch(text, entry) {
    return entry.patterns.reduce((earliestMatch, matcher) => {
      let match = null;

      if (Object.prototype.toString.call(matcher) === '[object RegExp]') {
        const flags = matcher.flags.includes('i') ? matcher.flags : `${matcher.flags}i`;
        const regex = new RegExp(matcher.source, flags);
        const regexMatch = regex.exec(text);

        if (regexMatch) {
          match = {
            start: regexMatch.index,
            end: regexMatch.index + regexMatch[0].length,
            surfaceText: regexMatch[0],
          };
        }
      } else {
        const start = findNormalizedPhraseIndex(text, matcher);

        if (start >= 0) {
          match = {
            start,
            end: start + matcher.length,
            surfaceText: text.slice(start, start + matcher.length),
          };
        }
      }

      if (!match || (earliestMatch && earliestMatch.start <= match.start)) {
        return earliestMatch;
      }

      return match;
    }, null);
  }

  function createObstacleId(type, subtitleId, baseForm, start, occurrence) {
    const safeBaseForm = normalizeWord(baseForm).replace(/[^a-z0-9']+/g, '-').replace(/^-+|-+$/g, '');
    return `${type}-${subtitleId}-${safeBaseForm}-${start}-${occurrence}`;
  }

  function createLegacyObstacleId(type, baseForm, occurrence) {
    const safeBaseForm = normalizeWord(baseForm).replace(/[^a-z0-9']+/g, '-').replace(/^-+|-+$/g, '');

    if (occurrence > 0) {
      return `${type === 'vocab' ? 'word' : 'understanding'}-${safeBaseForm}-${occurrence + 1}`;
    }

    return `${type === 'vocab' ? 'word' : 'understanding'}-${safeBaseForm}`;
  }

  function buildVocabObstacles(subtitleItem, levelName, customWords, occurrenceCounts) {
    const knownWords = resolveVocabularyWords(levelName, customWords);
    const wordMatches = [...String(subtitleItem.text || '').matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g)];

    return wordMatches.reduce((result, rawWordMatch) => {
      const baseForm = normalizeWord(rawWordMatch[0]);

      if (!baseForm || knownWords.has(baseForm)) {
        return result;
      }

      const entry = vocabularyMockEntries[baseForm] || createFallbackVocabEntry(baseForm);
      const occurrenceKey = `vocab:${subtitleItem.id}:${baseForm}`;
      const occurrence = occurrenceCounts.get(occurrenceKey) || 0;
      occurrenceCounts.set(occurrenceKey, occurrence + 1);
      const start = subtitleItem.start + rawWordMatch.index;
      const end = start + rawWordMatch[0].length;

      result.push({
        id: createLegacyObstacleId('vocab', baseForm, occurrence),
        engineId: createObstacleId('vocab', subtitleItem.id, baseForm, start, occurrence),
        subtitleId: subtitleItem.id,
        type: 'vocab',
        kind: 'word',
        label: '生词',
        surfaceText: rawWordMatch[0],
        baseForm,
        explanation: entry.explanation,
        start,
        end,
        index: start,
        word: baseForm,
        phonetic: entry.phonetic,
        partOfSpeech: entry.partOfSpeech,
        sentenceMeaning: entry.sentenceMeaning,
        translation: entry.sentenceMeaning,
      });

      return result;
    }, []);
  }

  function buildComprehensionObstacles(subtitleItem, occurrenceCounts) {
    return comprehensionMockEntries.reduce((result, entry) => {
      if (!isComprehensionStructure(entry)) {
        return result;
      }

      const match = findComprehensionMatch(subtitleItem.text, entry);

      if (!match) {
        return result;
      }

      const occurrenceKey = `comprehension:${subtitleItem.id}:${entry.baseForm}`;
      const occurrence = occurrenceCounts.get(occurrenceKey) || 0;
      occurrenceCounts.set(occurrenceKey, occurrence + 1);
      const start = subtitleItem.start + match.start;
      const end = subtitleItem.start + match.end;
      const explanation = `${entry.prototype}\n字面意思：${entry.literal}\n实际意思：${entry.actual}\n语法解释：${entry.grammar}`;

      result.push({
        id: createLegacyObstacleId('comprehension', entry.displayPhrase || entry.baseForm, occurrence),
        engineId: createObstacleId('comprehension', subtitleItem.id, entry.baseForm, start, occurrence),
        subtitleId: subtitleItem.id,
        type: 'comprehension',
        kind: 'understanding',
        label: '理解',
        surfaceText: match.surfaceText,
        baseForm: entry.baseForm,
        explanation,
        start,
        end,
        index: start,
        phrase: entry.displayPhrase || entry.baseForm,
        source: match.surfaceText,
        prototype: entry.prototype,
        literal: entry.literal,
        actual: entry.actual,
        grammar: entry.grammar,
      });

      return result;
    }, []);
  }

  function normalizeSubtitleItems(subtitleItems) {
    return (subtitleItems || []).map((item, index) => ({
      id: item.id ?? `subtitle-${index + 1}`,
      text: String(item.text || ''),
      start: Number.isFinite(item.start) ? item.start : 0,
      end: Number.isFinite(item.end) ? item.end : Number.isFinite(item.start) ? item.start + String(item.text || '').length : String(item.text || '').length,
    }));
  }

  function analyzeSubtitleItems(subtitleItems, options = {}) {
    const occurrenceCounts = new Map();
    const levelName = options.level || DEFAULT_VOCABULARY_LEVEL;
    const customWords = options.customWords || [];

    return normalizeSubtitleItems(subtitleItems).flatMap((subtitleItem) => [
      ...buildVocabObstacles(subtitleItem, levelName, customWords, occurrenceCounts),
      ...buildComprehensionObstacles(subtitleItem, occurrenceCounts),
    ]).sort((firstObstacle, secondObstacle) => firstObstacle.start - secondObstacle.start);
  }

  global.AnalyzeEngine = {
    analyzeSubtitleItems,
    levels: vocabularyLevels,
    vocabularyMockEntries,
    comprehensionMockEntries,
    isSingleVocabularyUnit,
    isComprehensionStructure,
  };
}(typeof window !== 'undefined' ? window : globalThis));
