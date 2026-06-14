import csv
import json
import re
from dataclasses import dataclass
from pathlib import Path

VERSION = "V29A"
INPUT_CSV = Path("output_text/v28d_bilingual_subtitles.csv")
OUTPUT_JSON = Path("output_text/v29a_obstacles.json")
OUTPUT_CSV = Path("output_text/v29a_obstacles.csv")

OUTPUT_FIELDS = (
    "id", "type", "priority", "start", "end", "source_en", "source_zh",
    "word", "lemma", "baseForm", "phonetic", "partOfSpeech", "sentenceMeaning", "translation",
    "phrase", "prototype", "literal", "actual", "grammar",
)

VOCAB_REQUIRED_FIELDS = (
    "word", "lemma", "baseForm", "phonetic", "partOfSpeech", "sentenceMeaning", "translation",
)

VOCABULARY_DICTIONARY = (
    {
        "word": "lecture",
        "lemma": "lecture",
        "baseForm": "lecture",
        "phonetic": "/ˈlektʃər/",
        "partOfSpeech": "n.",
        "sentenceMeaning": "在当前字幕中表示一次讲座或授课。",
        "translation": "讲座；授课",
    },
    {
        "word": "academic",
        "lemma": "academic",
        "baseForm": "academic",
        "phonetic": "/ˌækəˈdemɪk/",
        "partOfSpeech": "adj.",
        "sentenceMeaning": "在当前字幕中表示与学习或学术环境有关的。",
        "translation": "学术的；学院的",
    },
    {
        "word": "project",
        "lemma": "project",
        "baseForm": "project",
        "phonetic": "/ˈprɑːdʒekt/",
        "partOfSpeech": "n.",
        "sentenceMeaning": "在当前字幕中表示正在进行的一项任务或项目。",
        "translation": "项目；工程",
    },
    {
        "word": "straight",
        "lemma": "straight",
        "baseForm": "straight",
        "phonetic": "/streɪt/",
        "partOfSpeech": "adv.",
        "sentenceMeaning": "在当前字幕中和 up 连用，表示说话直接、坦率。",
        "translation": "直地；直接地",
    },
    {
        "word": "official",
        "lemma": "official",
        "baseForm": "official",
        "phonetic": "/əˈfɪʃl/",
        "partOfSpeech": "adj.",
        "sentenceMeaning": "在当前字幕中表示正式的、被确认的。",
        "translation": "官方的；正式的",
    },
    {
        "word": "tradition",
        "lemma": "tradition",
        "baseForm": "tradition",
        "phonetic": "/trəˈdɪʃn/",
        "partOfSpeech": "n.",
        "sentenceMeaning": "在当前字幕中表示长期延续的习惯或做法。",
        "translation": "传统；惯例",
    },
    {
        "word": "believe",
        "lemma": "believe",
        "baseForm": "believe",
        "phonetic": "/bɪˈliːv/",
        "partOfSpeech": "v.",
        "sentenceMeaning": "在当前字幕中表示认为某事是真的。",
        "translation": "相信；认为",
    },
)

COMPREHENSION_PATTERNS = (
    {
        "phrase": "lay it on us",
        "prototype": "lay something on somebody",
        "literal": "把某件事放到某人身上",
        "actual": "把想说的话直接告诉对方；别拐弯抹角。",
        "grammar": "lay + something + on + somebody 可把信息直接交给对方承接。",
        "texts": ("lay it on us",),
    },
    {
        "phrase": "give me a hand",
        "prototype": "give somebody a hand",
        "literal": "给某人一只手",
        "actual": "帮某人一下；搭把手。",
        "grammar": "hand 在动作场景里代表劳力或协助。",
        "texts": ("give me a hand",),
    },
    {
        "phrase": "pull off the project",
        "prototype": "pull somebody off something",
        "literal": "把某人从某事物上拉开",
        "actual": "让某人退出某项任务；把某人从某事中撤下。",
        "grammar": "off 表示离开原来的参与位置。",
        "texts": ("pulled off the project", "pull off the project"),
    },
    {
        "phrase": "call it a day",
        "prototype": "call it a day",
        "literal": "把某事称为一天的结束",
        "actual": "今天到此为止；收工。",
        "grammar": "把当前活动认定为 a day，表示可以停止并结束今天的工作。",
        "texts": ("call it a day",),
    },
    {
        "phrase": "straight up",
        "prototype": "straight up",
        "literal": "笔直向上",
        "actual": "坦率地说；真的；不夸张地。",
        "grammar": "不歪不绕的方向感转到说话方式上，表示直接、坦率。",
        "texts": ("straight up",),
    },
)

@dataclass(frozen=True)
class SubtitleRow:
    start: str
    end: str
    source_en: str
    source_zh: str


def read_subtitle_rows(path):
    with path.open(newline="", encoding="utf-8") as handle:
        return [SubtitleRow(row["start"].strip(), row["end"].strip(), row["source_en"].strip(), row["source_zh"].strip()) for row in csv.DictReader(handle)]


def word_pattern(word):
    return re.compile(r"(?<![A-Za-z])" + re.escape(word) + r"(?![A-Za-z])", re.IGNORECASE)


def phrase_matches(text, source_en):
    return re.search(r"(?<![A-Za-z])" + re.escape(text) + r"(?![A-Za-z])", source_en, re.IGNORECASE) is not None


def blank_obstacle(row, obstacle_type, priority):
    return {
        "id": "", "type": obstacle_type, "priority": priority,
        "start": row.start, "end": row.end, "source_en": row.source_en, "source_zh": row.source_zh,
        "word": "", "lemma": "", "baseForm": "", "phonetic": "", "partOfSpeech": "", "sentenceMeaning": "", "translation": "",
        "phrase": "", "prototype": "", "literal": "", "actual": "", "grammar": "",
    }


def generate_vocabulary_obstacles(rows):
    obstacles = []
    for row_index, row in enumerate(rows, 1):
        for entry in VOCABULARY_DICTIONARY:
            if word_pattern(entry["word"]).search(row.source_en):
                obstacle = blank_obstacle(row, "vocabulary", 10)
                obstacle.update({field: entry[field] for field in VOCAB_REQUIRED_FIELDS})
                obstacle["id"] = f"vocab-{row_index}-{entry['lemma']}"
                obstacles.append(obstacle)
    return obstacles


def generate_comprehension_obstacles(rows):
    obstacles = []
    for row_index, row in enumerate(rows, 1):
        for entry in COMPREHENSION_PATTERNS:
            if any(phrase_matches(text, row.source_en) for text in entry["texts"]):
                obstacle = blank_obstacle(row, "comprehension", 20)
                obstacle.update({key: entry[key] for key in ("phrase", "prototype", "literal", "actual", "grammar")})
                obstacle["id"] = f"comprehension-{row_index}-{entry['phrase'].replace(' ', '-')}"
                obstacles.append(obstacle)
    return obstacles


def sort_obstacles(obstacles):
    return sorted(obstacles, key=lambda obstacle: (obstacle["priority"], obstacle["start"], obstacle.get("word") or obstacle.get("phrase") or obstacle.get("source_en")))


def validate_vocab_obstacle(obstacle):
    if obstacle.get("type") != "vocabulary":
        return
    missing = [field for field in VOCAB_REQUIRED_FIELDS if not str(obstacle.get(field, "")).strip()]
    if missing:
        raise ValueError(f"Vocabulary obstacle {obstacle.get('id', '<unknown>')} missing fields: {', '.join(missing)}")


def validate_rule_libraries():
    for entry in VOCABULARY_DICTIONARY:
        missing = [field for field in VOCAB_REQUIRED_FIELDS if not str(entry.get(field, "")).strip()]
        if missing:
            raise ValueError(f"Vocabulary dictionary entry {entry.get('word', '<unknown>')} missing fields: {', '.join(missing)}")


def validate_obstacles(obstacles):
    for obstacle in obstacles:
        validate_vocab_obstacle(obstacle)
        for field in ("start", "end", "source_en", "source_zh"):
            if not str(obstacle.get(field, "")).strip():
                raise ValueError(f"Obstacle {obstacle.get('id', '<unknown>')} missing {field}")


def generate_obstacles(rows):
    return sort_obstacles(generate_vocabulary_obstacles(rows) + generate_comprehension_obstacles(rows))


def write_json(path, obstacles):
    validate_obstacles(obstacles)
    payload = {
        "version": VERSION,
        "input": str(INPUT_CSV),
        "obstacle_count": len(obstacles),
        "obstacles": obstacles,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_csv(path, obstacles):
    validate_obstacles(obstacles)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=OUTPUT_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(obstacles)


def main():
    validate_rule_libraries()
    rows = read_subtitle_rows(INPUT_CSV)
    obstacles = generate_obstacles(rows)
    write_json(OUTPUT_JSON, obstacles)
    write_csv(OUTPUT_CSV, obstacles)
    print(f"vocab count: {sum(1 for item in obstacles if item['type'] == 'vocabulary')}")
    print(f"comprehension count: {sum(1 for item in obstacles if item['type'] == 'comprehension')}")
    print(f"total obstacle count: {len(obstacles)}")


if __name__ == "__main__":
    main()
