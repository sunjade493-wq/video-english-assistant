#!/usr/bin/env python3
"""V28B Qwen-VL subtitle validation sampler.

This script samples 20 fixed timestamps from a short video, saves each resized
frame as a PNG, and asks a Qwen-VL OpenAI-compatible chat completion endpoint to
read only the bottom bilingual dialogue subtitles.
"""

from __future__ import annotations

import argparse
import base64
import csv
import json
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any


DEFAULT_VIDEO = Path("input_video/TBBT_S12E01_2min.mp4")
DEFAULT_FRAME_DIR = Path("output_frames/v28b_qwen_samples")
DEFAULT_JSON = Path("output_text/v28b_qwen_subtitle_validation.json")
DEFAULT_CSV = Path("output_text/v28b_qwen_subtitle_validation.csv")
DEFAULT_KEY_FILE = Path("qwen_api_key.txt")
DEFAULT_ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
DEFAULT_MODEL = "qwen-vl-plus-latest"
TARGET_WIDTH = 1920
TARGET_HEIGHT = 1080
REQUEST_TIMEOUT_SECONDS = 90

# Fixed validation timestamps for the 2-minute sample. The first timestamp is 8s,
# which produces the required 6-digit filename format example: 000008.png.
SAMPLE_TIMES_SECONDS = [
    8,
    14,
    20,
    26,
    32,
    38,
    44,
    50,
    56,
    62,
    68,
    74,
    80,
    86,
    92,
    98,
    104,
    110,
    116,
    119,
]

SUBTITLE_PROMPT = """请只读取画面底部的中英文对白字幕。

要求：
1. 只识别底部对白字幕中的中文和英文。
2. 不要读取演员名、B 站 UI、右上角水印、片头审查号、弹幕、菜单或其他界面文字。
3. 如果某一语言没有字幕，请返回空字符串。
4. 只返回严格 JSON，不要解释，不要使用 Markdown。

返回格式必须是：{"zh": "...", "en": "..."}
"""


@dataclass
class ValidationResult:
    time: int
    image: str
    zh: str = ""
    en: str = ""
    error: str = ""

    def to_dict(self) -> dict[str, str | int]:
        return {
            "time": self.time,
            "image": self.image,
            "zh": self.zh,
            "en": self.en,
            "error": self.error,
        }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sample fixed video frames and validate subtitles with Qwen-VL."
    )
    parser.add_argument(
        "--video",
        type=Path,
        default=DEFAULT_VIDEO,
        help=f"Input video path (default: {DEFAULT_VIDEO})",
    )
    parser.add_argument(
        "--frames",
        type=Path,
        default=DEFAULT_FRAME_DIR,
        help=f"Output frame directory (default: {DEFAULT_FRAME_DIR})",
    )
    parser.add_argument(
        "--json",
        type=Path,
        default=DEFAULT_JSON,
        help=f"Output JSON path (default: {DEFAULT_JSON})",
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=DEFAULT_CSV,
        help=f"Output CSV path (default: {DEFAULT_CSV})",
    )
    parser.add_argument(
        "--key-file",
        type=Path,
        default=DEFAULT_KEY_FILE,
        help=f"Qwen API key file (default: {DEFAULT_KEY_FILE})",
    )
    parser.add_argument(
        "--endpoint",
        default=DEFAULT_ENDPOINT,
        help=f"OpenAI-compatible endpoint (default: {DEFAULT_ENDPOINT})",
    )
    parser.add_argument(
        "--model",
        default=DEFAULT_MODEL,
        help=f"Qwen-VL model name (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--sleep",
        type=float,
        default=0.0,
        help="Optional delay between API calls in seconds",
    )
    return parser.parse_args()


def read_api_key(key_file: Path) -> str:
    try:
        api_key = key_file.read_text(encoding="utf-8").strip()
    except OSError as exc:
        raise RuntimeError(f"Unable to read Qwen API key file: {key_file}") from exc

    if not api_key:
        raise RuntimeError(f"Qwen API key file is empty: {key_file}")
    return api_key


def image_to_data_url(image_path: Path) -> str:
    encoded = base64.b64encode(image_path.read_bytes()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def extract_json_object(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`").strip()
        if stripped.lower().startswith("json"):
            stripped = stripped[4:].strip()

    try:
        payload = json.loads(stripped)
    except json.JSONDecodeError:
        start = stripped.find("{")
        end = stripped.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        payload = json.loads(stripped[start : end + 1])

    if not isinstance(payload, dict):
        raise ValueError("Qwen response JSON is not an object")
    return payload


def call_qwen_for_subtitles(
    image_path: Path,
    *,
    api_key: str,
    endpoint: str,
    model: str,
) -> tuple[str, str]:
    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": SUBTITLE_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": image_to_data_url(image_path)},
                    },
                ],
            }
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Qwen HTTP {exc.code}: {details}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Qwen request failed: {exc.reason}") from exc

    try:
        content = response_payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f"Unexpected Qwen response shape: {response_payload}") from exc

    parsed = extract_json_object(content)
    zh = parsed.get("zh", "")
    en = parsed.get("en", "")
    return str(zh).strip(), str(en).strip()


def save_resized_frame(video_path: Path, output_dir: Path, sample_time: int) -> Path:
    try:
        import cv2
    except ImportError as exc:
        raise RuntimeError(
            "OpenCV is required. Install opencv-python before running this script."
        ) from exc

    output_dir.mkdir(parents=True, exist_ok=True)
    image_path = output_dir / f"{sample_time:06d}.png"

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        cap.release()
        raise RuntimeError(f"Unable to open video: {video_path}")

    try:
        cap.set(cv2.CAP_PROP_POS_MSEC, sample_time * 1000)
        ok, frame = cap.read()
        if not ok or frame is None:
            raise RuntimeError(f"Unable to read frame at {sample_time}s")

        resized = cv2.resize(frame, (TARGET_WIDTH, TARGET_HEIGHT))
        if not cv2.imwrite(str(image_path), resized):
            raise RuntimeError(f"Unable to write frame: {image_path}")
        return image_path
    finally:
        cap.release()


def run_validation(args: argparse.Namespace) -> list[ValidationResult]:
    api_key = read_api_key(args.key_file)
    results: list[ValidationResult] = []

    for sample_time in SAMPLE_TIMES_SECONDS:
        image_path = args.frames / f"{sample_time:06d}.png"
        result = ValidationResult(time=sample_time, image=str(image_path))

        try:
            saved_image = save_resized_frame(args.video, args.frames, sample_time)
            result.image = str(saved_image)
            result.zh, result.en = call_qwen_for_subtitles(
                saved_image,
                api_key=api_key,
                endpoint=args.endpoint,
                model=args.model,
            )
        except Exception as exc:  # Keep the whole batch running if one frame/API call fails.
            result.error = str(exc)

        results.append(result)
        print(
            f"{sample_time:6d}s | image={result.image} | "
            f"zh={result.zh!r} | en={result.en!r} | error={result.error!r}",
            flush=True,
        )
        if args.sleep > 0:
            time.sleep(args.sleep)

    return results


def write_json(path: Path, results: list[ValidationResult]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as json_file:
        json.dump(
            [result.to_dict() for result in results],
            json_file,
            ensure_ascii=False,
            indent=2,
        )
        json_file.write("\n")


def write_csv(path: Path, results: list[ValidationResult]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as csv_file:
        writer = csv.DictWriter(
            csv_file, fieldnames=["time", "image", "zh", "en", "error"]
        )
        writer.writeheader()
        for result in results:
            writer.writerow(result.to_dict())


def main() -> int:
    args = parse_args()
    try:
        results = run_validation(args)
        write_json(args.json, results)
        write_csv(args.csv, results)
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print(f"Wrote JSON: {args.json}")
    print(f"Wrote CSV: {args.csv}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
