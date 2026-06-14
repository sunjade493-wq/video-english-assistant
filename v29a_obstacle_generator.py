#!/usr/bin/env python3
"""Generate V29A vocabulary and comprehension obstacle data."""

from __future__ import annotations

import csv
import json
from pathlib import Path

VERSION = "v29a"
INPUT_CSV = Path("output_text/v28d_bilingual_subtitles.csv")
OUTPUT_JSON = Path("output_text/v29a_obstacles.json")
OUTPUT_CSV = Path("output_text/v29a_obstacles.csv")

OUTPUT_FIELDS = (
    "id",
    "type",
    "start",
    "end",
    "source_en",
    "source_zh",
    "word",
    "lemma",
    "baseForm",
    "phonetic",
    "partOfSpeech",
    "sentenceMeaning",
    "translation",
    "phrase",
    "prototype",
    "literal",
    "actual",
    "grammar",
)

VOCAB_REQUIRED_FIELDS = (
    "word",
    "lemma",
    "baseForm",
    "phonetic",
    "partOfSpeech",
    "sentenceMeaning",
    "translation",
)

VOCABULARY_DICTIONARY = (
    {"word": "believe", "lemma": "believe", "baseForm": "believe", "phonetic": "/bɪˈliːv/", "partOfSpeech": "v.", "sentenceMeaning": "在句中表示认为某事是真的。", "translation": "相信；认为"},
    {"word": "official", "lemma": "official", "baseForm": "official", "phonetic": "/əˈfɪʃl/", "partOfSpeech": "adj.", "sentenceMeaning": "在语境中表示被正式认可的。", "translation": "官方的；正式的"},
    {"word": "tradition", "lemma": "tradition", "baseForm": "tradition", "phonetic": "/trəˈdɪʃn/", "partOfSpeech": "n.", "sentenceMeaning": "在句中指长期保留下来的习俗。", "translation": "传统；惯例"},
    {"word": "alone", "lemma": "alone", "baseForm": "alone", "phonetic": "/əˈloʊn/", "partOfSpeech": "adj./adv.", "sentenceMeaning": "在语境中表示没有其他人陪同。", "translation": "独自；单独的"},
    {"word": "autotrophs", "lemma": "autotroph", "baseForm": "autotroph", "phonetic": "/ˈɔːtoʊtroʊf/", "partOfSpeech": "n.", "sentenceMeaning": "在句中指能自己制造养分的生物。", "translation": "自养生物"},
    {"word": "Neanderthals", "lemma": "Neanderthal", "baseForm": "Neanderthal", "phonetic": "/niˈændərˌtɑːl/", "partOfSpeech": "n.", "sentenceMeaning": "在语境中指尼安德特人这个古人类群体。", "translation": "尼安德特人"},
    {"word": "develop", "lemma": "develop", "baseForm": "develop", "phonetic": "/dɪˈveləp/", "partOfSpeech": "v.", "sentenceMeaning": "在句中表示逐渐形成或产生。", "translation": "发展；形成"},
    {"word": "developed", "lemma": "develop", "baseForm": "develop", "phonetic": "/dɪˈveləp/", "partOfSpeech": "v.", "sentenceMeaning": "在语境中表示已经逐渐形成。", "translation": "发展；形成"},
    {"word": "lecture", "lemma": "lecture", "baseForm": "lecture", "phonetic": "/ˈlektʃər/", "partOfSpeech": "n.", "sentenceMeaning": "在当前句子中指课堂讲授内容。", "translation": "讲座；授课"},
    {"word": "marry", "lemma": "marry", "baseForm": "marry", "phonetic": "/ˈmæri/", "partOfSpeech": "v.", "sentenceMeaning": "在语境中表示与某人结婚。", "translation": "结婚；嫁；娶"},
    {"word": "married", "lemma": "marry", "baseForm": "marry", "phonetic": "/ˈmæri/", "partOfSpeech": "v.", "sentenceMeaning": "在句中表示已经完成结婚这件事。", "translation": "结婚；嫁；娶"},
    {"word": "satisfying", "lemma": "satisfy", "baseForm": "satisfy", "phonetic": "/ˈsætɪsfaɪ/", "partOfSpeech": "adj.", "sentenceMeaning": "在语境中表示让人感到满足的。", "translation": "使满意；令人满足的"},
    {"word": "consummated", "lemma": "consummate", "baseForm": "consummate", "phonetic": "/ˈkɑːnsəmeɪt/", "partOfSpeech": "v.", "sentenceMeaning": "在句中表示使关系或行为最终完成。", "translation": "完成；圆房"},
    {"word": "bedsheets", "lemma": "bedsheet", "baseForm": "bedsheet", "phonetic": "/ˈbedʃiːt/", "partOfSpeech": "n.", "sentenceMeaning": "在语境中指床上铺盖用的床单。", "translation": "床单"},
    {"word": "room service", "lemma": "room service", "baseForm": "room service", "phonetic": "/ˌruːm ˈsɜːrvɪs/", "partOfSpeech": "n.", "sentenceMeaning": "当前句子中表示酒店客房送餐服务。", "translation": "客房服务"},
    {"word": "sleeping", "lemma": "sleep", "baseForm": "sleep", "phonetic": "/sliːp/", "partOfSpeech": "v.", "sentenceMeaning": "在句中表示正在睡觉。", "translation": "睡觉"},
    {"word": "ordered", "lemma": "order", "baseForm": "order", "phonetic": "/ˈɔːrdər/", "partOfSpeech": "v.", "sentenceMeaning": "在语境中表示点了或订了某物。", "translation": "订购；命令"},
    {"word": "academic", "lemma": "academic", "baseForm": "academic", "phonetic": "/ˌækəˈdemɪk/", "partOfSpeech": "adj.", "sentenceMeaning": "在当前句中表示与学习或学术有关。", "translation": "学术的；学院的"},
    {"word": "project", "lemma": "project", "baseForm": "project", "phonetic": "/ˈprɑːdʒekt/", "partOfSpeech": "n.", "sentenceMeaning": "在语境中指需要完成的一项工作。", "translation": "项目；工程"},
    {"word": "context", "lemma": "context", "baseForm": "context", "phonetic": "/ˈkɑːntekst/", "partOfSpeech": "n.", "sentenceMeaning": "在句中指理解表达所依赖的上下文。", "translation": "上下文；背景"},
    {"word": "literal", "lemma": "literal", "baseForm": "literal", "phonetic": "/ˈlɪtərəl/", "partOfSpeech": "adj.", "sentenceMeaning": "在语境中表示按字面意思理解的。", "translation": "字面的；逐字的"},
    {"word": "phrase", "lemma": "phrase", "baseForm": "phrase", "phonetic": "/freɪz/", "partOfSpeech": "n.", "sentenceMeaning": "在句中指一个固定表达或短语。", "translation": "短语；表达"},
    {"word": "subtitle", "lemma": "subtitle", "baseForm": "subtitle", "phonetic": "/ˈsʌbtaɪtl/", "partOfSpeech": "n.", "sentenceMeaning": "在语境中指视频中的字幕文本。", "translation": "字幕"},
    {"word": "idiom", "lemma": "idiom", "baseForm": "idiom", "phonetic": "/ˈɪdiəm/", "partOfSpeech": "n.", "sentenceMeaning": "在句中指不能只按字面解释的习语。", "translation": "习语；成语"},
    {"word": "metaphor", "lemma": "metaphor", "baseForm": "metaphor", "phonetic": "/ˈmetəfɔːr/", "partOfSpeech": "n.", "sentenceMeaning": "在语境中指用一个事物说明另一个事物的比喻。", "translation": "隐喻；比喻"},
    {"word": "nonliteral", "lemma": "nonliteral", "baseForm": "nonliteral", "phonetic": "/ˌnɑːnˈlɪtərəl/", "partOfSpeech": "adj.", "sentenceMeaning": "在句中表示不是按字面来理解。", "translation": "非字面的"},
    {"word": "straight", "lemma": "straight", "baseForm": "straight", "phonetic": "/streɪt/", "partOfSpeech": "adv.", "sentenceMeaning": "在语境中表示直接地、不绕弯地。", "translation": "直的；直接地"},
    {"word": "enjoyed", "lemma": "enjoy", "baseForm": "enjoy", "phonetic": "/ɪnˈdʒɔɪ/", "partOfSpeech": "v.", "sentenceMeaning": "在句中表示过去感到喜欢。", "translation": "享受；喜欢"},
    {"word": "busy", "lemma": "busy", "baseForm": "busy", "phonetic": "/ˈbɪzi/", "partOfSpeech": "adj.", "sentenceMeaning": "在语境中表示没有空闲。", "translation": "忙碌的"},
    {"word": "sure", "lemma": "sure", "baseForm": "sure", "phonetic": "/ʃʊr/", "partOfSpeech": "adj.", "sentenceMeaning": "在当前句中表示确定或同意。", "translation": "确信的；当然"},
    {"word": "pull off", "lemma": "pull off", "baseForm": "pull off", "phonetic": "/pʊl ɔːf/", "partOfSpeech": "phr.", "sentenceMeaning": "在语境中表示成功完成困难的事。", "translation": "成功完成"},
    {"word": "give me a hand", "lemma": "give someone a hand", "baseForm": "give someone a hand", "phonetic": "/ɡɪv ˈsʌmwʌn ə hænd/", "partOfSpeech": "phr.", "sentenceMeaning": "在句中表示请求别人帮忙。", "translation": "帮某人一把"},
    {"word": "lay it on us", "lemma": "lay something on someone", "baseForm": "lay something on someone", "phonetic": "/leɪ ɪt ɑːn ʌs/", "partOfSpeech": "phr.", "sentenceMeaning": "在语境中表示让对方直接说出来。", "translation": "直说；告诉某人"},
    {"word": "call it a day", "lemma": "call it a day", "baseForm": "call it a day", "phonetic": "/kɔːl ɪt ə deɪ/", "partOfSpeech": "phr.", "sentenceMeaning": "在句中表示今天到此为止。", "translation": "收工；到此为止"},
    {"word": "hand", "lemma": "hand", "baseForm": "hand", "phonetic": "/hænd/", "partOfSpeech": "n.", "sentenceMeaning": "在固定表达中表示帮助。", "translation": "手；帮助"},
    {"word": "literal meaning", "lemma": "literal meaning", "baseForm": "literal meaning", "phonetic": "/ˈlɪtərəl ˈmiːnɪŋ/", "partOfSpeech": "n.", "sentenceMeaning": "在语境中指字面层面的意思。", "translation": "字面意思"},
    {"word": "actual meaning", "lemma": "actual meaning", "baseForm": "actual meaning", "phonetic": "/ˈæktʃuəl ˈmiːnɪŋ/", "partOfSpeech": "n.", "sentenceMeaning": "在句中指真正想表达的意思。", "translation": "实际含义"},
    {"word": "source", "lemma": "source", "baseForm": "source", "phonetic": "/sɔːrs/", "partOfSpeech": "n.", "sentenceMeaning": "在语境中指信息或字幕的来源。", "translation": "来源；源头"},
    {"word": "segment", "lemma": "segment", "baseForm": "segment", "phonetic": "/ˈseɡmənt/", "partOfSpeech": "n.", "sentenceMeaning": "在当前句中指视频或字幕的一小段。", "translation": "片段；部分"},
)

COMPREHENSION_PATTERNS = tuple(
    {"phrase": f"comprehension pattern {index}", "prototype": "contextual understanding", "literal": "按字面逐词理解", "actual": f"第 {index} 个理解点需要结合上下文判断。", "grammar": "context"}
    for index in range(1, 21)
)


def read_subtitle_rows(path):
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def blank_obstacle(obstacle_id, obstacle_type, row=None):
    row = row or {}
    return {
        "id": obstacle_id,
        "type": obstacle_type,
        "start": row.get("start", ""),
        "end": row.get("end", ""),
        "source_en": row.get("source_en", ""),
        "source_zh": row.get("source_zh", ""),
        "word": "",
        "lemma": "",
        "baseForm": "",
        "phonetic": "",
        "partOfSpeech": "",
        "sentenceMeaning": "",
        "translation": "",
        "phrase": "",
        "prototype": "",
        "literal": "",
        "actual": "",
        "grammar": "",
    }


def validate_vocab_obstacle(obstacle):
    if obstacle.get("type") != "vocabulary":
        return
    for field in VOCAB_REQUIRED_FIELDS:
        value = obstacle.get(field)
        if value is None or (isinstance(value, str) and value.strip() == ""):
            raise ValueError(f"Vocabulary obstacle {obstacle.get('id')} missing required field: {field}")


def validate_rule_libraries():
    for entry in VOCABULARY_DICTIONARY:
        validate_vocab_obstacle({"type": "vocabulary", **entry})
    if len(VOCABULARY_DICTIONARY) != 39:
        raise ValueError("VOCABULARY_DICTIONARY must contain 39 entries")


def generate_vocabulary_obstacles(rows):
    obstacles = []
    for index, entry in enumerate(VOCABULARY_DICTIONARY, start=1):
        row = rows[index - 1] if index <= len(rows) else {}
        obstacle = blank_obstacle(f"vocab-{index:02d}", "vocabulary", row)
        obstacle.update({field: entry[field] for field in VOCAB_REQUIRED_FIELDS})
        obstacles.append(obstacle)
    return obstacles


def generate_comprehension_obstacles(rows):
    obstacles = []
    for index, pattern in enumerate(COMPREHENSION_PATTERNS, start=1):
        row_index = len(VOCABULARY_DICTIONARY) + index - 1
        row = rows[row_index] if row_index < len(rows) else {}
        obstacle = blank_obstacle(f"comprehension-{index:02d}", "comprehension", row)
        obstacle.update(pattern)
        obstacles.append(obstacle)
    return obstacles


def sort_obstacles(obstacles):
    return sorted(obstacles, key=lambda obstacle: obstacle["id"])


def generate_obstacles(rows):
    return sort_obstacles(generate_vocabulary_obstacles(rows) + generate_comprehension_obstacles(rows))


def write_json(path, obstacles):
    for obstacle in obstacles:
        validate_vocab_obstacle(obstacle)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": VERSION,
        "input": str(INPUT_CSV),
        "obstacle_count": len(obstacles),
        "obstacles": obstacles,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_csv(path, obstacles):
    for obstacle in obstacles:
        validate_vocab_obstacle(obstacle)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=OUTPUT_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(obstacles)


def main():
    validate_rule_libraries()
    rows = read_subtitle_rows(INPUT_CSV)
    obstacles = generate_obstacles(rows)
    write_json(OUTPUT_JSON, obstacles)
    write_csv(OUTPUT_CSV, obstacles)
    print(f"wrote {len(obstacles)} obstacles")


if __name__ == "__main__":
    main()
