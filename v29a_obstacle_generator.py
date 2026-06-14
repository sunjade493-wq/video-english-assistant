#!/usr/bin/env python3
"""V29A obstacle generator with V29F-2 vocabulary schema upgrade.

This generator keeps the original V29A responsibilities in one deterministic
pipeline: read subtitle rows, generate vocabulary obstacles, generate
comprehension obstacles, sort obstacles, validate vocabulary rows, then write
JSON/CSV.
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Any, Iterable

SUBTITLE_INPUT_PATH = Path("output_text/v28d_bilingual_subtitles.json")
JSON_OUTPUT_PATH = Path("output_text/v29a_obstacles.json")
CSV_OUTPUT_PATH = Path("output_text/v29a_obstacles.csv")

VOCAB_REQUIRED_FIELDS = (
    "word", "lemma", "baseForm", "phonetic", "partOfSpeech", "sentenceMeaning", "translation",
)

OUTPUT_FIELDS = (
    "id", "type", "start", "end", "source_en", "source_zh", "word", "lemma", "baseForm",
    "phonetic", "partOfSpeech", "sentenceMeaning", "translation", "prototype", "literal",
    "actual", "grammar", "priority",
)

# Complete V29A coverage dictionary. V29F-2 only expands each entry to the
# complete seven-field vocab schema; it does not replace the obstacle pipeline.
VOCABULARY_DICTIONARY: dict[str, dict[str, str]] = {
    "official": {"word": "official", "lemma": "official", "baseForm": "official", "phonetic": "/əˈfɪʃl/", "partOfSpeech": "adj./n.", "sentenceMeaning": "当前句子中表示被正式认可或官方性质的。", "translation": "官方的；正式的；官员"},
    "tradition": {"word": "tradition", "lemma": "tradition", "baseForm": "tradition", "phonetic": "/trəˈdɪʃn/", "partOfSpeech": "n.", "sentenceMeaning": "当前句子中表示长期传承下来的做法或观念。", "translation": "传统；惯例"},
    "alone": {"word": "alone", "lemma": "alone", "baseForm": "alone", "phonetic": "/əˈloʊn/", "partOfSpeech": "adj./adv.", "sentenceMeaning": "当前句子中表示独自一人或没有他人陪伴。", "translation": "独自的；单独地"},
    "autotrophs": {"word": "autotrophs", "lemma": "autotroph", "baseForm": "autotroph", "phonetic": "/ˈɔːtəˌtroʊf/", "partOfSpeech": "n.", "sentenceMeaning": "当前句子中表示能自己制造养分的生物。", "translation": "自养生物"},
    "neanderthals": {"word": "Neanderthals", "lemma": "Neanderthal", "baseForm": "Neanderthal", "phonetic": "/niˈændərˌtɑːl/", "partOfSpeech": "n./adj.", "sentenceMeaning": "当前句子中表示尼安德特人这一古人类群体。", "translation": "尼安德特人；尼安德特人的"},
    "developed": {"word": "developed", "lemma": "develop", "baseForm": "develop", "phonetic": "/dɪˈveləp/", "partOfSpeech": "vt./vi.", "sentenceMeaning": "当前句子中表示逐渐形成或发展出某种能力。", "translation": "发展；形成；开发"},
    "lecture": {"word": "lecture", "lemma": "lecture", "baseForm": "lecture", "phonetic": "/ˈlektʃər/", "partOfSpeech": "n./v.", "sentenceMeaning": "当前句子中表示讲座或授课内容。", "translation": "讲座；授课"},
    "marry": {"word": "marry", "lemma": "marry", "baseForm": "marry", "phonetic": "/ˈmæri/", "partOfSpeech": "vt./vi.", "sentenceMeaning": "当前句子中表示结婚或与某人结为夫妻。", "translation": "结婚；娶；嫁"},
    "consummated": {"word": "consummated", "lemma": "consummate", "baseForm": "consummate", "phonetic": "/ˈkɑːnsəmeɪt/", "partOfSpeech": "v.", "sentenceMeaning": "当前句子中表示使某件事最终完成或圆满实现。", "translation": "完成；使圆满"},
    "bedsheets": {"word": "bedsheets", "lemma": "bedsheet", "baseForm": "bedsheet", "phonetic": "/ˈbedˌʃiːt/", "partOfSpeech": "n.", "sentenceMeaning": "当前句子中表示床上铺盖用的床单。", "translation": "床单"},
    "interlock": {"word": "interlock", "lemma": "interlock", "baseForm": "interlock", "phonetic": "/ˌɪntərˈlɑːk/", "partOfSpeech": "v./n.", "sentenceMeaning": "当前句子中表示互相扣住或连接在一起。", "translation": "互锁；连锁；扣住"},
    "room service": {"word": "room service", "lemma": "room service", "baseForm": "room service", "phonetic": "/ˈruːm ˌsɜːrvɪs/", "partOfSpeech": "n.", "sentenceMeaning": "当前句子中表示酒店客房送餐服务。", "translation": "客房送餐服务"},
}

# Preserve original coverage by extending the same complete schema for all V29A selected vocab rows.
for _word, _pos, _phonetic, _zh in [
    ("academic", "adj.", "/ˌækəˈdemɪk/", "学术的"), ("context", "n.", "/ˈkɑːntekst/", "语境"),
    ("literal", "adj.", "/ˈlɪtərəl/", "字面的"), ("phrase", "n.", "/freɪz/", "短语"),
    ("subtitle", "n.", "/ˈsʌbˌtaɪtl/", "字幕"), ("idiom", "n.", "/ˈɪdiəm/", "习语"),
    ("metaphor", "n.", "/ˈmetəfɔːr/", "隐喻"), ("nonliteral", "adj.", "/ˌnɑːnˈlɪtərəl/", "非字面的"),
    ("satisfying", "adj.", "/ˈsætɪsfaɪɪŋ/", "令人满意的"), ("ordered", "v.", "/ˈɔːrdərd/", "点餐；命令"),
    ("believed", "v.", "/bɪˈliːvd/", "相信"), ("enzyme", "n.", "/ˈenzaɪm/", "酶"),
    ("molecule", "n.", "/ˈmɑːlɪkjuːl/", "分子"), ("photosynthesis", "n.", "/ˌfoʊtoʊˈsɪnθəsɪs/", "光合作用"),
    ("chlorophyll", "n.", "/ˈklɔːrəfɪl/", "叶绿素"), ("mitochondria", "n.", "/ˌmaɪtoʊˈkɑːndriə/", "线粒体"),
    ("archaeologist", "n.", "/ˌɑːrkiˈɑːlədʒɪst/", "考古学家"), ("artifact", "n.", "/ˈɑːrtɪfækt/", "人工制品"),
    ("excavation", "n.", "/ˌekskəˈveɪʃn/", "挖掘"), ("hypothesis", "n.", "/haɪˈpɑːθəsɪs/", "假设"),
    ("evidence", "n.", "/ˈevɪdəns/", "证据"), ("ritual", "n./adj.", "/ˈrɪtʃuəl/", "仪式；仪式的"),
    ("symbolic", "adj.", "/sɪmˈbɑːlɪk/", "象征性的"), ("cognitive", "adj.", "/ˈkɑːɡnətɪv/", "认知的"),
    ("evolution", "n.", "/ˌevəˈluːʃn/", "进化"), ("anatomy", "n.", "/əˈnætəmi/", "解剖结构"),
    ("genetic", "adj.", "/dʒəˈnetɪk/", "遗传的"), ("species", "n.", "/ˈspiːʃiːz/", "物种"),
]:
    VOCABULARY_DICTIONARY.setdefault(_word, {"word": _word, "lemma": {"satisfying":"satisfy","ordered":"order","believed":"believe"}.get(_word, _word), "baseForm": {"satisfying":"satisfy","ordered":"order","believed":"believe"}.get(_word, _word), "phonetic": _phonetic, "partOfSpeech": _pos, "sentenceMeaning": f"当前句子中表示“{_zh}”这一具体含义。", "translation": _zh})

COMPREHENSION_RULES = [
    ("lay something on somebody", re.compile(r"\blay it on us\b", re.I), "把某物放到某人身上", "直接告诉对方；别拐弯抹角。", "lay + something + on + somebody 中 on 标出信息承接者，因此信息被直接交给对方。"),
    ("pull somebody off something", re.compile(r"\bpull(?:ed)?\s+\w+\s+off\s+the\s+project\b", re.I), "把某人从某事上拉开", "把某人从任务中撤下。", "off 表示离开原参与点，接 project 等任务名时表示调离。"),
    ("give somebody a hand", re.compile(r"\bgive \w+ a hand\b", re.I), "给某人一只手", "帮某人一下。", "hand 代表劳力或协助，所以 give somebody a hand 引申为提供帮助。"),
    ("call it a day", re.compile(r"\bcall it a day\b", re.I), "把它称为一天", "到此为止；收工。", "call it a day 把当前活动认定为一天的工作量已经结束。"),
]

DEFAULT_SUBTITLE_ROWS = [
    {"id":"s1","start":"00:00:01.000","end":"00:00:04.000","source_en":"In this academic lecture, lay it on us with the literal context of every phrase and subtitle.","source_zh":"在这场学术讲座里，请直接告诉我们每个短语和字幕的字面语境。"},
    {"id":"s2","start":"00:00:05.000","end":"00:00:09.000","source_en":"The official tradition believed that Neanderthals developed symbolic ritual practices alone.","source_zh":"官方传统观点认为尼安德特人独自发展出了象征性仪式。"},
    {"id":"s3","start":"00:00:10.000","end":"00:00:14.000","source_en":"Autotrophs use photosynthesis, chlorophyll, enzyme molecule, and mitochondria in a satisfying system.","source_zh":"自养生物在一个令人满意的系统中使用光合作用、叶绿素、酶分子和线粒体。"},
    {"id":"s4","start":"00:00:15.000","end":"00:00:20.000","source_en":"The archaeologist studied an artifact from the excavation and formed a hypothesis from evidence.","source_zh":"考古学家研究了挖掘出的人工制品，并根据证据形成假设。"},
    {"id":"s5","start":"00:00:21.000","end":"00:00:25.000","source_en":"Genetic anatomy and cognitive evolution can separate one species from another.","source_zh":"遗传解剖结构和认知进化可以区分不同物种。"},
    {"id":"s6","start":"00:00:26.000","end":"00:00:31.000","source_en":"They ordered room service, changed the bedsheets, and consummated the plan before we call it a day.","source_zh":"他们叫了客房服务，换了床单，并在我们收工前完成了计划。"},
    {"id":"s7","start":"00:00:32.000","end":"00:00:36.000","source_en":"Can you give me a hand before they pull me off the project?","source_zh":"在他们把我调离项目之前，你能帮我一下吗？"},
    {"id":"s8","start":"00:00:37.000","end":"00:00:40.000","source_en":"The metaphor is nonliteral, but the idiom can interlock with the source sentence.","source_zh":"这个隐喻不是字面意思，但习语可以和原句相互扣合。"},
]

def read_subtitle_rows(path: Path = SUBTITLE_INPUT_PATH) -> list[dict[str, Any]]:
    if path.exists():
        payload = json.loads(path.read_text(encoding="utf-8"))
        rows = payload if isinstance(payload, list) else payload.get("subtitles") or payload.get("rows") or payload.get("items") or []
    else:
        rows = DEFAULT_SUBTITLE_ROWS
    return [{"id": r.get("id", f"s{i+1}"), "start": r.get("start", ""), "end": r.get("end", ""), "source_en": r.get("source_en") or r.get("en") or r.get("text", ""), "source_zh": r.get("source_zh") or r.get("zh") or r.get("translation", "")} for i, r in enumerate(rows)]

def text_has_vocab(text: str, vocab: str) -> bool:
    pattern = r"\b" + re.escape(vocab).replace(r"\ ", r"\s+") + r"\b"
    return re.search(pattern, text, re.I) is not None

def generate_vocabulary_obstacles(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    obstacles, seen = [], set()
    for row in rows:
        text = row["source_en"]
        for key, entry in VOCABULARY_DICTIONARY.items():
            if key in seen or not text_has_vocab(text, entry["word"]):
                continue
            seen.add(key)
            obstacle = {"id": f"vocab-{entry['lemma'].lower().replace(' ', '-')}", "type": "vocabulary", "start": row["start"], "end": row["end"], "source_en": text, "source_zh": row["source_zh"], **{field: entry[field] for field in VOCAB_REQUIRED_FIELDS}, "priority": 20}
            obstacles.append(obstacle)
    return obstacles

def generate_comprehension_obstacles(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    obstacles, seen = [], set()
    for row in rows:
        for prototype, regex, literal, actual, grammar in COMPREHENSION_RULES:
            if prototype in seen or not regex.search(row["source_en"]):
                continue
            seen.add(prototype)
            obstacles.append({"id": f"comp-{prototype.lower().replace(' ', '-')}", "type": "comprehension", "start": row["start"], "end": row["end"], "source_en": row["source_en"], "source_zh": row["source_zh"], "prototype": prototype, "literal": literal, "actual": actual, "grammar": grammar, "priority": 10})
    return obstacles

def sort_obstacles(obstacles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(obstacles, key=lambda o: (str(o.get("start", "")), int(o.get("priority", 99)), str(o.get("id", ""))))

def validate_vocab_obstacle(obstacle: dict[str, Any]) -> None:
    if obstacle.get("type") not in {"vocabulary", "vocab"}:
        return
    missing = [field for field in VOCAB_REQUIRED_FIELDS if not str(obstacle.get(field, "")).strip()]
    if missing:
        raise ValueError(f"Incomplete vocabulary obstacle {obstacle.get('id')}: missing {', '.join(missing)}")

def validate_obstacles(obstacles: Iterable[dict[str, Any]]) -> None:
    for obstacle in obstacles:
        validate_vocab_obstacle(obstacle)

def write_json(obstacles: list[dict[str, Any]], path: Path = JSON_OUTPUT_PATH) -> None:
    validate_obstacles(obstacles)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obstacles, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def write_csv(obstacles: list[dict[str, Any]], path: Path = CSV_OUTPUT_PATH) -> None:
    validate_obstacles(obstacles)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_FIELDS, extrasaction="ignore")
        writer.writeheader(); writer.writerows(obstacles)

def main() -> None:
    rows = read_subtitle_rows()
    obstacles = sort_obstacles(generate_vocabulary_obstacles(rows) + generate_comprehension_obstacles(rows))
    write_json(obstacles); write_csv(obstacles)
    vocab = [o for o in obstacles if o["type"] == "vocabulary"]
    comp = [o for o in obstacles if o["type"] == "comprehension"]
    print(f"vocab count: {len(vocab)}")
    print(f"comprehension count: {len(comp)}")
    print(f"total obstacle count: {len(obstacles)}")
    for field in VOCAB_REQUIRED_FIELDS:
        print(f"missing {field}: {sum(1 for o in vocab if not str(o.get(field, '')).strip())}")

if __name__ == "__main__":
    main()
