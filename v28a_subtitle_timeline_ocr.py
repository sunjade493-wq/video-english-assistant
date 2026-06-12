#!/usr/bin/env python3
"""V28A subtitle timeline OCR prototype.

This first-stage script verifies whether bilingual subtitles can be read
stably from a video. It intentionally keeps timeline generation simple:
frames are sampled at a fixed interval, only subtitle bands are OCR'd, and
JSON output performs only consecutive duplicate merging.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


TARGET_WIDTH = 1920
TARGET_HEIGHT = 1080

# Crop bands requested for the first OCR validation pass.
CROP_X1 = 160
CROP_X2 = 1760
ZH_Y1 = 780
ZH_Y2 = 900
EN_Y1 = 880
EN_Y2 = 1015


@dataclass
class OcrSample:
    time: float
    zh: str
    en: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sample subtitle regions from a video and run PaddleOCR."
    )
    parser.add_argument("--video", required=True, help="Input video path")
    parser.add_argument("--out", required=True, help="Output JSON subtitle path")
    parser.add_argument("--debug", required=True, help="Output raw OCR CSV path")
    parser.add_argument(
        "--interval",
        type=float,
        default=0.5,
        help="Frame sampling interval in seconds (default: 0.5)",
    )
    return parser.parse_args()


def make_ocr() -> Any:
    """Create a PaddleOCR reader lazily so --help stays lightweight."""
    try:
        from paddleocr import PaddleOCR
    except ImportError as exc:
        raise RuntimeError(
            "PaddleOCR is required. Install paddleocr before running this script."
        ) from exc

    init_attempts = (
        # PaddleOCR 2.x style. Chinese model also recognizes English text well
        # enough for this bilingual-subtitle validation pass.
        {"use_angle_cls": True, "lang": "ch", "show_log": False},
        # PaddleOCR 3.x removed/renamed some keyword arguments.
        {"use_angle_cls": True, "lang": "ch"},
        {"lang": "ch"},
    )
    last_error: Exception | None = None
    for kwargs in init_attempts:
        try:
            return PaddleOCR(**kwargs)
        except Exception as exc:  # pragma: no cover - depends on installed version
            last_error = exc
    raise RuntimeError(f"Unable to initialize PaddleOCR: {last_error}")


def clamp_crop(frame: Any, x1: int, y1: int, x2: int, y2: int) -> Any:
    height, width = frame.shape[:2]
    left = max(0, min(width, x1))
    right = max(left, min(width, x2))
    top = max(0, min(height, y1))
    bottom = max(top, min(height, y2))
    return frame[top:bottom, left:right]


def normalize_text(text: str) -> str:
    text = text.replace("\u3000", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def normalize_for_dedupe(text: str) -> str:
    text = normalize_text(text).lower()
    return re.sub(r"[\s，。！？、,.!?;；:'‘’\"“”\-—_]+", "", text)


def collect_ocr_texts(result: Any) -> list[str]:
    """Extract recognized strings from common PaddleOCR 2.x/3.x result shapes."""
    texts: list[str] = []

    def visit(node: Any) -> None:
        if node is None:
            return

        if isinstance(node, dict):
            for key in ("rec_texts", "texts"):
                value = node.get(key)
                if isinstance(value, list):
                    texts.extend(str(item) for item in value if str(item).strip())
            for key in ("rec_text", "text"):
                value = node.get(key)
                if isinstance(value, str) and value.strip():
                    texts.append(value)
            for key in ("res", "result", "data"):
                if key in node:
                    visit(node[key])
            return

        if hasattr(node, "json"):
            json_value = getattr(node, "json")
            if callable(json_value):
                try:
                    visit(json_value())
                    return
                except Exception:
                    pass
            elif json_value is not None:
                visit(json_value)
                return

        if isinstance(node, (list, tuple)):
            # PaddleOCR 2.x line shape: [box, (text, confidence)].
            if (
                len(node) >= 2
                and isinstance(node[1], (list, tuple))
                and len(node[1]) >= 1
                and isinstance(node[1][0], str)
            ):
                texts.append(node[1][0])
                return
            for item in node:
                visit(item)

    visit(result)
    return [normalize_text(text) for text in texts if normalize_text(text)]


def run_ocr(ocr: Any, image: Any) -> str:
    # PaddleOCR accepts BGR numpy arrays in the classic ocr() API. The newer
    # predict() API is supported as a fallback for compatibility.
    attempts = (
        lambda: ocr.ocr(image, cls=True),
        lambda: ocr.ocr(image),
        lambda: ocr.predict(image),
    )
    last_error: Exception | None = None
    for attempt in attempts:
        try:
            return normalize_text(" ".join(collect_ocr_texts(attempt())))
        except TypeError as exc:
            last_error = exc
        except Exception as exc:  # pragma: no cover - OCR runtime dependent
            last_error = exc
            break
    raise RuntimeError(f"PaddleOCR failed: {last_error}")


def iter_sample_times(duration_seconds: float, interval: float) -> Iterable[float]:
    current = 0.0
    # Include t=0 and then every interval until just before/at the video end.
    while current <= duration_seconds + 1e-6:
        yield round(current, 3)
        current += interval


def sample_video(video_path: Path, interval: float, ocr: Any) -> list[OcrSample]:
    if interval <= 0:
        raise ValueError("--interval must be greater than 0")

    try:
        import cv2
    except ImportError as exc:
        raise RuntimeError(
            "OpenCV is required. Install opencv-python before running this script."
        ) from exc

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Unable to open video: {video_path}")

    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 0
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0
        duration_seconds = frame_count / fps if fps > 0 else 0
        if duration_seconds <= 0:
            raise RuntimeError("Unable to determine video duration")

        samples: list[OcrSample] = []
        for sample_time in iter_sample_times(duration_seconds, interval):
            cap.set(cv2.CAP_PROP_POS_MSEC, sample_time * 1000)
            ok, frame = cap.read()
            if not ok or frame is None:
                continue

            frame_1080p = cv2.resize(frame, (TARGET_WIDTH, TARGET_HEIGHT))
            zh_crop = clamp_crop(frame_1080p, CROP_X1, ZH_Y1, CROP_X2, ZH_Y2)
            en_crop = clamp_crop(frame_1080p, CROP_X1, EN_Y1, CROP_X2, EN_Y2)

            zh_text = run_ocr(ocr, zh_crop)
            en_text = run_ocr(ocr, en_crop)
            samples.append(OcrSample(time=sample_time, zh=zh_text, en=en_text))
            print(
                f"{sample_time:8.2f}s | zh={zh_text!r} | en={en_text!r}",
                flush=True,
            )
        return samples
    finally:
        cap.release()


def write_debug_csv(path: Path, samples: list[OcrSample]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=["time", "zh", "en"])
        writer.writeheader()
        for sample in samples:
            writer.writerow(
                {"time": f"{sample.time:.2f}", "zh": sample.zh, "en": sample.en}
            )


def build_simple_subtitles(samples: list[OcrSample], interval: float) -> list[dict[str, Any]]:
    subtitles: list[dict[str, Any]] = []
    last_key: tuple[str, str] | None = None

    for sample in samples:
        zh = normalize_text(sample.zh)
        en = normalize_text(sample.en)
        if not zh and not en:
            last_key = None
            continue

        key = (normalize_for_dedupe(zh), normalize_for_dedupe(en))
        if subtitles and key == last_key:
            subtitles[-1]["end"] = round(sample.time + interval, 2)
            continue

        subtitles.append(
            {
                "start": round(sample.time, 2),
                "end": round(sample.time + interval, 2),
                "zh": zh,
                "en": en,
            }
        )
        last_key = key

    return subtitles


def write_json(path: Path, samples: list[OcrSample], interval: float, video_path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": "v28a",
        "purpose": "first-pass OCR validation for bilingual subtitles",
        "video": str(video_path),
        "target_resolution": {"width": TARGET_WIDTH, "height": TARGET_HEIGHT},
        "interval": interval,
        "crop": {
            "x": [CROP_X1, CROP_X2],
            "zh_y": [ZH_Y1, ZH_Y2],
            "en_y": [EN_Y1, EN_Y2],
        },
        "subtitles": build_simple_subtitles(samples, interval),
    }
    with path.open("w", encoding="utf-8") as json_file:
        json.dump(payload, json_file, ensure_ascii=False, indent=2)
        json_file.write("\n")


def main() -> int:
    args = parse_args()
    video_path = Path(args.video)
    if not video_path.exists():
        print(f"Video does not exist: {video_path}", file=sys.stderr)
        return 1

    try:
        ocr = make_ocr()
        samples = sample_video(video_path, args.interval, ocr)
        write_debug_csv(Path(args.debug), samples)
        write_json(Path(args.out), samples, args.interval, video_path)
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
