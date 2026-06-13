#!/usr/bin/env python3
"""Generate V29A rule-based learning obstacles from bilingual subtitles.

Default usage:
    py -3.11 v29a_obstacle_generator.py

The script reads V28D bilingual subtitle CSV rows and emits vocabulary and
comprehension obstacles in both JSON and CSV formats.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path
from typing import Any, Dict, Iterable, List, Pattern

DEFAULT_INPUT = "output_text/v28d_bilingual_subtitles.csv"
DEFAULT_OUT_JSON = "output_text/v29a_obstacles.json"
DEFAULT_OUT_CSV = "output_text/v29a_obstacles.csv"
VERSION = "v29a"

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

# Built-in V29A vocabulary dictionary. Keys are matched case-insensitively
# against the English subtitle text. Values are copied into obstacle fields.
VOCABULARY_DICTIONARY: Dict[str, Dict[str, str]] = {
    "absolutely": {
        "phonetic": "/ˈæbsəluːtli/",
        "translation": "绝对地；完全地",
        "literal": "完全地",
        "actual": "用于加强语气，表示非常肯定",
        "grammar": "副词；常用于回答或强调态度",
    },
    "actually": {
        "phonetic": "/ˈæktʃuəli/",
        "translation": "实际上；其实",
        "literal": "事实上",
        "actual": "常用于纠正、补充或引出真实情况",
        "grammar": "话语副词；可放句首、句中或句尾",
    },
    "amazing": {
        "phonetic": "/əˈmeɪzɪŋ/",
        "translation": "令人惊讶的；很棒的",
        "literal": "使人惊奇的",
        "actual": "口语中常表示非常好、非常厉害",
        "grammar": "形容词；修饰人、事物或体验",
    },
    "basically": {
        "phonetic": "/ˈbeɪsɪkli/",
        "translation": "基本上；大体上",
        "literal": "从基本层面来说",
        "actual": "用于概括核心意思或简化解释",
        "grammar": "话语副词；常用于句首",
    },
    "challenge": {
        "phonetic": "/ˈtʃælɪndʒ/",
        "translation": "挑战；难题",
        "literal": "挑战",
        "actual": "指需要努力解决的问题或任务",
        "grammar": "可作名词或动词；a challenge 表示一个挑战",
    },
    "complicated": {
        "phonetic": "/ˈkɑːmplɪkeɪtɪd/",
        "translation": "复杂的",
        "literal": "被复杂化的",
        "actual": "表示事情有很多部分，难以理解或处理",
        "grammar": "形容词；常接 be/get/seem",
    },
    "confusing": {
        "phonetic": "/kənˈfjuːzɪŋ/",
        "translation": "令人困惑的",
        "literal": "使人混乱的",
        "actual": "表示信息、情况或解释不清楚",
        "grammar": "-ing 形容词描述事物给人的感受",
    },
    "definitely": {
        "phonetic": "/ˈdefɪnətli/",
        "translation": "肯定；确实",
        "literal": "明确地",
        "actual": "表达强烈肯定或确认",
        "grammar": "副词；常放在助动词后或实义动词前",
    },
    "especially": {
        "phonetic": "/ɪˈspeʃəli/",
        "translation": "尤其；特别",
        "literal": "特别地",
        "actual": "突出某个对象、情况或原因",
        "grammar": "副词；常引出重点信息",
    },
    "eventually": {
        "phonetic": "/ɪˈventʃuəli/",
        "translation": "最终；最后",
        "literal": "在事件发展到最后时",
        "actual": "强调经过一段过程后的结果",
        "grammar": "时间副词；常与过去或将来语境搭配",
    },
    "exactly": {
        "phonetic": "/ɪɡˈzæktli/",
        "translation": "确切地；正是如此",
        "literal": "精确地",
        "actual": "可表示精确一致，也可表示强烈同意",
        "grammar": "副词；单独使用时相当于“没错”",
    },
    "figure out": {
        "phonetic": "/ˈfɪɡjər aʊt/",
        "translation": "弄明白；想出",
        "literal": "计算出来",
        "actual": "通过思考、尝试后理解或解决",
        "grammar": "动词短语；宾语可放中间或后面",
    },
    "focus": {
        "phonetic": "/ˈfoʊkəs/",
        "translation": "专注；焦点",
        "literal": "焦点",
        "actual": "表示注意力集中在某事上",
        "grammar": "可作名词或动词；focus on 表示专注于",
    },
    "important": {
        "phonetic": "/ɪmˈpɔːrtnt/",
        "translation": "重要的",
        "literal": "有重要性的",
        "actual": "表示值得重视、会产生影响",
        "grammar": "形容词；常用于 It is important to...",
    },
    "instead": {
        "phonetic": "/ɪnˈsted/",
        "translation": "代替；反而",
        "literal": "在其位置上",
        "actual": "表示不用前一个方案，而选择另一个",
        "grammar": "副词；instead of 后接名词、代词或动名词",
    },
    "literally": {
        "phonetic": "/ˈlɪtərəli/",
        "translation": "按字面；简直",
        "literal": "照字面地",
        "actual": "口语中常用于强调，并不一定真的按字面发生",
        "grammar": "副词；注意字面义和夸张用法的区别",
    },
    "meanwhile": {
        "phonetic": "/ˈmiːnwaɪl/",
        "translation": "与此同时",
        "literal": "在中间的时间里",
        "actual": "连接同一时间发生的另一件事",
        "grammar": "连接副词；常放句首并用逗号隔开",
    },
    "obviously": {
        "phonetic": "/ˈɑːbviəsli/",
        "translation": "显然；明显地",
        "literal": "明显地",
        "actual": "说话人认为信息很容易看出或理解",
        "grammar": "话语副词；可表达判断或态度",
    },
    "opportunity": {
        "phonetic": "/ˌɑːpərˈtuːnəti/",
        "translation": "机会",
        "literal": "机会",
        "actual": "指有利于做某事的时机或条件",
        "grammar": "名词；an opportunity to do something",
    },
    "particular": {
        "phonetic": "/pərˈtɪkjələr/",
        "translation": "特定的；特别的",
        "literal": "某一个特定的",
        "actual": "强调不是泛泛而谈，而是具体某个",
        "grammar": "形容词；in particular 表示尤其、特别",
    },
    "probably": {
        "phonetic": "/ˈprɑːbəbli/",
        "translation": "很可能；大概",
        "literal": "有较大可能地",
        "actual": "表达较高但不完全确定的可能性",
        "grammar": "概率副词；语气弱于 definitely",
    },
    "process": {
        "phonetic": "/ˈprɑːses/",
        "translation": "过程；处理",
        "literal": "过程",
        "actual": "指完成某事的一系列步骤",
        "grammar": "可作名词或动词；名词更常见",
    },
    "realize": {
        "phonetic": "/ˈriːəlaɪz/",
        "translation": "意识到；实现",
        "literal": "变得真实或明白",
        "actual": "常表示突然明白某个事实",
        "grammar": "及物动词；后可接 that 从句",
    },
    "recommend": {
        "phonetic": "/ˌrekəˈmend/",
        "translation": "推荐；建议",
        "literal": "推荐",
        "actual": "建议某人选择或做某事",
        "grammar": "动词；recommend doing 或 recommend that...",
    },
    "solution": {
        "phonetic": "/səˈluːʃn/",
        "translation": "解决方案；答案",
        "literal": "解决物",
        "actual": "解决问题的方法或结果",
        "grammar": "名词；solution to a problem",
    },
    "specific": {
        "phonetic": "/spəˈsɪfɪk/",
        "translation": "具体的；特定的",
        "literal": "明确指定的",
        "actual": "强调细节明确，不笼统",
        "grammar": "形容词；be specific about...",
    },
    "supposed to": {
        "phonetic": "/səˈpoʊzd tuː/",
        "translation": "应该；按理应当",
        "literal": "被认为要做",
        "actual": "表示规则、安排、预期或本该如此",
        "grammar": "be supposed to do；否定为 not supposed to",
    },
    "technically": {
        "phonetic": "/ˈteknɪkli/",
        "translation": "严格来说；技术上",
        "literal": "从技术层面来说",
        "actual": "指出按规则或细节看是这样，但现实可能不同",
        "grammar": "话语副词；常用于修正前后说法",
    },
    "therefore": {
        "phonetic": "/ˈðerfɔːr/",
        "translation": "因此；所以",
        "literal": "因为那个原因",
        "actual": "表示前面原因导致后面结论",
        "grammar": "连接副词；正式程度高于 so",
    },
    "unfortunately": {
        "phonetic": "/ʌnˈfɔːrtʃənətli/",
        "translation": "不幸的是；遗憾的是",
        "literal": "不幸运地",
        "actual": "引出坏消息或令人失望的情况",
        "grammar": "态度副词；常置于句首",
    },
}

COMPREHENSION_PATTERN_SPECS: List[Dict[str, str]] = [
    {
        "pattern": r"\b(be|am|is|are|was|were)\s+going\s+to\b",
        "text": "be going to 表示计划或即将发生",
        "literal": "正在去做某事",
        "actual": "这里通常不是“去某地”，而是表达打算、计划或根据迹象即将发生。",
        "grammar": "be going to + 动词原形；口语中也常缩成 gonna。",
    },
    {
        "pattern": r"\bgonna\b",
        "text": "gonna 是 going to 的口语弱读",
        "literal": "going to 的连读形式",
        "actual": "表示将要、打算；正式写作中应写作 going to。",
        "grammar": "gonna 后接动词原形；前面常省略或弱化 be 动词。",
    },
    {
        "pattern": r"\bwanna\b",
        "text": "wanna 是 want to 的口语弱读",
        "literal": "want to 的连读形式",
        "actual": "表示想要做某事；正式场合应写作 want to。",
        "grammar": "wanna 后接动词原形。",
    },
    {
        "pattern": r"\bgotta\b",
        "text": "gotta 是 have got to 的口语弱读",
        "literal": "got to 的连读形式",
        "actual": "表示必须、不得不，语气接近 have to。",
        "grammar": "gotta 后接动词原形。",
    },
    {
        "pattern": r"\bkind\s+of\b|\bkinda\b",
        "text": "kind of / kinda 表示程度缓和",
        "literal": "某一种",
        "actual": "口语中常表示“有点儿、算是”，让语气不那么绝对。",
        "grammar": "副词性短语；kinda 是非正式写法。",
    },
    {
        "pattern": r"\bsort\s+of\b|\bsorta\b",
        "text": "sort of / sorta 表示模糊或弱化判断",
        "literal": "某一类",
        "actual": "口语中表示“有点、某种程度上”，说话人不想说得太绝对。",
        "grammar": "副词性短语；sorta 是非正式写法。",
    },
    {
        "pattern": r"\bused\s+to\b",
        "text": "used to 表示过去常常或过去状态",
        "literal": "曾经使用去做",
        "actual": "强调过去如此，但现在通常已经不同。",
        "grammar": "used to + 动词原形；否定常为 didn't use to。",
    },
    {
        "pattern": r"\b(be|am|is|are|was|were)\s+used\s+to\b",
        "text": "be used to 表示习惯于",
        "literal": "被使用去做",
        "actual": "表示已经适应某事，不是 used to do 的“过去常常”。",
        "grammar": "be used to + 名词/代词/动名词。",
    },
    {
        "pattern": r"\bshould\s+have\s+\w+|\bshould've\s+\w+",
        "text": "should have 表示本应该做但可能没做",
        "literal": "应该已经做了",
        "actual": "常用于后悔、责备或回顾过去更好的选择。",
        "grammar": "should have + 过去分词；口语中缩写为 should've。",
    },
    {
        "pattern": r"\bwould\s+have\s+\w+|\bwould've\s+\w+",
        "text": "would have 表示过去假设结果",
        "literal": "将会已经做了",
        "actual": "常出现在虚拟语气中，表示如果条件满足，本来会发生的事。",
        "grammar": "would have + 过去分词。",
    },
    {
        "pattern": r"\bcould\s+have\s+\w+|\bcould've\s+\w+",
        "text": "could have 表示本可以或可能已经",
        "literal": "能够已经做了",
        "actual": "可表达过去有能力但未做，或对过去情况的推测。",
        "grammar": "could have + 过去分词。",
    },
    {
        "pattern": r"\bas\s+soon\s+as\b",
        "text": "as soon as 引导时间状语从句",
        "literal": "和……一样快",
        "actual": "表示“一……就……”，强调动作紧接发生。",
        "grammar": "as soon as + 从句；谈将来时从句常用一般现在时。",
    },
    {
        "pattern": r"\beven\s+though\b|\beven\s+if\b",
        "text": "even though / even if 表示让步",
        "literal": "即使那样 / 即使如果",
        "actual": "even though 偏事实让步；even if 偏假设条件。",
        "grammar": "引导让步状语从句；主句表达仍然成立的结果。",
    },
    {
        "pattern": r"\bin\s+case\b",
        "text": "in case 表示以防万一",
        "literal": "在某种情况里",
        "actual": "表示提前做准备，以防某种情况发生。",
        "grammar": "in case + 从句；不要直接等同于 if。",
    },
    {
        "pattern": r"\bnot\s+only\b.*\bbut\s+also\b",
        "text": "not only...but also... 表示递进并列",
        "literal": "不只是……而且也……",
        "actual": "强调后项通常比前项更进一步或同样重要。",
        "grammar": "连接两个平行成分；not only 置句首时可能倒装。",
    },
    {
        "pattern": r"\bthe\s+more\b.*\bthe\s+more\b",
        "text": "the more...the more... 表示越……越……",
        "literal": "更多……更多……",
        "actual": "表示两个变化同步增强或减弱。",
        "grammar": "the + 比较级, the + 比较级。",
    },
    {
        "pattern": r"\bthere\s+(is|are|was|were)\b",
        "text": "there be 句型表示存在",
        "literal": "那里是/有",
        "actual": "重点是说明某物或某事存在，而不是地点“那里”。",
        "grammar": "there be + 名词；be 动词与后面的名词数保持一致。",
    },
    {
        "pattern": r"\bit\s+(is|was|'s)\s+\w+\s+to\b",
        "text": "It is ... to ... 使用形式主语",
        "literal": "它是……去做……",
        "actual": "真正主语是不定式短语，it 只是占位。",
        "grammar": "It is/was + 形容词/名词 + to do。",
    },
    {
        "pattern": r"\bthere\s+(is|are|was|were)\s+no\s+way\b",
        "text": "there is no way 表示不可能或没办法",
        "literal": "没有道路",
        "actual": "口语中表示强烈否定：绝不可能、没办法。",
        "grammar": "there is no way + 从句/to do。",
    },
    {
        "pattern": r"\bmake\s+sure\b",
        "text": "make sure 表示确保",
        "literal": "制作确定",
        "actual": "意思是确认某事会发生或情况属实。",
        "grammar": "make sure + that 从句 / make sure to do。",
    },
    {
        "pattern": r"\btake\s+care\s+of\b",
        "text": "take care of 表示照顾或处理",
        "literal": "拿走关心",
        "actual": "可指照顾人，也可指处理任务或解决问题。",
        "grammar": "动词短语；of 后接名词或代词。",
    },
    {
        "pattern": r"\bcome\s+up\s+with\b",
        "text": "come up with 表示想出",
        "literal": "带着……上来",
        "actual": "表示提出想法、方案或答案。",
        "grammar": "动词短语；with 后接 idea/plan/solution 等。",
    },
]

COMPREHENSION_PATTERNS: List[Dict[str, Any]] = [
    {**item, "compiled": re.compile(item["pattern"], re.IGNORECASE)}
    for item in COMPREHENSION_PATTERN_SPECS
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate V29A vocabulary and comprehension obstacles."
    )
    parser.add_argument("--input", default=DEFAULT_INPUT, help="Input bilingual CSV path.")
    parser.add_argument("--out-json", default=DEFAULT_OUT_JSON, help="Output JSON path.")
    parser.add_argument("--out-csv", default=DEFAULT_OUT_CSV, help="Output CSV path.")
    return parser.parse_args()


def first_non_empty(row: Dict[str, str], candidates: Iterable[str]) -> str:
    normalized = {key.strip().lower(): value for key, value in row.items()}
    for candidate in candidates:
        value = normalized.get(candidate.lower())
        if value is not None and str(value).strip():
            return str(value).strip()
    return ""


def extract_subtitle_row(row: Dict[str, str]) -> Dict[str, str]:
    return {
        "start": first_non_empty(row, ["start", "start_time", "start_seconds", "begin"]),
        "end": first_non_empty(row, ["end", "end_time", "end_seconds", "finish"]),
        "source_en": first_non_empty(
            row,
            [
                "source_en",
                "english",
                "en",
                "text_en",
                "subtitle_en",
                "original",
                "text",
            ],
        ),
        "source_zh": first_non_empty(
            row,
            ["source_zh", "chinese", "zh", "text_zh", "subtitle_zh", "translation"],
        ),
    }


def read_subtitles(input_path: Path) -> List[Dict[str, str]]:
    with input_path.open("r", encoding="utf-8-sig", newline="") as file_obj:
        reader = csv.DictReader(file_obj)
        if reader.fieldnames is None:
            return []
        return [extract_subtitle_row(row) for row in reader]


def phrase_pattern(phrase: str) -> Pattern[str]:
    words = [re.escape(part) for part in phrase.split()]
    separator = r"[\s\-]+"
    return re.compile(r"(?<![A-Za-z])" + separator.join(words) + r"(?![A-Za-z])", re.IGNORECASE)


def make_empty_obstacle(row: Dict[str, str], obstacle_type: str, priority: int) -> Dict[str, Any]:
    return {
        "start": row["start"],
        "end": row["end"],
        "type": obstacle_type,
        "priority": priority,
        "text": "",
        "word": "",
        "phonetic": "",
        "translation": "",
        "literal": "",
        "actual": "",
        "grammar": "",
        "source_en": row["source_en"],
        "source_zh": row["source_zh"],
    }


def generate_vocabulary_obstacles(row: Dict[str, str]) -> List[Dict[str, Any]]:
    source_en = row["source_en"]
    obstacles: List[Dict[str, Any]] = []

    for word, info in VOCABULARY_DICTIONARY.items():
        match = phrase_pattern(word).search(source_en)
        if not match:
            continue

        obstacle = make_empty_obstacle(row, "vocabulary", 1)
        matched_text = match.group(0)
        obstacle.update(
            {
                "text": f"生词障碍：{matched_text}",
                "word": matched_text,
                "phonetic": info.get("phonetic", ""),
                "translation": info.get("translation", ""),
                "literal": info.get("literal", ""),
                "actual": info.get("actual", ""),
                "grammar": info.get("grammar", ""),
            }
        )
        obstacles.append(obstacle)

    return obstacles


def generate_comprehension_obstacles(row: Dict[str, str]) -> List[Dict[str, Any]]:
    source_en = row["source_en"]
    obstacles: List[Dict[str, Any]] = []

    for item in COMPREHENSION_PATTERNS:
        compiled: Pattern[str] = item["compiled"]
        match = compiled.search(source_en)
        if not match:
            continue

        obstacle = make_empty_obstacle(row, "comprehension", 2)
        obstacle.update(
            {
                "text": item["text"],
                "word": match.group(0),
                "literal": item["literal"],
                "actual": item["actual"],
                "grammar": item["grammar"],
            }
        )
        obstacles.append(obstacle)

    return obstacles


def start_sort_value(obstacle: Dict[str, Any]) -> float:
    start = str(obstacle.get("start", "")).strip()
    try:
        return float(start)
    except ValueError:
        parts = start.replace(",", ".").split(":")
        try:
            total = 0.0
            for part in parts:
                total = total * 60 + float(part)
            return total
        except ValueError:
            return 0.0


def generate_obstacles(rows: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    obstacles: List[Dict[str, Any]] = []
    seen = set()

    for row in rows:
        if not row["source_en"]:
            continue
        row_obstacles = generate_vocabulary_obstacles(row)
        row_obstacles.extend(generate_comprehension_obstacles(row))

        for obstacle in row_obstacles:
            key = (
                obstacle["start"],
                obstacle["end"],
                obstacle["type"],
                obstacle["word"].lower(),
                obstacle["text"],
            )
            if key in seen:
                continue
            seen.add(key)
            obstacles.append(obstacle)

    obstacles.sort(
        key=lambda item: (
            start_sort_value(item),
            str(item.get("end", "")),
            int(item.get("priority", 0)),
            str(item.get("type", "")),
            str(item.get("word", "")).lower(),
        )
    )
    return obstacles


def write_json(out_json: Path, obstacles: List[Dict[str, Any]], input_path: str) -> None:
    out_json.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": VERSION,
        "input": input_path,
        "obstacle_count": len(obstacles),
        "obstacles": obstacles,
    }
    with out_json.open("w", encoding="utf-8") as file_obj:
        json.dump(payload, file_obj, ensure_ascii=False, indent=2)
        file_obj.write("\n")


def write_csv(out_csv: Path, obstacles: List[Dict[str, Any]]) -> None:
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with out_csv.open("w", encoding="utf-8-sig", newline="") as file_obj:
        writer = csv.DictWriter(file_obj, fieldnames=OUTPUT_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for obstacle in obstacles:
            writer.writerow({field: obstacle.get(field, "") for field in OUTPUT_FIELDS})


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    out_json = Path(args.out_json)
    out_csv = Path(args.out_csv)

    rows = read_subtitles(input_path)
    obstacles = generate_obstacles(rows)
    write_json(out_json, obstacles, args.input)
    write_csv(out_csv, obstacles)
    print(f"Generated {len(obstacles)} obstacles")
    print(f"JSON: {out_json}")
    print(f"CSV: {out_csv}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
