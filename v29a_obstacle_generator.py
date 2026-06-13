#!/usr/bin/env python3
"""Generate v29a comprehension obstacles from bilingual subtitle CSV.

Default run:
    py -3.11 v29a_obstacle_generator.py

Input:
    output_text/v28d_bilingual_subtitles.csv

Outputs:
    output_text/v29a_obstacles.json
    output_text/v29a_obstacles.csv
"""

from __future__ import annotations

import csv
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

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


@dataclass(frozen=True)
class VocabularyEntry:
    word: str
    phonetic: str
    translation: str
    priority: int


@dataclass(frozen=True)
class PatternEntry:
    expression: str
    literal: str
    actual: str
    grammar: str
    priority: int


# Vocabulary dictionary rule library.
# Important: keep the full required list intact.  These entries are matched
# against the English subtitle line and emitted as vocabulary obstacles.
VOCABULARY_DICTIONARY: dict[str, VocabularyEntry] = {
    "considering": VocabularyEntry(
        word="considering",
        phonetic="/kənˈsɪdərɪŋ/",
        translation="考虑到；鉴于",
        priority=3,
    ),
    "official": VocabularyEntry(
        word="official",
        phonetic="/əˈfɪʃəl/",
        translation="官方的；正式的",
        priority=3,
    ),
    "tradition": VocabularyEntry(
        word="tradition",
        phonetic="/trəˈdɪʃən/",
        translation="传统；惯例",
        priority=3,
    ),
    "consummated": VocabularyEntry(
        word="consummated",
        phonetic="/ˈkɑːnsəmeɪtɪd/",
        translation="圆房；完成；使圆满",
        priority=5,
    ),
    "appropriate": VocabularyEntry(
        word="appropriate",
        phonetic="/əˈproʊpriət/",
        translation="合适的；恰当的",
        priority=3,
    ),
    "metaphor": VocabularyEntry(
        word="metaphor",
        phonetic="/ˈmetəfɔːr/",
        translation="隐喻；比喻",
        priority=4,
    ),
    "marital": VocabularyEntry(
        word="marital",
        phonetic="/ˈmærɪtl/",
        translation="婚姻的；夫妻的",
        priority=4,
    ),
    "congress": VocabularyEntry(
        word="congress",
        phonetic="/ˈkɑːŋɡrəs/",
        translation="国会；代表大会；正式会议",
        priority=3,
    ),
    "interlock": VocabularyEntry(
        word="interlock",
        phonetic="/ˌɪntərˈlɑːk/",
        translation="互相扣住；互锁",
        priority=4,
    ),
    "satisfying": VocabularyEntry(
        word="satisfying",
        phonetic="/ˈsætɪsfaɪɪŋ/",
        translation="令人满足的；令人满意的",
        priority=3,
    ),
    "ordered": VocabularyEntry(
        word="ordered",
        phonetic="/ˈɔːrdərd/",
        translation="点了；订购了；命令了",
        priority=3,
    ),
    "universe": VocabularyEntry(
        word="universe",
        phonetic="/ˈjuːnɪvɜːrs/",
        translation="宇宙；万物",
        priority=4,
    ),
    "dense": VocabularyEntry(
        word="dense",
        phonetic="/dens/",
        translation="密集的；浓密的；难懂的",
        priority=4,
    ),
    "expansion": VocabularyEntry(
        word="expansion",
        phonetic="/ɪkˈspænʃən/",
        translation="扩张；膨胀；扩展",
        priority=4,
    ),
    "autotrophs": VocabularyEntry(
        word="autotrophs",
        phonetic="/ˈɔːtoʊtroʊfs/",
        translation="自养生物",
        priority=5,
    ),
    "Neanderthals": VocabularyEntry(
        word="Neanderthals",
        phonetic="/niˈændərˌtɑːlz/",
        translation="尼安德特人",
        priority=5,
    ),
    "developed": VocabularyEntry(
        word="developed",
        phonetic="/dɪˈveləpt/",
        translation="发展了；形成了；发达的",
        priority=3,
    ),
    "pyramids": VocabularyEntry(
        word="pyramids",
        phonetic="/ˈpɪrəmɪdz/",
        translation="金字塔",
        priority=4,
    ),
    "unraveling": VocabularyEntry(
        word="unraveling",
        phonetic="/ʌnˈrævəlɪŋ/",
        translation="解开；阐明；逐渐瓦解",
        priority=4,
    ),
    "mystery": VocabularyEntry(
        word="mystery",
        phonetic="/ˈmɪstəri/",
        translation="谜；神秘事物",
        priority=4,
    ),
    "honeymoon": VocabularyEntry(
        word="honeymoon",
        phonetic="/ˈhʌnimuːn/",
        translation="蜜月",
        priority=3,
    ),
}


# Comprehension pattern rule library.
# Important: keep the full required list intact.  These entries are matched
# against the English subtitle line and emitted as comprehension obstacles.
COMPREHENSION_PATTERNS: list[PatternEntry] = [
    PatternEntry(
        expression="Can you believe",
        literal="你能相信吗",
        actual="用来表达惊讶：这件事太让人意外了。",
        grammar="Can you believe + something\n表示：说话人觉得某件事很难相信、很让人惊讶。",
        priority=4,
    ),
    PatternEntry(
        expression="I can't believe",
        literal="我不能相信",
        actual="我真不敢相信；我太惊讶了。",
        grammar="I can't believe + something\n表示：说话人对某件事感到非常惊讶或难以接受。",
        priority=4,
    ),
    PatternEntry(
        expression="According to tradition",
        literal="根据传统",
        actual="按照传统习俗来说。",
        grammar="According to + source\n表示：信息、做法或判断来自某个来源或依据。",
        priority=4,
    ),
    PatternEntry(
        expression="considering it's official",
        literal="考虑到它是正式的",
        actual="既然这件事已经正式确定了；鉴于它已经算正式了。",
        grammar="considering + sentence\n表示：把某个事实作为判断或行动的依据。",
        priority=4,
    ),
    PatternEntry(
        expression="hang the bedsheets outside",
        literal="把床单挂到外面",
        actual="把床单挂在外面给别人看；这里是在说一种婚礼或婚后传统。",
        grammar="hang something outside\n表示：把某物挂到外面展示或晾着。",
        priority=5,
    ),
    PatternEntry(
        expression="we consummated",
        literal="我们完成了",
        actual="我们圆房了；这里委婉地说婚后发生了性关系。",
        grammar="consummate a marriage / we consummated\n表示：婚姻通过夫妻性关系变得完整。",
        priority=5,
    ),
    PatternEntry(
        expression="where we're starting our honeymoon",
        literal="我们在哪里开始我们的蜜月",
        actual="我们蜜月第一站要去的地方。",
        grammar="where somebody is starting something\n表示：某件事开始发生的地点。",
        priority=4,
    ),
    PatternEntry(
        expression="I suppose you're right",
        literal="我假设你是对的",
        actual="我想你说得对；表示有点勉强地同意。",
        grammar="I suppose + sentence\n表示：说话人认为某事大概是真的，语气比 I think 更犹豫。",
        priority=4,
    ),
    PatternEntry(
        expression="the perfect metaphor for",
        literal="……的完美隐喻",
        actual="最能象征或比喻某件事的东西。",
        grammar="a metaphor for something\n表示：用一个东西来形象说明另一个东西。",
        priority=4,
    ),
    PatternEntry(
        expression="interlock with a satisfying snap",
        literal="带着令人满意的啪嗒声互相扣住",
        actual="两个东西啪嗒一声正好扣在一起；强调契合感。",
        grammar="interlock with + sound/effect\n表示：互相咬合、扣住，并伴随某种声音或效果。",
        priority=5,
    ),
    PatternEntry(
        expression="While you were sleeping",
        literal="当你正在睡觉的时候",
        actual="在你睡着的那段时间里。",
        grammar="While somebody was doing something\n表示：某人在做某事的同时，另一件事发生了。",
        priority=3,
    ),
    PatternEntry(
        expression="ordered room service",
        literal="命令了房间服务",
        actual="叫了客房送餐服务；让酒店把食物送到房间。",
        grammar="order room service\n表示：在酒店里叫客房送餐。",
        priority=4,
    ),
    PatternEntry(
        expression="you thought it was going to be food",
        literal="你以为它将会是食物",
        actual="你以为送来的会是吃的。",
        grammar="somebody thought it was going to be something\n表示：某人原本以为结果会是某样东西。",
        priority=4,
    ),
    PatternEntry(
        expression="our whole universe was in a hot, dense state",
        literal="我们的整个宇宙处在一个炽热、密集的状态",
        actual="整个宇宙曾经是又热又密的状态；这里是在引用宇宙大爆炸开头的说法。",
        grammar="something was in a + adjective + state\n表示：某物处于某种状态。",
        priority=5,
    ),
    PatternEntry(
        expression="expansion started",
        literal="扩张开始了",
        actual="宇宙开始膨胀。",
        grammar="something started\n表示：某个过程开始发生。",
        priority=4,
    ),
    PatternEntry(
        expression="That all started with",
        literal="那一切都从……开始",
        actual="这一切的起点是……。",
        grammar="That all started with something\n表示：一连串事情最初源于某个起点。",
        priority=4,
    ),
    PatternEntry(
        expression="get all this alone time",
        literal="得到所有这些独处时间",
        actual="有这么多两个人单独相处的时间。",
        grammar="get + time\n表示：获得、拥有某段可以用来做某事的时间。",
        priority=4,
    ),
]


def normalize_spaces(text: object) -> str:
    """Return a clean one-line string for matching and output."""
    if text is None:
        return ""
    return re.sub(r"\s+", " ", str(text).replace("\ufeff", " ")).strip()


def normalize_for_match(text: str) -> str:
    """Normalize text for case-insensitive phrase matching."""
    text = normalize_spaces(text).lower()
    text = text.replace("’", "'").replace("‘", "'")
    text = text.replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", text)


def row_value(row: dict[str, str], names: Iterable[str]) -> str:
    """Read the first non-empty value from possible CSV column names."""
    lowered = {normalize_spaces(key).lower(): value for key, value in row.items()}
    for name in names:
        value = lowered.get(name.lower(), "")
        if normalize_spaces(value):
            return normalize_spaces(value)
    return ""


def read_subtitles(path: Path) -> list[dict[str, str]]:
    """Read subtitle rows from UTF-8-SIG CSV input."""
    if not path.exists():
        raise FileNotFoundError(f"Input CSV not found: {path}")

    with path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        if not reader.fieldnames:
            raise ValueError(f"Input CSV has no header row: {path}")
        return [dict(row) for row in reader]


def build_vocabulary_obstacle(
    row: dict[str, str], entry: VocabularyEntry, source_en: str, source_zh: str
) -> dict[str, str]:
    """Create one vocabulary obstacle with the required output fields."""
    return {
        "start": row_value(row, ["start", "Start", "begin", "Begin"]),
        "end": row_value(row, ["end", "End", "finish", "Finish"]),
        "type": "vocabulary",
        "priority": str(entry.priority),
        "text": entry.word,
        "word": entry.word,
        "phonetic": entry.phonetic,
        "translation": entry.translation,
        "literal": "",
        "actual": "",
        "grammar": "",
        "source_en": source_en,
        "source_zh": source_zh,
    }


def build_pattern_obstacle(
    row: dict[str, str], entry: PatternEntry, source_en: str, source_zh: str
) -> dict[str, str]:
    """Create one comprehension obstacle with the required output fields."""
    return {
        "start": row_value(row, ["start", "Start", "begin", "Begin"]),
        "end": row_value(row, ["end", "End", "finish", "Finish"]),
        "type": "comprehension",
        "priority": str(entry.priority),
        "text": entry.expression,
        "word": "",
        "phonetic": "",
        "translation": "",
        "literal": entry.literal,
        "actual": entry.actual,
        "grammar": entry.grammar,
        "source_en": source_en,
        "source_zh": source_zh,
    }


def word_pattern(word: str) -> re.Pattern[str]:
    """Compile a whole-word matcher that keeps apostrophes inside words."""
    escaped = re.escape(word.lower())
    return re.compile(rf"(?<![a-z0-9']){escaped}(?![a-z0-9'])", re.IGNORECASE)


def phrase_in_text(phrase: str, text: str) -> bool:
    """Case-insensitive phrase matching with whitespace normalization."""
    return normalize_for_match(phrase) in normalize_for_match(text)


def generate_obstacles(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    """Generate vocabulary and comprehension obstacles for every subtitle row."""
    obstacles: list[dict[str, str]] = []
    seen: set[tuple[str, str, str, str]] = set()

    for row in rows:
        source_en = row_value(row, ["source_en", "en", "english", "subtitle_en", "text_en"])
        source_zh = row_value(row, ["source_zh", "zh", "chinese", "subtitle_zh", "text_zh"])
        normalized_en = normalize_for_match(source_en)

        for entry in COMPREHENSION_PATTERNS:
            if not phrase_in_text(entry.expression, normalized_en):
                continue
            obstacle = build_pattern_obstacle(row, entry, source_en, source_zh)
            key = (
                obstacle["start"],
                obstacle["end"],
                obstacle["type"],
                obstacle["text"].lower(),
            )
            if key not in seen:
                obstacles.append(obstacle)
                seen.add(key)

        for entry in VOCABULARY_DICTIONARY.values():
            if not word_pattern(entry.word).search(normalized_en):
                continue
            obstacle = build_vocabulary_obstacle(row, entry, source_en, source_zh)
            key = (
                obstacle["start"],
                obstacle["end"],
                obstacle["type"],
                obstacle["word"].lower(),
            )
            if key not in seen:
                obstacles.append(obstacle)
                seen.add(key)

    return obstacles


def write_json(path: Path, obstacles: list[dict[str, str]]) -> None:
    """Write obstacles as UTF-8 JSON with Chinese preserved."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as json_file:
        json.dump(obstacles, json_file, ensure_ascii=False, indent=2)
        json_file.write("\n")


def write_csv(path: Path, obstacles: list[dict[str, str]]) -> None:
    """Write obstacles as UTF-8-SIG CSV with the required field order."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=OUTPUT_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for obstacle in obstacles:
            writer.writerow({field: obstacle.get(field, "") for field in OUTPUT_FIELDS})


def main() -> None:
    """Default entry point for v29a obstacle generation."""
    rows = read_subtitles(INPUT_CSV)
    obstacles = generate_obstacles(rows)
    write_json(OUTPUT_JSON, obstacles)
    write_csv(OUTPUT_CSV, obstacles)
    print(f"Read {len(rows)} subtitle rows from {INPUT_CSV}")
    print(f"Wrote {len(obstacles)} obstacles to {OUTPUT_JSON}")
    print(f"Wrote {len(obstacles)} obstacles to {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
