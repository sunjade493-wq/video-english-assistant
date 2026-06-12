#!/usr/bin/env python3
"""Validate whether Qwen-VL can read burned-in bilingual subtitles.

This script samples fixed timestamps from a local video, saves each sampled
frame at 1920x1080, and asks Qwen-VL to return only the bottom bilingual
dialogue subtitles as JSON.
"""

from __future__ import annotations

import base64
import csv
import json
import os
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any


INPUT_VIDEO = Path("input_video/TBBT_S12E01_2min.mp4")
FRAME_OUTPUT_DIR = Path("output_frames/v28b_qwen_samples")
JSON_OUTPUT_PATH = Path("output_text/v28b_qwen_subtitle_validation.json")
CSV_OUTPUT_PATH = Path("output_text/v28b_qwen_subtitle_validation.csv")
API_KEY_PATH = Path("qwen_api_key.txt")

TARGET_WIDTH = 1920
TARGET_HEIGHT = 1080
SAMPLE_TIMES_SECONDS = [
    8,
    10,
    12,
    15,
    20,
    23,
    28,
    31,
    41,
    45,
    50,
    52,
    57,
    60,
    70,
    80,
    83,
    89,
    95,
    122,
]

QWEN_API_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
QWEN_MODEL = "qwen-vl-max"
REQUEST_TIMEOUT_SECONDS = 90

SYSTEM_PROMPT = """你是严格的字幕 OCR 校验器。只读取画面底部的中英文对白字幕。"""
USER_PROMPT = """请读取这张视频截图中画面底部的烧录双语对白字幕，并且只输出 JSON。

规则：
1. 只读取画面底部的中英文对白字幕。
2. 不要读取演员名。
3. 不要读取 B站播放器 UI。
4. 不要读取右上角水印。
5. 不要读取片头审查号。
6. 如果没有字幕，输出空字符串。
7. 只允许输出如下 JSON 对象，不要 Markdown，不要解释，不要额外字段：
{
  "zh": "...",
  "en": "..."
}
"""


@dataclass
class SubtitleValidationResult:
    time: int
    image: str
    zh: str = ""
    en: str = ""
    error: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "time": self.time,
            "image": self.image,
            "zh": self.zh,
            "en": self.en,
            "error": self.error,
        }


def load_api_key(path: Path = API_KEY_PATH) -> str:
    if not path.exists():
        raise FileNotFoundError(f"API key file not found: {path}")

    api_key = path.read_text(encoding="utf-8").strip()
    if not api_key:
        raise ValueError(f"API key file is empty: {path}")
    return api_key


def ensure_cv2() -> Any:
    try:
        import cv2
    except ImportError as exc:
        raise RuntimeError(
            "OpenCV is required. Install opencv-python before running this script."
        ) from exc
    return cv2


def frame_path_for_time(sample_time: int) -> Path:
    return FRAME_OUTPUT_DIR / f"{sample_time:06d}.png"


def extract_frames(video_path: Path = INPUT_VIDEO) -> list[SubtitleValidationResult]:
    if not video_path.exists():
        raise FileNotFoundError(f"Input video does not exist: {video_path}")

    cv2 = ensure_cv2()
    FRAME_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Unable to open video: {video_path}")

    results: list[SubtitleValidationResult] = []
    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 0
        for sample_time in SAMPLE_TIMES_SECONDS:
            output_path = frame_path_for_time(sample_time)
            cap.set(cv2.CAP_PROP_POS_MSEC, sample_time * 1000)
            ok, frame = cap.read()

            if (not ok or frame is None) and fps > 0:
                cap.set(cv2.CAP_PROP_POS_FRAMES, int(round(sample_time * fps)))
                ok, frame = cap.read()

            result = SubtitleValidationResult(
                time=sample_time,
                image=output_path.as_posix(),
            )
            if not ok or frame is None:
                result.error = f"Failed to read frame at {sample_time}s"
                results.append(result)
                print(f"{sample_time:6d}s | frame read failed", flush=True)
                continue

            resized = cv2.resize(frame, (TARGET_WIDTH, TARGET_HEIGHT))
            if not cv2.imwrite(str(output_path), resized):
                result.error = f"Failed to write image: {output_path}"
            results.append(result)
            print(f"{sample_time:6d}s | saved {output_path}", flush=True)
    finally:
        cap.release()

    return results


def image_to_data_url(image_path: Path) -> str:
    encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def strip_json_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def parse_subtitle_json(text: str) -> tuple[str, str]:
    cleaned = strip_json_fences(text)
    try:
        payload = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            raise
        payload = json.loads(match.group(0))

    if not isinstance(payload, dict):
        raise ValueError("Model response is not a JSON object")

    zh = payload.get("zh", "")
    en = payload.get("en", "")
    return str(zh).strip(), str(en).strip()


def call_qwen_vl(image_path: Path, api_key: str) -> tuple[str, str]:
    payload = {
        "model": os.environ.get("QWEN_VL_MODEL", QWEN_MODEL),
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": USER_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": image_to_data_url(image_path)},
                    },
                ],
            },
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }

    request = urllib.request.Request(
        QWEN_API_URL,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(
            request, timeout=REQUEST_TIMEOUT_SECONDS
        ) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Qwen API HTTP {exc.code}: {error_body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Qwen API request failed: {exc.reason}") from exc

    response_payload = json.loads(body)
    choices = response_payload.get("choices") or []
    if not choices:
        raise ValueError(f"Qwen API returned no choices: {body}")

    content = choices[0].get("message", {}).get("content", "")
    if isinstance(content, list):
        content = "".join(
            item.get("text", "") if isinstance(item, dict) else str(item)
            for item in content
        )
    if not isinstance(content, str) or not content.strip():
        raise ValueError(f"Qwen API returned empty content: {body}")

    return parse_subtitle_json(content)


def validate_subtitles(results: list[SubtitleValidationResult]) -> None:
    try:
        api_key = load_api_key()
    except Exception as exc:
        error = str(exc)
        for result in results:
            if not result.error:
                result.error = error
        return

    for result in results:
        if result.error:
            continue

        try:
            zh, en = call_qwen_vl(Path(result.image), api_key)
            result.zh = zh
            result.en = en
            print(
                f"{result.time:6d}s | zh={result.zh!r} | en={result.en!r}",
                flush=True,
            )
        except Exception as exc:
            result.error = str(exc)
            print(f"{result.time:6d}s | error={result.error}", flush=True)


def write_json_output(path: Path, results: list[SubtitleValidationResult]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as json_file:
        json.dump(
            [result.to_dict() for result in results],
            json_file,
            ensure_ascii=False,
            indent=2,
        )
        json_file.write("\n")


def write_csv_output(path: Path, results: list[SubtitleValidationResult]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as csv_file:
        writer = csv.DictWriter(
            csv_file, fieldnames=["time", "image", "zh", "en", "error"]
        )
        writer.writeheader()
        for result in results:
            writer.writerow(result.to_dict())


def main() -> int:
    try:
        results = extract_frames()
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    validate_subtitles(results)
    write_json_output(JSON_OUTPUT_PATH, results)
    write_csv_output(CSV_OUTPUT_PATH, results)
    print(f"Wrote {JSON_OUTPUT_PATH}", flush=True)
    print(f"Wrote {CSV_OUTPUT_PATH}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
