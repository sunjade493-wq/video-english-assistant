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

  const dictionaryEntries = {
    lecture: {
      phonetic: '/ˈlektʃər/',
      partOfSpeech: 'n./vi./vt.',
      sentenceMeaning: '讲座',
    },
    academic: {
      phonetic: '/ˌækəˈdemɪk/',
      partOfSpeech: 'adj.',
      sentenceMeaning: '学术的',
    },
    project: {
      phonetic: '/ˈprɑːdʒekt/',
      partOfSpeech: 'n.',
      sentenceMeaning: '项目',
    },

    believe: {
      phonetic: '/bɪˈliːv/',
      partOfSpeech: 'vt./vi.',
      sentenceMeaning: '相信',
    },
    marry: {
      phonetic: '/ˈmæri/',
      partOfSpeech: 'vt./vi.',
      sentenceMeaning: '结婚；嫁；娶',
    },
    official: {
      phonetic: '/əˈfɪʃəl/',
      partOfSpeech: 'adj.',
      sentenceMeaning: '官方的；正式的',
    },
    alone: {
      phonetic: '/əˈloʊn/',
      partOfSpeech: 'adj./adv.',
      sentenceMeaning: '独自的；独自地',
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


  const posAliases = new Map([
    ['noun', 'n.'], ['n', 'n.'], ['pronoun', 'pron.'], ['pron', 'pron.'],
    ['adjective', 'adj.'], ['adj', 'adj.'], ['adverb', 'adv.'], ['adv', 'adv.'],
    ['preposition', 'prep.'], ['prep', 'prep.'], ['conjunction', 'conj.'], ['conj', 'conj.'],
    ['interjection', 'interj.'], ['interj', 'interj.'], ['determiner', 'det.'], ['det', 'det.'],
    ['numeral', 'num.'], ['num', 'num.'], ['transitive verb', 'vt.'], ['vt', 'vt.'],
    ['intransitive verb', 'vi.'], ['vi', 'vi.'], ['auxiliary verb', 'aux. v.'], ['aux v', 'aux. v.'], ['aux', 'aux. v.'],
    ['modal verb', 'modal v.'], ['modal v', 'modal v.'], ['modal', 'modal v.'],
    ['linking verb', 'linking v.'], ['linking v', 'linking v.'], ['linking', 'linking v.'],
  ]);

  function normalizePartOfSpeech(partOfSpeech) {
    const raw = String(partOfSpeech || '').trim().toLowerCase();
    if (!raw) return '';
    const compact = raw.replace(/\s+/g, ' ');
    if (compact === 'v.' || compact === 'v') return 'vt./vi.';
    return compact.split('/').map((part) => {
      const key = part.replace(/\./g, '').trim();
      return posAliases.get(key) || posAliases.get(part.trim()) || part.trim();
    }).filter(Boolean).join('/');
  }

  function lemmatizeWord(surfaceWord) {
    const word = normalizeWord(surfaceWord);
    const irregular = new Map([
      ['believed', 'believe'], ['believes', 'believe'], ['believing', 'believe'],
      ['married', 'marry'], ['marries', 'marry'], ['marrying', 'marry'],
    ]);
    if (irregular.has(word)) return irregular.get(word);
    if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
    if (word.length > 5 && word.endsWith('ying')) return `${word.slice(0, -4)}ie`;
    if (word.length > 4 && word.endsWith('ing')) return word.slice(0, -3);
    if (word.length > 3 && word.endsWith('ed')) return word.slice(0, -2);
    if (word.length > 3 && word.endsWith('es')) return word.slice(0, -2);
    if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
    return word;
  }

  function lookupDictionaryEntry(surfaceWord) {
    const lemma = lemmatizeWord(surfaceWord);
    const entry = dictionaryEntries[lemma] || createFallbackVocabEntry(lemma);
    return {
      ...entry,
      lemma,
      partOfSpeech: normalizePartOfSpeech(entry.partOfSpeech),
    };
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
      partOfSpeech: '待补充',
      sentenceMeaning: '待补充',
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
      const surfaceForm = normalizeWord(rawWordMatch[0]);
      const baseForm = lemmatizeWord(surfaceForm);

      if (!baseForm || knownWords.has(surfaceForm) || knownWords.has(baseForm)) {
        return result;
      }

      const entry = lookupDictionaryEntry(rawWordMatch[0]);
      const occurrenceKey = `vocab:${baseForm}`;
      if (occurrenceCounts.has(occurrenceKey)) {
        return result;
      }
      const occurrence = 0;
      occurrenceCounts.set(occurrenceKey, 1);
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
        explanation: `${baseForm} ${entry.phonetic || ''} ${entry.partOfSpeech || ''}`.trim() + `\n句中含义：${entry.sentenceMeaning}`,
        lemma: baseForm,
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

      const occurrenceKey = `comprehension:${entry.prototype}`;

      if (occurrenceCounts.has(occurrenceKey)) {
        return result;
      }

      const occurrence = 0;
      occurrenceCounts.set(occurrenceKey, 1);
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
    dictionaryEntries,
    comprehensionMockEntries,
  };
}(typeof window !== 'undefined' ? window : globalThis));
