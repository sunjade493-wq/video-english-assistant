#!/usr/bin/env python3
"""
V29A rule-based obstacle generator for Video English Assistant.

Input:
    output_text/v28d_bilingual_subtitles.csv

Outputs:
    output_text/v29a_obstacles.json
    output_text/v29a_obstacles.csv

This script is intentionally self-contained.  It does not import or depend on
previous pipeline stages other than reading the V28D bilingual subtitle CSV.
"""

from __future__ import annotations

import csv
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple

VERSION = "v29a"
INPUT_CSV = Path("output_text/v28d_bilingual_subtitles.csv")
OUTPUT_JSON = Path("output_text/v29a_obstacles.json")
OUTPUT_CSV = Path("output_text/v29a_obstacles.csv")

OUTPUT_FIELDS = [
    "start",
    "end",
    "type",
    "priority",
    "text",
    "word",
    "lemma",
    "phonetic",
    "partOfSpeech",
    "sentenceMeaning",
    "translation",
    "literal",
    "actual",
    "grammar",
    "source_en",
    "source_zh",
]

VOCAB_REQUIRED_FIELDS = (
    "word",
    "lemma",
    "phonetic",
    "partOfSpeech",
    "sentenceMeaning",
    "translation",
)

# ---------------------------------------------------------------------------
# Vocabulary Dictionary
# ---------------------------------------------------------------------------
# Required shape for every entry: word, lemma, phonetic, partOfSpeech, sentenceMeaning, translation. baseForm is legacy-compatible output only.
# Keep this rule library inside this file so V29A can be restored even when no
# historical generator files are present in the working tree.

POS_DISPLAY_BY_SOURCE = {
    "noun": "n.",
    "pronoun": "pron.",
    "adjective": "adj.",
    "adverb": "adv.",
    "preposition": "prep.",
    "conjunction": "conj.",
    "interjection": "interj.",
    "determiner": "det.",
    "numeral": "num.",
    "transitive verb": "vt.",
    "intransitive verb": "vi.",
    "auxiliary verb": "aux. v.",
    "modal verb": "modal v.",
    "linking verb": "linking v.",
    "verb with both transitive and intransitive usage": "vt./vi.",
}

POS_DISPLAY_OVERRIDES_BY_WORD = {
    "alone": "adj./adv.",
    "believe": "vt./vi.",
    "consummate": "adj./vt.",
    "develop": "vt./vi.",
    "interlock": "vt./vi.",
    "lecture": "n./vi./vt.",
    "official": "adj./n.",
    "outside": "adv./adj./prep./n.",
    "project": "n./vi./vt.",
    "pull": "n./vi./vt.",
    "order": "n./vi./vt.",
    "sleep": "n./vi.",
    "start": "n./vi./vt.",
    "suppose": "vt./vi.",
    "unravel": "vt./vi.",
}

SUPPORTED_POS_DISPLAY_FORMATS = {
    "n.",
    "pron.",
    "adj.",
    "adv.",
    "prep.",
    "conj.",
    "interj.",
    "det.",
    "num.",
    "vt.",
    "vi.",
    "vt./vi.",
    "n./vt.",
    "n./vi.",
    "n./vi./vt.",
    "adj./n.",
    "adj./vt.",
    "adj./adv.",
    "adv./adj.",
    "adv./adj./prep./n.",
    "aux. v.",
    "modal v.",
    "linking v.",
}

POS_CANONICAL_COMBINATIONS = {
    ("n.", "vt."): "n./vt.",
    ("vt.", "n."): "n./vt.",
    ("n.", "vi."): "n./vi.",
    ("vi.", "n."): "n./vi.",
    ("n.", "vi.", "vt."): "n./vi./vt.",
    ("n.", "vt.", "vi."): "n./vi./vt.",
    ("vi.", "n.", "vt."): "n./vi./vt.",
    ("vi.", "vt.", "n."): "n./vi./vt.",
    ("vt.", "n.", "vi."): "n./vi./vt.",
    ("vt.", "vi.", "n."): "n./vi./vt.",
    ("n.", "adj.", "adv.", "prep."): "adv./adj./prep./n.",
    ("n.", "adj.", "prep.", "adv."): "adv./adj./prep./n.",
    ("n.", "adv.", "adj.", "prep."): "adv./adj./prep./n.",
    ("n.", "adv.", "prep.", "adj."): "adv./adj./prep./n.",
    ("n.", "prep.", "adj.", "adv."): "adv./adj./prep./n.",
    ("n.", "prep.", "adv.", "adj."): "adv./adj./prep./n.",
    ("adj.", "n.", "adv.", "prep."): "adv./adj./prep./n.",
    ("adj.", "n.", "prep.", "adv."): "adv./adj./prep./n.",
    ("adj.", "adv.", "n.", "prep."): "adv./adj./prep./n.",
    ("adj.", "adv.", "prep.", "n."): "adv./adj./prep./n.",
    ("adj.", "prep.", "n.", "adv."): "adv./adj./prep./n.",
    ("adj.", "prep.", "adv.", "n."): "adv./adj./prep./n.",
    ("adv.", "n.", "adj.", "prep."): "adv./adj./prep./n.",
    ("adv.", "n.", "prep.", "adj."): "adv./adj./prep./n.",
    ("adv.", "adj.", "n.", "prep."): "adv./adj./prep./n.",
    ("adv.", "adj.", "prep.", "n."): "adv./adj./prep./n.",
    ("adv.", "prep.", "n.", "adj."): "adv./adj./prep./n.",
    ("adv.", "prep.", "adj.", "n."): "adv./adj./prep./n.",
    ("prep.", "n.", "adj.", "adv."): "adv./adj./prep./n.",
    ("prep.", "n.", "adv.", "adj."): "adv./adj./prep./n.",
    ("prep.", "adj.", "n.", "adv."): "adv./adj./prep./n.",
    ("prep.", "adj.", "adv.", "n."): "adv./adj./prep./n.",
    ("prep.", "adv.", "n.", "adj."): "adv./adj./prep./n.",
    ("prep.", "adv.", "adj.", "n."): "adv./adj./prep./n.",
    ("adj.", "adv."): "adj./adv.",
    ("adv.", "adj."): "adv./adj.",
    ("vt.", "vi."): "vt./vi.",
    ("vi.", "vt."): "vt./vi.",
}


def normalize_part_of_speech(entry: Dict[str, str]) -> str:
    """Return the frozen display-ready POS format for a vocabulary entry."""
    word_key = str(entry.get("word", "")).strip().lower()
    if word_key in POS_DISPLAY_OVERRIDES_BY_WORD:
        return POS_DISPLAY_OVERRIDES_BY_WORD[word_key]

    source = str(entry.get("partOfSpeech", "")).strip()
    source_key = source.lower()
    if source_key in POS_DISPLAY_BY_SOURCE:
        return POS_DISPLAY_BY_SOURCE[source_key]
    if source in SUPPORTED_POS_DISPLAY_FORMATS:
        return source

    if "/" in source:
        parts = []
        for part in source.split("/"):
            normalized_part = POS_DISPLAY_BY_SOURCE.get(part.strip().lower(), part.strip())
            if normalized_part:
                parts.append(normalized_part)
        canonical = POS_CANONICAL_COMBINATIONS.get(tuple(parts))
        if canonical:
            return canonical

    raise ValueError(f"Unsupported partOfSpeech for {entry.get('word', '<unknown>')}: {source!r}")

VOCABULARY_DICTIONARY: List[Dict[str, str]] = [
    {"word": 'considering', "lemma": 'considering', "baseForm": 'considering', "surfaceForms": 'considering', "phonetic": '/kənˈsɪdərɪŋ/', "partOfSpeech": 'preposition', "sentenceMeaning": '考虑到', "translation": '考虑到；鉴于'},
    {"word": 'official', "lemma": 'official', "baseForm": 'official', "surfaceForms": 'official', "phonetic": '/əˈfɪʃəl/', "partOfSpeech": 'adjective', "sentenceMeaning": '正式的', "translation": '官方的；正式的；官员'},
    {"word": 'tradition', "lemma": 'tradition', "baseForm": 'tradition', "surfaceForms": 'tradition', "phonetic": '/trəˈdɪʃən/', "partOfSpeech": 'noun', "sentenceMeaning": '传统', "translation": '传统；惯例'},
    {"word": 'consummate', "lemma": 'consummate', "baseForm": 'consummate', "surfaceForms": 'consummated', "phonetic": '/ˈkɑːnsəmeɪt/', "partOfSpeech": 'verb', "sentenceMeaning": '圆房', "translation": '圆房；完成；使圆满'},
    {"word": 'appropriate', "lemma": 'appropriate', "baseForm": 'appropriate', "surfaceForms": 'appropriate', "phonetic": '/əˈproʊpriət/', "partOfSpeech": 'adjective', "sentenceMeaning": '合适的', "translation": '合适的；恰当的'},
    {"word": 'metaphor', "lemma": 'metaphor', "baseForm": 'metaphor', "surfaceForms": 'metaphor', "phonetic": '/ˈmetəfɔːr/', "partOfSpeech": 'noun', "sentenceMeaning": '比喻', "translation": '隐喻；比喻'},
    {"word": 'marital', "lemma": 'marital', "baseForm": 'marital', "surfaceForms": 'marital', "phonetic": '/ˈmærɪtl/', "partOfSpeech": 'adjective', "sentenceMeaning": '婚姻的', "translation": '婚姻的；夫妻的'},
    {"word": 'congress', "lemma": 'congress', "baseForm": 'congress', "surfaceForms": 'congress', "phonetic": '/ˈkɑːŋɡrəs/', "partOfSpeech": 'noun', "sentenceMeaning": '圆房', "translation": '国会；大会；交合（委婉/正式）'},
    {"word": 'interlock', "lemma": 'interlock', "baseForm": 'interlock', "surfaceForms": 'interlock', "phonetic": '/ˌɪntərˈlɑːk/', "partOfSpeech": 'verb', "sentenceMeaning": '扣合', "translation": '互锁；扣在一起；咬合'},
    {"word": 'satisfying', "lemma": 'satisfying', "baseForm": 'satisfying', "surfaceForms": 'satisfying', "phonetic": '/ˈsætɪsfaɪɪŋ/', "partOfSpeech": 'adjective', "sentenceMeaning": '令人满足的', "translation": '令人满足的；令人满意的'},
    {"word": 'order', "lemma": 'order', "baseForm": 'order', "surfaceForms": 'ordered', "phonetic": '/ˈɔːrdər/', "partOfSpeech": 'verb', "sentenceMeaning": '点餐', "translation": '命令；点餐；订购；顺序'},
    {"word": 'universe', "lemma": 'universe', "baseForm": 'universe', "surfaceForms": 'universe', "phonetic": '/ˈjuːnɪvɜːrs/', "partOfSpeech": 'noun', "sentenceMeaning": '宇宙', "translation": '宇宙；万物'},
    {"word": 'dense', "lemma": 'dense', "baseForm": 'dense', "surfaceForms": 'dense', "phonetic": '/dens/', "partOfSpeech": 'adjective', "sentenceMeaning": '稠密的', "translation": '密集的；浓密的；难懂的'},
    {"word": 'expansion', "lemma": 'expansion', "baseForm": 'expansion', "surfaceForms": 'expansion', "phonetic": '/ɪkˈspænʃən/', "partOfSpeech": 'noun', "sentenceMeaning": '膨胀', "translation": '扩张；膨胀；展开'},
    {"word": 'autotroph', "lemma": 'autotroph', "baseForm": 'autotroph', "surfaceForms": 'autotrophs', "phonetic": '/ˈɔːtoʊtroʊf/', "partOfSpeech": 'noun', "sentenceMeaning": '自养生物', "translation": '自养生物'},
    {"word": 'Neanderthal', "lemma": 'Neanderthal', "baseForm": 'Neanderthal', "surfaceForms": 'Neanderthals', "phonetic": '/niˈændərˌtɑːl/', "partOfSpeech": 'noun', "sentenceMeaning": '尼安德特人', "translation": '尼安德特人'},
    {"word": 'develop', "lemma": 'develop', "baseForm": 'develop', "surfaceForms": 'developed', "phonetic": '/dɪˈveləp/', "partOfSpeech": 'verb', "sentenceMeaning": '发明', "translation": '发展；发明；形成'},
    {"word": 'pyramid', "lemma": 'pyramid', "baseForm": 'pyramid', "surfaceForms": 'pyramids', "phonetic": '/ˈpɪrəmɪd/', "partOfSpeech": 'noun', "sentenceMeaning": '金字塔', "translation": '金字塔'},
    {"word": 'unravel', "lemma": 'unravel', "baseForm": 'unravel', "surfaceForms": 'unraveling', "phonetic": '/ʌnˈrævəl/', "partOfSpeech": 'verb', "sentenceMeaning": '解开', "translation": '解开；阐明；逐渐崩解'},
    {"word": 'mystery', "lemma": 'mystery', "baseForm": 'mystery', "surfaceForms": 'mystery', "phonetic": '/ˈmɪstəri/', "partOfSpeech": 'noun', "sentenceMeaning": '谜团', "translation": '谜；神秘的事物'},
    {"word": 'honeymoon', "lemma": 'honeymoon', "baseForm": 'honeymoon', "surfaceForms": 'honeymoon', "phonetic": '/ˈhʌnimuːn/', "partOfSpeech": 'noun', "sentenceMeaning": '蜜月', "translation": '蜜月'},
    {"word": 'believe', "lemma": 'believe', "baseForm": 'believe', "surfaceForms": 'believe', "phonetic": '/bɪˈliːv/', "partOfSpeech": 'verb', "sentenceMeaning": '相信', "translation": '相信；认为'},
    {"word": 'bedsheet', "lemma": 'bedsheet', "baseForm": 'bedsheet', "surfaceForms": 'bedsheets', "phonetic": '/ˈbedʃiːt/', "partOfSpeech": 'noun', "sentenceMeaning": '床单', "translation": '床单'},
    {"word": 'outside', "lemma": 'outside', "baseForm": 'outside', "surfaceForms": 'outside', "phonetic": '/ˌaʊtˈsaɪd/', "partOfSpeech": 'adverb', "sentenceMeaning": '外面', "translation": '在外面；外部'},
    {"word": 'suppose', "lemma": 'suppose', "baseForm": 'suppose', "surfaceForms": 'suppose', "phonetic": '/səˈpoʊz/', "partOfSpeech": 'verb', "sentenceMeaning": '认为', "translation": '认为；假设；料想'},
    {"word": 'perfect', "lemma": 'perfect', "baseForm": 'perfect', "surfaceForms": 'perfect', "phonetic": '/ˈpɜːrfɪkt/', "partOfSpeech": 'adjective', "sentenceMeaning": '完美的', "translation": '完美的；完全的'},
    {"word": 'sleep', "lemma": 'sleep', "baseForm": 'sleep', "surfaceForms": 'sleeping', "phonetic": '/sliːp/', "partOfSpeech": 'verb', "sentenceMeaning": '睡觉', "translation": '睡觉；睡眠'},
    {"word": 'alone', "lemma": 'alone', "baseForm": 'alone', "surfaceForms": 'alone', "phonetic": '/əˈloʊn/', "partOfSpeech": 'adjective', "sentenceMeaning": '独处的', "translation": '独自；单独'},
    {"word": 'room service', "lemma": 'room service', "baseForm": 'room service', "surfaceForms": 'room service', "phonetic": '/ˈruːm ˌsɜːrvɪs/', "partOfSpeech": 'noun', "sentenceMeaning": '客房服务', "translation": '客房送餐服务'},
    {"word": 'hot', "lemma": 'hot', "baseForm": 'hot', "surfaceForms": 'hot', "phonetic": '/hɑːt/', "partOfSpeech": 'adjective', "sentenceMeaning": '热的', "translation": '热的；热门的'},
    {"word": 'state', "lemma": 'state', "baseForm": 'state', "surfaceForms": 'state', "phonetic": '/steɪt/', "partOfSpeech": 'noun', "sentenceMeaning": '状态', "translation": '状态；州；陈述'},
    {"word": 'snap', "lemma": 'snap', "baseForm": 'snap', "surfaceForms": 'snap', "phonetic": '/snæp/', "partOfSpeech": 'noun', "sentenceMeaning": '咔哒声', "translation": '咔哒声；猛然折断；迅速动作'},
    {"word": 'start', "lemma": 'start', "baseForm": 'start', "surfaceForms": 'started', "phonetic": '/stɑːrt/', "partOfSpeech": 'verb', "sentenceMeaning": '开始', "translation": '开始；开端'},
]

# ---------------------------------------------------------------------------
# Comprehension Patterns
# ---------------------------------------------------------------------------
# Required shape for every entry: literal, actual, grammar.
COMPREHENSION_PATTERNS: List[Dict[str, str]] = [
    {
        "text": "Can you believe",
        "literal": "你能相信吗",
        "actual": "表示惊讶、难以置信，相当于“你敢信吗？”",
        "grammar": "Can you believe + 从句/名词短语；反问式口语开场，用来强化情绪。",
    },
    {
        "text": "I can't believe",
        "literal": "我不能相信",
        "actual": "我真不敢相信；强调说话人惊讶或不满。",
        "grammar": "I can't believe + 从句/宾语；否定情态动词表达强烈主观反应。",
    },
    {
        "text": "According to tradition",
        "literal": "根据传统",
        "actual": "按习俗来说；引出某个传统规定或社会惯例。",
        "grammar": "According to + 名词；介词短语作状语，说明信息依据。",
    },
    {
        "text": "hang the bedsheets outside",
        "literal": "把床单挂到外面",
        "actual": "指按传统展示床单，语境里带有婚俗和尴尬的喜剧效果。",
        "grammar": "hang + 宾语 + 地点副词；祈使/不定式结构中常省略主语。",
    },
    {
        "text": "we consummated",
        "literal": "我们完成了",
        "actual": "委婉地说夫妻圆房、完成婚姻关系。",
        "grammar": "consummate 可作及物或不及物动词；过去式表示已完成的行为。",
    },
    {
        "text": "where we're starting our honeymoon",
        "literal": "我们开始蜜月的地方",
        "actual": "说明蜜月旅程从哪里开始，where 引导地点从句。",
        "grammar": "where + 主语 + be + -ing；现在进行时表示计划中的近未来安排。",
    },
    {
        "text": "I suppose you're right",
        "literal": "我假设你是对的",
        "actual": "我想你说得对；带有让步、勉强同意的语气。",
        "grammar": "I suppose + 宾语从句；弱化语气，比 I think 更犹豫。",
    },
    {
        "text": "the perfect metaphor for",
        "literal": "……的完美隐喻",
        "actual": "用某物来非常贴切地象征另一件事。",
        "grammar": "metaphor for + 名词/动名词；for 标记隐喻指向的对象。",
    },
    {
        "text": "interlock with a satisfying snap",
        "literal": "带着令人满意的咔哒声互锁",
        "actual": "形容两个部件严丝合缝地扣上，声音让人觉得到位。",
        "grammar": "interlock with + 名词短语；with 表示伴随方式或伴随结果。",
    },
    {
        "text": "While you were sleeping",
        "literal": "当你正在睡觉的时候",
        "actual": "趁你睡着时；说明另一件事发生的时间背景。",
        "grammar": "While + 主语 + 过去进行时；背景动作与主句动作同时发生。",
    },
    {
        "text": "ordered room service",
        "literal": "点了客房服务",
        "actual": "在酒店叫了送餐/客房服务。",
        "grammar": "order + 名词；order 在餐饮场景中表示“点餐/订购”。",
    },
    {
        "text": "you thought it was going to be food",
        "literal": "你以为它将会是食物",
        "actual": "制造反差：听者以为叫的是吃的，但实际不是。",
        "grammar": "thought + 宾语从句；was going to be 表示过去视角下的将来。",
    },
    {
        "text": "our whole universe was in a hot, dense state",
        "literal": "我们的整个宇宙处于一个热而密集的状态",
        "actual": "大爆炸理论开场，描述早期宇宙高温高密度状态。",
        "grammar": "be in a/an + 形容词 + state；state 表示抽象状态。",
    },
    {
        "text": "expansion started",
        "literal": "膨胀开始了",
        "actual": "指宇宙开始扩张。",
        "grammar": "名词 + 不及物动词过去式；简洁叙述事件发生。",
    },
    {
        "text": "That all started with",
        "literal": "那一切都开始于",
        "actual": "说明一连串事情的起点或原因。",
        "grammar": "start with + 名词/动名词；with 引出起点、开端或触发因素。",
    },
    {
        "text": "get all this alone time",
        "literal": "得到所有这些独处时间",
        "actual": "获得这么多二人/独处时间，语气通常带期待或调侃。",
        "grammar": "get + 名词短语；all this 修饰不可数/抽象时间，强调数量。",
    },
    {
        "text": "marital congress",
        "literal": "婚姻大会/婚姻性交",
        "actual": "非常正式或滑稽地指夫妻性行为。",
        "grammar": "形容词 marital 修饰名词 congress；congress 在此为委婉旧式用法。",
    },
    {
        "text": "a hot, dense state",
        "literal": "一个热而密集的状态",
        "actual": "描述物理状态，不是日常“热闹”的意思。",
        "grammar": "冠词 + 并列形容词 + 名词；逗号连接同级形容词。",
    },
    {
        "text": "with a satisfying snap",
        "literal": "伴随着令人满意的咔哒声",
        "actual": "用声音说明动作完成得干脆、到位。",
        "grammar": "with + 名词短语作方式/伴随状语。",
    },
    {
        "text": "whole universe",
        "literal": "整个宇宙",
        "actual": "强调整体范围，常见于科学解释或夸张表达。",
        "grammar": "whole 放在名词前表示“整个的”，常与 the/our 连用。",
    },
]


@dataclass(frozen=True)
class SubtitleRow:
    start: str
    end: str
    source_en: str
    source_zh: str
    row_index: int


def normalize_text(value: str) -> str:
    """Normalize apostrophes, whitespace, and case for matching."""
    value = (value or "").replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    value = re.sub(r"\s+", " ", value).strip()
    return value


def compact_for_phrase(value: str) -> str:
    """Lowercase text with punctuation converted to single spaces."""
    value = normalize_text(value).lower()
    value = re.sub(r"[^a-z0-9']+", " ", value)
    return re.sub(r"\s+", " ", value).strip()



V26F_EXCLUDED_COMPREHENSION_OBSTACLES = {
    compact_for_phrase(text)
    for text in (
        "Can you believe",
        "Are you serious",
        "Would you mind",
        "Do you know",
        "I think so",
        "I hope so",
        "I guess so",
        "Thank you",
        "Good morning",
    )
}


def makeVocabularyDedupKey(obstacle: Dict[str, object]) -> Tuple[str, str, str]:
    """Return the frozen episode-level vocabulary dedupe key."""
    return (
        normalize_text(str(obstacle.get("word", ""))).lower(),
        normalize_text(str(obstacle.get("partOfSpeech", ""))).lower(),
        normalize_text(str(obstacle.get("sentenceMeaning", ""))).lower(),
    )


def makeComprehensionDedupKey(obstacle: Dict[str, object]) -> str:
    """Return the frozen episode-level comprehension dedupe key.

    Prefer prototype, then normalizedText, baseForm, phrase, and finally text.
    """
    for field in ("prototype", "normalizedText", "baseForm", "phrase", "text"):
        value = normalize_text(str(obstacle.get(field, "")))
        if value:
            return compact_for_phrase(value)
    return ""


def dedupeEpisodeLearningItems(obstacles: Iterable[Dict[str, object]]) -> List[Dict[str, object]]:
    """Dedupe sorted episode learning items while preserving first occurrence."""
    seen_vocabulary = set()
    seen_comprehension = set()
    deduped: List[Dict[str, object]] = []

    for obstacle in obstacles:
        obstacle_type = obstacle.get("type")
        if obstacle_type == "vocabulary":
            key = makeVocabularyDedupKey(obstacle)
            if key in seen_vocabulary:
                continue
            seen_vocabulary.add(key)
        elif obstacle_type == "comprehension":
            key = makeComprehensionDedupKey(obstacle)
            if key in seen_comprehension:
                continue
            seen_comprehension.add(key)
        deduped.append(obstacle)

    return deduped


def field_value(row: Dict[str, str], candidates: Sequence[str]) -> str:
    """Return the first non-empty field from a flexible list of header names."""
    lower_map = {str(key).strip().lower(): value for key, value in row.items() if key is not None}
    for candidate in candidates:
        if candidate in row and str(row[candidate]).strip():
            return str(row[candidate]).strip()
        value = lower_map.get(candidate.lower())
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


def read_subtitle_rows(path: Path) -> List[SubtitleRow]:
    if not path.exists():
        raise FileNotFoundError(f"Input CSV not found: {path}")

    with path.open("r", encoding="utf-8-sig", newline="") as file_obj:
        reader = csv.DictReader(file_obj)
        if not reader.fieldnames:
            raise ValueError(f"Input CSV has no header row: {path}")

        rows: List[SubtitleRow] = []
        for index, row in enumerate(reader, start=1):
            start = field_value(row, ["start", "start_time", "start_seconds", "begin", "from"])
            end = field_value(row, ["end", "end_time", "end_seconds", "stop", "to"])
            source_en = field_value(
                row,
                [
                    "source_en",
                    "english",
                    "en",
                    "text_en",
                    "subtitle_en",
                    "sentence_en",
                    "original_en",
                    "v28_en",
                    "line_en",
                ],
            )
            source_zh = field_value(
                row,
                [
                    "source_zh",
                    "chinese",
                    "zh",
                    "cn",
                    "text_zh",
                    "subtitle_zh",
                    "sentence_zh",
                    "translation",
                    "translation_zh",
                    "v28_zh",
                    "line_zh",
                ],
            )

            if not source_en:
                # Conservative fallback: choose the longest mostly-ASCII text field
                # that is not a timecode.  This keeps the generator usable across
                # V28D header variants without relying on another source file.
                candidates = []
                for key, value in row.items():
                    value = str(value or "").strip()
                    if not value or key is None:
                        continue
                    lowered = key.strip().lower()
                    if lowered in {"start", "end", "start_time", "end_time", "index", "id"}:
                        continue
                    ascii_letters = sum(1 for char in value if "a" <= char.lower() <= "z")
                    if ascii_letters:
                        candidates.append((ascii_letters, len(value), value))
                if candidates:
                    source_en = max(candidates)[2]

            if start or end or source_en or source_zh:
                rows.append(
                    SubtitleRow(
                        start=start,
                        end=end,
                        source_en=normalize_text(source_en),
                        source_zh=normalize_text(source_zh),
                        row_index=index,
                    )
                )
        return rows


def word_pattern(word: str) -> re.Pattern[str]:
    """Build a case-insensitive pattern for a vocabulary word or phrase."""
    escaped_parts = [re.escape(part) for part in normalize_text(word).split()]
    body = r"\s+".join(escaped_parts)
    return re.compile(rf"(?<![A-Za-z]){body}(?![A-Za-z])", re.IGNORECASE)


def phrase_matches(pattern_text: str, source_en: str) -> bool:
    """Return True if a comprehension pattern appears in the English subtitle."""
    pattern_norm = compact_for_phrase(pattern_text)
    source_norm = compact_for_phrase(source_en)
    if not pattern_norm or not source_norm:
        return False
    if pattern_norm in source_norm:
        return True

    # Allow one or more spaces in the rule to match punctuation/pauses in the subtitle.
    regex = r"(?<![a-z0-9])" + r"[\s,.;:!?\-—–]+".join(re.escape(p) for p in pattern_norm.split()) + r"(?![a-z0-9])"
    return re.search(regex, source_norm, re.IGNORECASE) is not None


def parse_sortable_time(value: str) -> Tuple[int, float, str]:
    """Return a stable sortable key for numeric, SRT-style, or blank times."""
    text = str(value or "").strip()
    if not text:
        return (1, 0.0, text)

    numeric = text.replace(",", ".")
    try:
        return (0, float(numeric), text)
    except ValueError:
        pass

    match = re.match(r"^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[,.](\d{1,3}))?$", text)
    if match:
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2))
        seconds = int(match.group(3))
        millis = int((match.group(4) or "0").ljust(3, "0")[:3])
        total = hours * 3600 + minutes * 60 + seconds + millis / 1000
        return (0, total, text)

    return (2, 0.0, text)


def blank_obstacle(row: SubtitleRow, obstacle_type: str, priority: int, text: str) -> Dict[str, object]:
    return {
        "start": row.start,
        "end": row.end,
        "type": obstacle_type,
        "priority": priority,
        "text": text,
        "word": "",
        "lemma": "",
        "baseForm": "",
        "phonetic": "",
        "partOfSpeech": "",
        "sentenceMeaning": "",
        "translation": "",
        "literal": "",
        "actual": "",
        "grammar": "",
        "source_en": row.source_en,
        "source_zh": row.source_zh,
    }


def generate_vocabulary_obstacles(rows: Iterable[SubtitleRow]) -> List[Dict[str, object]]:
    compiled = []
    for entry in VOCABULARY_DICTIONARY:
        surface_forms = [form.strip() for form in str(entry.get("surfaceForms", entry["word"])).split("|") if form.strip()]
        compiled.append((entry, [word_pattern(form) for form in surface_forms]))
    obstacles: List[Dict[str, object]] = []

    for row in rows:
        seen_in_row = set()
        for entry, patterns in compiled:
            if entry["word"].lower() in seen_in_row:
                continue
            if any(pattern.search(row.source_en) for pattern in patterns):
                seen_in_row.add(entry["word"].lower())
                obstacle = blank_obstacle(row, "vocabulary", 1, entry["word"])
                obstacle.update(
                    {
                        "word": entry["word"],
                        "lemma": entry["lemma"],
                        "baseForm": entry["baseForm"],
                        "phonetic": entry["phonetic"],
                        "partOfSpeech": normalize_part_of_speech(entry),
                        "sentenceMeaning": entry["sentenceMeaning"],
                        "translation": entry["translation"],
                    }
                )
                obstacles.append(obstacle)
    return obstacles


def generate_comprehension_obstacles(rows: Iterable[SubtitleRow]) -> List[Dict[str, object]]:
    obstacles: List[Dict[str, object]] = []

    for row in rows:
        seen_in_row = set()
        for pattern in COMPREHENSION_PATTERNS:
            text = pattern["text"]
            key = compact_for_phrase(text)
            if key in V26F_EXCLUDED_COMPREHENSION_OBSTACLES:
                continue
            if key in seen_in_row:
                continue
            if phrase_matches(text, row.source_en):
                seen_in_row.add(key)
                obstacle = blank_obstacle(row, "comprehension", 2, text)
                obstacle.update(
                    {
                        "literal": pattern["literal"],
                        "actual": pattern["actual"],
                        "grammar": pattern["grammar"],
                    }
                )
                obstacles.append(obstacle)
    return obstacles


def sort_obstacles(obstacles: List[Dict[str, object]]) -> List[Dict[str, object]]:
    return sorted(
        obstacles,
        key=lambda item: (
            int(item["priority"]),
            parse_sortable_time(str(item.get("start", ""))),
            str(item.get("text", "")).lower(),
        ),
    )


def validate_vocab_obstacle(obstacle: Dict[str, object]) -> None:
    if obstacle.get("type") != "vocabulary":
        return

    for field in VOCAB_REQUIRED_FIELDS:
        value = obstacle.get(field)
        if value is None or str(value).strip() == "":
            raise ValueError(f"Vocabulary obstacle missing {field}: {obstacle!r}")

    part_of_speech = str(obstacle.get("partOfSpeech", "")).strip()
    if part_of_speech not in SUPPORTED_POS_DISPLAY_FORMATS:
        raise ValueError(f"Vocabulary obstacle has unsupported partOfSpeech: {obstacle!r}")


def validate_vocab_obstacles(obstacles: Iterable[Dict[str, object]]) -> None:
    for obstacle in obstacles:
        validate_vocab_obstacle(obstacle)


def write_json(path: Path, obstacles: List[Dict[str, object]]) -> None:
    validate_vocab_obstacles(obstacles)
    payload = {
        "version": VERSION,
        "input": str(INPUT_CSV),
        "obstacle_count": len(obstacles),
        "obstacles": obstacles,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file_obj:
        json.dump(payload, file_obj, ensure_ascii=False, indent=2)
        file_obj.write("\n")


def write_csv(path: Path, obstacles: List[Dict[str, object]]) -> None:
    validate_vocab_obstacles(obstacles)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as file_obj:
        writer = csv.DictWriter(file_obj, fieldnames=OUTPUT_FIELDS, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        for obstacle in obstacles:
            writer.writerow({field: obstacle.get(field, "") for field in OUTPUT_FIELDS})


def validate_rule_libraries() -> None:
    required_vocab = {
        "considering",
        "official",
        "tradition",
        "consummate",
        "appropriate",
        "metaphor",
        "marital",
        "congress",
        "interlock",
        "satisfying",
        "order",
        "universe",
        "dense",
        "expansion",
        "autotroph",
        "neanderthal",
        "develop",
        "pyramid",
        "unravel",
        "mystery",
        "honeymoon",
    }
    present_vocab = {entry.get("word", "").lower() for entry in VOCABULARY_DICTIONARY}
    missing_vocab = sorted(required_vocab - present_vocab)
    if missing_vocab:
        raise RuntimeError(f"Vocabulary Dictionary missing required words: {', '.join(missing_vocab)}")

    required_patterns = {
        "can you believe",
        "i can't believe",
        "according to tradition",
        "hang the bedsheets outside",
        "we consummated",
        "where we're starting our honeymoon",
        "i suppose you're right",
        "the perfect metaphor for",
        "interlock with a satisfying snap",
        "while you were sleeping",
        "ordered room service",
        "you thought it was going to be food",
        "our whole universe was in a hot, dense state",
        "expansion started",
        "that all started with",
        "get all this alone time",
    }
    present_patterns = {pattern.get("text", "").lower() for pattern in COMPREHENSION_PATTERNS}
    missing_patterns = sorted(required_patterns - present_patterns)
    if missing_patterns:
        raise RuntimeError(f"Comprehension Patterns missing required expressions: {', '.join(missing_patterns)}")

    for entry in VOCABULARY_DICTIONARY:
        for key in VOCAB_REQUIRED_FIELDS:
            if not entry.get(key):
                raise RuntimeError(f"Vocabulary entry missing {key}: {entry!r}")
        normalize_part_of_speech(entry)

    for pattern in COMPREHENSION_PATTERNS:
        for key in ("literal", "actual", "grammar"):
            if not pattern.get(key):
                raise RuntimeError(f"Comprehension pattern missing {key}: {pattern!r}")


def generate_obstacles(rows: Sequence[SubtitleRow]) -> List[Dict[str, object]]:
    obstacles = generate_vocabulary_obstacles(rows)
    obstacles.extend(generate_comprehension_obstacles(rows))
    return dedupeEpisodeLearningItems(sort_obstacles(obstacles))


def main() -> int:
    validate_rule_libraries()
    try:
        rows = read_subtitle_rows(INPUT_CSV)
        obstacles = generate_obstacles(rows)
        write_json(OUTPUT_JSON, obstacles)
        write_csv(OUTPUT_CSV, obstacles)
    except Exception as exc:  # Keep runtime errors visible for pipeline logs.
        print(f"[V29A] ERROR: {exc}", file=sys.stderr)
        return 1

    print(f"[V29A] Input: {INPUT_CSV}")
    print(f"[V29A] Obstacles generated: {len(obstacles)}")
    print(f"[V29A] JSON: {OUTPUT_JSON}")
    print(f"[V29A] CSV: {OUTPUT_CSV}")
    if len(obstacles) < 20:
        print("[V29A] ERROR: fewer than 20 obstacles generated; rule-library coverage check failed.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())