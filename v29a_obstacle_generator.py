#!/usr/bin/env python3
"""Generate V29A obstacle data with the V29F vocabulary schema."""

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Iterable

OUTPUT_DIR = Path("output_text")
JSON_OUTPUT = OUTPUT_DIR / "v29a_obstacles.json"
CSV_OUTPUT = OUTPUT_DIR / "v29a_obstacles.csv"

VOCAB_REQUIRED_FIELDS = (
    "word",
    "lemma",
    "baseForm",
    "phonetic",
    "partOfSpeech",
    "sentenceMeaning",
    "translation",
)

OUTPUT_FIELDS = (
    "id",
    "type",
    "word",
    "lemma",
    "baseForm",
    "phonetic",
    "partOfSpeech",
    "sentenceMeaning",
    "translation",
    "source_en",
    "source_zh",
    "start",
    "end",
)

VOCABULARY_DICTIONARY = (
    {"word": "sleeping", "lemma": "sleep", "baseForm": "sleep", "phonetic": "/sliːp/", "partOfSpeech": "v.", "sentenceMeaning": "当前句子中表示正在睡觉或处于睡眠状态。", "translation": "睡觉；睡眠"},
    {"word": "ordered", "lemma": "order", "baseForm": "order", "phonetic": "/ˈɔːrdər/", "partOfSpeech": "vt.", "sentenceMeaning": "当前句子中表示点餐、预订或下达了某个要求。", "translation": "命令；订购；点餐"},
    {"word": "satisfying", "lemma": "satisfy", "baseForm": "satisfy", "phonetic": "/ˈsætɪsfaɪ/", "partOfSpeech": "adj.", "sentenceMeaning": "当前句子中表示令人满足或让人有成就感。", "translation": "满足；使满意"},
    {"word": "consummated", "lemma": "consummate", "baseForm": "consummate", "phonetic": "/ˈkɑːnsəmeɪt/", "partOfSpeech": "vt.", "sentenceMeaning": "当前句子中表示最终完成或正式达成某件事。", "translation": "完成；使圆满；圆房"},
    {"word": "bedsheets", "lemma": "bedsheet", "baseForm": "bedsheet", "phonetic": "/ˈbedʃiːt/", "partOfSpeech": "n.", "sentenceMeaning": "当前句子中表示床上铺盖用的床单。", "translation": "床单"},
    {"word": "autotrophs", "lemma": "autotroph", "baseForm": "autotroph", "phonetic": "/ˈɔːtətrɑːf/", "partOfSpeech": "n.", "sentenceMeaning": "当前句子中表示能自行制造养分的自养生物。", "translation": "自养生物"},
    {"word": "Neanderthals", "lemma": "Neanderthal", "baseForm": "Neanderthal", "phonetic": "/niˈændərtɑːl/", "partOfSpeech": "n.", "sentenceMeaning": "当前句子中表示尼安德特人这一古人类群体。", "translation": "尼安德特人"},
    {"word": "room service", "lemma": "room service", "baseForm": "room service", "phonetic": "/ˈruːm sɜːrvɪs/", "partOfSpeech": "n.", "sentenceMeaning": "当前句子中表示“酒店客房送餐服务”。", "translation": "客房服务；送餐服务"},
)


def validate_vocab_obstacle(obstacle: dict) -> None:
    for field in VOCAB_REQUIRED_FIELDS:
        value = obstacle.get(field)
        if value is None or not str(value).strip():
            label = obstacle.get("word") or obstacle.get("id") or "<unknown>"
            raise ValueError(f"Incomplete vocab obstacle {label!r}: missing {field}")


def validate_rule_libraries() -> None:
    for entry in VOCABULARY_DICTIONARY:
        validate_vocab_obstacle(entry)
        if entry["baseForm"] != entry["lemma"]:
            raise ValueError(f"baseForm must equal lemma for {entry['word']!r}")


def blank_obstacle(obstacle_id: str, obstacle_type: str = "vocabulary") -> dict:
    obstacle = {field: "" for field in OUTPUT_FIELDS}
    obstacle["id"] = obstacle_id
    obstacle["type"] = obstacle_type
    return obstacle


def generate_vocabulary_obstacles() -> list[dict]:
    obstacles = []
    for index, entry in enumerate(VOCABULARY_DICTIONARY, start=1):
        obstacle = blank_obstacle(f"v29a-vocab-{index:03d}")
        for field in VOCAB_REQUIRED_FIELDS:
            obstacle[field] = entry[field]
        obstacle["source_en"] = entry["word"]
        obstacle["source_zh"] = entry["sentenceMeaning"]
        validate_vocab_obstacle(obstacle)
        obstacles.append(obstacle)
    return obstacles


def validate_vocab_obstacles(obstacles: Iterable[dict]) -> None:
    for obstacle in obstacles:
        if obstacle.get("type") == "vocabulary":
            validate_vocab_obstacle(obstacle)


def write_json(obstacles: list[dict]) -> None:
    validate_vocab_obstacles(obstacles)
    JSON_OUTPUT.write_text(json.dumps({"obstacles": obstacles}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_csv(obstacles: list[dict]) -> None:
    validate_vocab_obstacles(obstacles)
    with CSV_OUTPUT.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=OUTPUT_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(obstacles)


def main() -> None:
    validate_rule_libraries()
    obstacles = generate_vocabulary_obstacles()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    write_json(obstacles)
    write_csv(obstacles)
    print(f"Wrote {len(obstacles)} obstacles to {JSON_OUTPUT} and {CSV_OUTPUT}")


if __name__ == "__main__":
    main()
