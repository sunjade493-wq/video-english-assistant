#!/usr/bin/env python3
"""Generate V29A obstacle-flow data from V2.8D bilingual subtitles.

V29A is a rule-based prototype for Video English Assistant. It reads the
bilingual subtitle CSV produced by V2.8D and emits the first obstacle stream in
both JSON and CSV formats. The product currently freezes two obstacle types:
vocabulary obstacles and comprehension obstacles, with vocabulary ranked first.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Any, Iterable


DEFAULT_INPUT = Path("output_text/v28d_bilingual_subtitles.csv")
DEFAULT_OUT_JSON = Path("output_text/v29a_obstacles.json")
DEFAULT_OUT_CSV = Path("output_text/v29a_obstacles.csv")
VERSION = "v29a"

CSV_FIELDS = [
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

VOCABULARY_DICTIONARY = {
    "considering": "考虑到",
    "official": "正式的",
    "tradition": "传统",
    "consummated": "完成婚姻关系；圆房",
    "appropriate": "合适的",
    "metaphor": "隐喻",
    "marital": "婚姻的",
    "congress": "性交；正式会谈",
    "interlock": "互锁；扣合",
    "satisfying": "令人满足的",
    "ordered": "点了；订购了",
    "universe": "宇宙",
    "dense": "密集的",
    "expansion": "膨胀",
    "autotrophs": "自养生物",
    "Neanderthals": "尼安德塔人",
    "developed": "发展；发明",
    "pyramids": "金字塔",
    "unraveling": "解开；阐明",
    "mystery": "谜团",
    "honeymoon": "蜜月",
}

COMPREHENSION_PATTERNS = [
    {
        "pattern": "Can you believe",
        "literal": "你能相信……吗",
        "actual": "真不敢相信……",
        "grammar": "Can you believe ...? 常用于表达惊讶，不一定是真的询问对方能否相信。",
    },
    {
        "pattern": "I can't believe",
        "literal": "我不能相信……",
        "actual": "我真不敢相信……",
        "grammar": "I can't believe ... 用来表达惊讶、震惊或难以置信。",
    },
    {
        "pattern": "According to tradition",
        "literal": "根据传统",
        "actual": "按照传统来说",
        "grammar": "according to + 名词，表示“根据、按照”。",
    },
    {
        "pattern": "hang the bedsheets outside",
        "literal": "把床单挂在外面",
        "actual": "把床单挂在外面给别人看",
        "grammar": "hang something outside 表示把某物挂到外面。这里需要结合婚俗语境理解。",
    },
    {
        "pattern": "we consummated",
        "literal": "我们完成了",
        "actual": "我们圆房了 / 完成婚姻关系了",
        "grammar": "consummate a marriage 表示通过发生性关系使婚姻正式完成。",
    },
    {
        "pattern": "where we're starting our honeymoon",
        "literal": "我们开始蜜月的地方",
        "actual": "我们蜜月开始的这个地方",
        "grammar": "where 引导名词性/关系性表达，用来说明地点。",
    },
    {
        "pattern": "I suppose you're right",
        "literal": "我猜想你是对的",
        "actual": "你说得有道理",
        "grammar": "I suppose ... 表示较委婉地承认或同意。",
    },
    {
        "pattern": "the perfect metaphor for",
        "literal": "……的完美隐喻",
        "actual": "非常适合用来比喻……",
        "grammar": "metaphor for something 表示“某事物的隐喻/比喻”。",
    },
    {
        "pattern": "interlock with a satisfying snap",
        "literal": "伴随着令人满足的咔哒声互相扣合",
        "actual": "严丝合缝地扣在一起，还发出很爽的咔哒声",
        "grammar": "with + 名词短语 表示伴随状态。",
    },
    {
        "pattern": "While you were sleeping",
        "literal": "当你在睡觉的时候",
        "actual": "你睡觉的时候",
        "grammar": "while + 从句 表示某事发生的同时。",
    },
    {
        "pattern": "ordered room service",
        "literal": "订购了客房服务",
        "actual": "点了酒店送餐",
        "grammar": "room service 指酒店客房送餐服务。",
    },
    {
        "pattern": "you thought it was going to be food",
        "literal": "你以为它会是食物",
        "actual": "你还以为是吃的吧",
        "grammar": "was going to be 表示过去视角下的将来。",
    },
    {
        "pattern": "our whole universe was in a hot, dense state",
        "literal": "我们的整个宇宙处于一个热且密集的状态",
        "actual": "我们的宇宙曾经超热又超密",
        "grammar": "be in a ... state 表示处于某种状态。",
    },
    {
        "pattern": "expansion started",
        "literal": "膨胀开始了",
        "actual": "宇宙开始膨胀",
        "grammar": "名词 + started 表示某个过程开始。",
    },
    {
        "pattern": "That all started with",
        "literal": "那一切开始于……",
        "actual": "这一切都始于……",
        "grammar": "start with 表示“以……开始 / 始于……”。",
    },
    {
        "pattern": "get all this alone time",
        "literal": "得到所有这些独处时间",
        "actual": "终于有大把独处时间",
        "grammar": "alone time 表示一个人或两个人不被打扰的独处时间。",
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate V29A vocabulary and comprehension obstacles."
    )
    parser.add_argument(
        "--input",
        default=str(DEFAULT_INPUT),
        help=f"Input V2.8D bilingual subtitle CSV (default: {DEFAULT_INPUT})",
    )
    parser.add_argument(
        "--out-json",
        default=str(DEFAULT_OUT_JSON),
        help=f"Output obstacle JSON path (default: {DEFAULT_OUT_JSON})",
    )
    parser.add_argument(
        "--out-csv",
        default=str(DEFAULT_OUT_CSV),
        help=f"Output obstacle CSV path (default: {DEFAULT_OUT_CSV})",
    )
    return parser.parse_args()


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def parse_time(value: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Invalid subtitle timestamp: {value!r}") from exc


def word_pattern(word: str) -> re.Pattern[str]:
    return re.compile(rf"(?<![A-Za-z]){re.escape(word)}(?![A-Za-z])", re.IGNORECASE)


def phrase_pattern(phrase: str) -> re.Pattern[str]:
    escaped = re.escape(phrase)
    flexible_spaces = escaped.replace(r"\ ", r"\s+")
    return re.compile(rf"(?<![A-Za-z]){flexible_spaces}(?![A-Za-z])", re.IGNORECASE)


def read_subtitles(input_path: Path) -> list[dict[str, str]]:
    with input_path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        required_fields = {"start", "end", "zh", "en"}
        missing_fields = required_fields.difference(reader.fieldnames or [])
        if missing_fields:
            missing = ", ".join(sorted(missing_fields))
            raise ValueError(f"Input CSV is missing required field(s): {missing}")
        return list(reader)


def make_vocabulary_obstacle(
    row: dict[str, str], start: float, end: float, word: str, translation: str
) -> dict[str, Any]:
    return {
        "start": start,
        "end": end,
        "type": "vocabulary",
        "priority": 1,
        "word": word,
        "phonetic": "",
        "translation": translation,
        "source_en": row["en"],
        "source_zh": row["zh"],
    }


def make_comprehension_obstacle(
    row: dict[str, str], start: float, end: float, pattern: dict[str, str]
) -> dict[str, Any]:
    return {
        "start": start,
        "end": end,
        "type": "comprehension",
        "priority": 2,
        "text": pattern["pattern"],
        "literal": pattern["literal"],
        "actual": pattern["actual"],
        "grammar": pattern["grammar"],
        "source_en": row["en"],
        "source_zh": row["zh"],
    }


def scan_vocabulary(row: dict[str, str], start: float, end: float) -> list[dict[str, Any]]:
    source_en = row["en"]
    obstacles = []
    seen_words = set()
    for word, translation in VOCABULARY_DICTIONARY.items():
        key = word.casefold()
        if key in seen_words:
            continue
        if word_pattern(word).search(source_en):
            obstacles.append(make_vocabulary_obstacle(row, start, end, word, translation))
            seen_words.add(key)
    return obstacles


def scan_comprehension(row: dict[str, str], start: float, end: float) -> list[dict[str, Any]]:
    source_en = row["en"]
    obstacles = []
    seen_patterns = set()
    for pattern in COMPREHENSION_PATTERNS:
        pattern_text = pattern["pattern"]
        key = pattern_text.casefold()
        if key in seen_patterns:
            continue
        if phrase_pattern(pattern_text).search(source_en):
            obstacles.append(make_comprehension_obstacle(row, start, end, pattern))
            seen_patterns.add(key)
    return obstacles


def generate_obstacles(rows: Iterable[dict[str, str]]) -> list[dict[str, Any]]:
    obstacles = []
    for row_number, row in enumerate(rows, start=2):
        try:
            start = parse_time(row["start"])
            end = parse_time(row["end"])
        except ValueError as exc:
            raise ValueError(f"Invalid timestamp at CSV row {row_number}: {exc}") from exc

        normalized_row = {
            "start": row["start"],
            "end": row["end"],
            "zh": normalize_space(row["zh"]),
            "en": normalize_space(row["en"]),
        }
        row_obstacles = []
        row_obstacles.extend(scan_vocabulary(normalized_row, start, end))
        row_obstacles.extend(scan_comprehension(normalized_row, start, end))
        row_obstacles.sort(key=lambda obstacle: obstacle["priority"])
        obstacles.extend(row_obstacles)
    return obstacles


def build_payload(input_path: Path, obstacles: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "version": VERSION,
        "input": input_path.as_posix(),
        "obstacle_count": len(obstacles),
        "obstacles": obstacles,
    }


def obstacle_to_csv_row(obstacle: dict[str, Any]) -> dict[str, Any]:
    return {field: obstacle.get(field, "") for field in CSV_FIELDS}


def write_json(output_path: Path, payload: dict[str, Any]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as json_file:
        json.dump(payload, json_file, ensure_ascii=False, indent=2)
        json_file.write("\n")


def write_csv(output_path: Path, obstacles: list[dict[str, Any]]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for obstacle in obstacles:
            writer.writerow(obstacle_to_csv_row(obstacle))


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    out_json_path = Path(args.out_json)
    out_csv_path = Path(args.out_csv)

    rows = read_subtitles(input_path)
    obstacles = generate_obstacles(rows)
    payload = build_payload(input_path, obstacles)
    write_json(out_json_path, payload)
    write_csv(out_csv_path, obstacles)

    print(f"Generated {len(obstacles)} obstacles")
    print(f"JSON: {out_json_path}")
    print(f"CSV: {out_csv_path}")


if __name__ == "__main__":
    main()
