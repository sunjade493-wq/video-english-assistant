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
  };

  const comprehensionMockEntries = [
    {
      id: 'lay-it-on-us',
      baseForm: 'lay it on us',
      prototype: 'Prototype expression',
      literal: '把它放到我们身上',
      actual: '把想说的话直接告诉我们；别拐弯抹角。',
      grammar: 'lay it on someone 是口语表达，常用于请求对方直接说出信息或要求。这里的 to lay it on us 是不定式短语，补充说明 too busy 后面省略语境中的动作。',
      patterns: ['lay it on us'],
    },
    {
      id: 'give-me-a-hand',
      baseForm: 'give me a hand',
      prototype: 'Prototype expression',
      literal: '给我一只手',
      actual: '帮我一下；搭把手。',
      grammar: 'give someone a hand 是口语表达，hand 在这里不是字面的一只手，而是表示帮助。',
      patterns: ['give me a hand'],
    },
    {
      id: 'pull-me-off-the-project',
      baseForm: 'pull me off the project',
      displayPhrase: 'pull off the project',
      prototype: 'Prototype expression',
      literal: '把我从项目上拉开',
      actual: '让我退出项目；把我从项目中撤下。',
      grammar: 'pull someone off something 是短语动词，表示把某人从某项任务、岗位或项目中撤下。字幕中的 pulled off the project 是被动形式。',
      patterns: [
        /\bpull(?:ed)?\s+(?:me\s+|[a-z]+\s+)?off\s+the\s+project\b/i,
      ],
    },
    {
      id: 'call-it-a-day',
      baseForm: 'call it a day',
      prototype: 'Prototype expression',
      literal: '把它叫作一天',
      actual: '今天到此为止；收工。',
      grammar: 'call it a day 是固定习语，常用于表示结束当天的工作或活动。',
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
  };
}(typeof window !== 'undefined' ? window : globalThis));
