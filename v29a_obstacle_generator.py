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
    "phonetic",
    "translation",
    "literal",
    "actual",
    "grammar",
    "source_en",
    "source_zh",
]

# ---------------------------------------------------------------------------
# Vocabulary Dictionary
# ---------------------------------------------------------------------------
# Required shape for every entry: word, phonetic, translation.
# Keep this rule library inside this file so V29A can be restored even when no
# historical generator files are present in the working tree.
VOCABULARY_DICTIONARY: List[Dict[str, str]] = [
    {"word": "considering", "phonetic": "/kənˈsɪdərɪŋ/", "translation": "考虑到；鉴于"},
    {"word": "official", "phonetic": "/əˈfɪʃəl/", "translation": "官方的；正式的；官员"},
    {"word": "tradition", "phonetic": "/trəˈdɪʃən/", "translation": "传统；惯例"},
    {"word": "consummated", "phonetic": "/ˈkɑːnsəmeɪtɪd/", "translation": "圆房；完成；使圆满"},
    {"word": "appropriate", "phonetic": "/əˈproʊpriət/", "translation": "合适的；恰当的"},
    {"word": "metaphor", "phonetic": "/ˈmetəfɔːr/", "translation": "隐喻；比喻"},
    {"word": "marital", "phonetic": "/ˈmærɪtl/", "translation": "婚姻的；夫妻的"},
    {"word": "congress", "phonetic": "/ˈkɑːŋɡrəs/", "translation": "国会；大会；交合（委婉/正式）"},
    {"word": "interlock", "phonetic": "/ˌɪntərˈlɑːk/", "translation": "互锁；扣在一起；咬合"},
    {"word": "satisfying", "phonetic": "/ˈsætɪsfaɪɪŋ/", "translation": "令人满足的；令人满意的"},
    {"word": "ordered", "phonetic": "/ˈɔːrdərd/", "translation": "点了；订购了；命令了；有序的"},
    {"word": "universe", "phonetic": "/ˈjuːnɪvɜːrs/", "translation": "宇宙；万物"},
    {"word": "dense", "phonetic": "/dens/", "translation": "密集的；浓密的；难懂的"},
    {"word": "expansion", "phonetic": "/ɪkˈspænʃən/", "translation": "扩张；膨胀；展开"},
    {"word": "autotrophs", "phonetic": "/ˈɔːtoʊtroʊfs/", "translation": "自养生物"},
    {"word": "Neanderthals", "phonetic": "/niˈændərˌtɑːlz/", "translation": "尼安德特人"},
    {"word": "developed", "phonetic": "/dɪˈveləpt/", "translation": "发展了；形成了；发达的"},
    {"word": "pyramids", "phonetic": "/ˈpɪrəmɪdz/", "translation": "金字塔"},
    {"word": "unraveling", "phonetic": "/ʌnˈrævəlɪŋ/", "translation": "解开；阐明；逐渐崩解"},
    {"word": "mystery", "phonetic": "/ˈmɪstəri/", "translation": "谜；神秘的事物"},
    {"word": "honeymoon", "phonetic": "/ˈhʌnimuːn/", "translation": "蜜月"},
    {"word": "believe", "phonetic": "/bɪˈliːv/", "translation": "相信；认为"},
    {"word": "bedsheets", "phonetic": "/ˈbedʃiːts/", "translation": "床单"},
    {"word": "outside", "phonetic": "/ˌaʊtˈsaɪd/", "translation": "在外面；外部"},
    {"word": "suppose", "phonetic": "/səˈpoʊz/", "translation": "认为；假设；料想"},
    {"word": "perfect", "phonetic": "/ˈpɜːrfɪkt/", "translation": "完美的；完全的"},
    {"word": "sleeping", "phonetic": "/ˈsliːpɪŋ/", "translation": "睡觉；睡着的"},
    {"word": "alone", "phonetic": "/əˈloʊn/", "translation": "独自；单独"},
    {"word": "room service", "phonetic": "/ˈruːm ˌsɜːrvɪs/", "translation": "客房送餐服务"},
    {"word": "hot", "phonetic": "/hɑːt/", "translation": "热的；热门的"},
    {"word": "state", "phonetic": "/steɪt/", "translation": "状态；州；陈述"},
    {"word": "snap", "phonetic": "/snæp/", "translation": "咔哒声；猛然折断；迅速动作"},
    {"word": "started", "phonetic": "/ˈstɑːrtɪd/", "translation": "开始了"},
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
        "phonetic": "",
        "translation": "",
        "literal": "",
        "actual": "",
        "grammar": "",
        "source_en": row.source_en,
        "source_zh": row.source_zh,
    }


def generate_vocabulary_obstacles(rows: Iterable[SubtitleRow]) -> List[Dict[str, object]]:
    compiled = [(entry, word_pattern(entry["word"])) for entry in VOCABULARY_DICTIONARY]
    obstacles: List[Dict[str, object]] = []

    for row in rows:
        seen_in_row = set()
        for entry, pattern in compiled:
            if entry["word"].lower() in seen_in_row:
                continue
            if pattern.search(row.source_en):
                seen_in_row.add(entry["word"].lower())
                obstacle = blank_obstacle(row, "vocabulary", 1, entry["word"])
                obstacle.update(
                    {
                        "word": entry["word"],
                        "phonetic": entry["phonetic"],
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


def write_json(path: Path, obstacles: List[Dict[str, object]]) -> None:
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
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as file_obj:
        writer = csv.DictWriter(file_obj, fieldnames=OUTPUT_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for obstacle in obstacles:
            writer.writerow({field: obstacle.get(field, "") for field in OUTPUT_FIELDS})


def validate_rule_libraries() -> None:
    required_vocab = {
        "considering",
        "official",
        "tradition",
        "consummated",
        "appropriate",
        "metaphor",
        "marital",
        "congress",
        "interlock",
        "satisfying",
        "ordered",
        "universe",
        "dense",
        "expansion",
        "autotrophs",
        "neanderthals",
        "developed",
        "pyramids",
        "unraveling",
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
        for key in ("word", "phonetic", "translation"):
            if not entry.get(key):
                raise RuntimeError(f"Vocabulary entry missing {key}: {entry!r}")

    for pattern in COMPREHENSION_PATTERNS:
        for key in ("literal", "actual", "grammar"):
            if not pattern.get(key):
                raise RuntimeError(f"Comprehension pattern missing {key}: {pattern!r}")


def generate_obstacles(rows: Sequence[SubtitleRow]) -> List[Dict[str, object]]:
    obstacles = generate_vocabulary_obstacles(rows)
    obstacles.extend(generate_comprehension_obstacles(rows))
    return sort_obstacles(obstacles)


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
