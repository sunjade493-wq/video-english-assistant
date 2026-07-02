#!/usr/bin/env python3
"""
P10-E Sliding-window OCR Crop Validation

Uses a horizontal sliding window over the English subtitle band to find the
real pixel x-position of the rendered word "lamb".  No AI model, no PaddleOCR.

Input:   tmp/p8_b_frames/frame_lamb_subtitle_roi.jpg  (1920x324 px)
Outputs: tmp/p10e_subtitle_band.jpg        -- isolated subtitle band
         tmp/p10e_lamb_best_crop.jpg       -- best window crop that matched "lamb"
         tmp/p10e_lamb_overlay.jpg         -- overlay showing best box on full ROI
         stdout: full report

No Qwen. No PaddleOCR. No Runtime. No script.js. No P1/P8/P10A/P10C/P10D changes.
"""

import sys
import os
import re

ROI_PATH = os.path.join('tmp', 'p8_b_frames', 'frame_lamb_subtitle_roi.jpg')
BAND_PATH = os.path.join('tmp', 'p10e_subtitle_band.jpg')
BEST_CROP_PATH = os.path.join('tmp', 'p10e_lamb_best_crop.jpg')
OVERLAY_PATH = os.path.join('tmp', 'p10e_lamb_overlay.jpg')

TARGET_WORD = 'lamb'
FULL_SUBTITLE = 'Can you believe our little lamb is finally getting married?'

# P8-B reference box (model-reported, known to be misaligned with real pixels)
P8B_LAMB_BOX = {'left': 704, 'top': 234, 'right': 777, 'bottom': 278}

# ---------------------------------------------------------------------------
# Image / OCR imports
# ---------------------------------------------------------------------------

if not os.path.exists(ROI_PATH):
    print(f'ERROR: Image not found: {ROI_PATH}')
    sys.exit(1)

try:
    import cv2
    import numpy as np
except ImportError:
    print('ERROR: opencv-python required. Run: pip install opencv-python')
    sys.exit(1)

try:
    import easyocr
    OCR_ENGINE = 'easyocr'
except ImportError:
    print('ERROR: easyocr required. Run: pip install easyocr')
    sys.exit(1)

# ---------------------------------------------------------------------------
# Step 1 — Detect subtitle band via row brightness
# ---------------------------------------------------------------------------

img = cv2.imread(ROI_PATH)
if img is None:
    print(f'ERROR: Could not read image: {ROI_PATH}')
    sys.exit(1)

H, W = img.shape[:2]
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
row_means = gray.mean(axis=1)

# Find contiguous bright rows (subtitle text is white on dark background)
# Use a lower threshold since the subtitle band mean is in the 75–120 range
BRIGHT_THRESH = 65
bright_mask = row_means > BRIGHT_THRESH

# Collect runs of bright rows
runs = []
in_run = False
for i, bright in enumerate(bright_mask):
    if bright and not in_run:
        run_start = i
        in_run = True
    elif not bright and in_run:
        runs.append((run_start, i - 1))
        in_run = False
if in_run:
    runs.append((run_start, len(bright_mask) - 1))

# Pick the lowest (largest y) bright run — subtitle is at the bottom of the frame
subtitle_run = max(runs, key=lambda r: r[0]) if runs else (255, 280)

# The auto-detected run is often only the tallest/brightest rows.
# Expand it to at least 75px height (easyocr needs full character height).
# We expand DOWNWARD (not upward) to avoid capturing the Chinese subtitle line above.
MIN_BAND_HEIGHT = 75
run_top, run_bot = subtitle_run
raw_height = run_bot - run_top
if raw_height < MIN_BAND_HEIGHT:
    run_bot = min(H, run_top + MIN_BAND_HEIGHT)

# Clamp with a small margin
BAND_Y1 = max(0, run_top - 3)
BAND_Y2 = min(H, run_bot + 5)

band = img[BAND_Y1:BAND_Y2, :, :]
os.makedirs('tmp', exist_ok=True)
cv2.imwrite(BAND_PATH, band)

print('=' * 62)
print('P10-E Sliding-window OCR Validation')
print('=' * 62)
print(f'OCR engine:      {OCR_ENGINE}')
print(f'Input image:     {ROI_PATH}  ({W}x{H} px)')
print(f'Subtitle band:   y={BAND_Y1} to y={BAND_Y2}  (height={BAND_Y2-BAND_Y1}px)')
print(f'Band image:      {BAND_PATH}')
print(f'Target word:     {TARGET_WORD}')
print()

# ---------------------------------------------------------------------------
# Step 2 — Full-band OCR first pass (confirm subtitle is readable)
# ---------------------------------------------------------------------------

print('--- Full-band OCR sanity check ---')
reader = easyocr.Reader(['en'], verbose=False)
full_results = reader.readtext(BAND_PATH, detail=0)
full_text = ' '.join(full_results).strip()
print(f'Full band OCR:   "{full_text}"')
subtitle_readable = TARGET_WORD.lower() in full_text.lower()
print(f'Contains "lamb": {"YES" if subtitle_readable else "NO"}')
print()

# ---------------------------------------------------------------------------
# Step 3 — Coarse sliding-window sweep to bracket lamb
# ---------------------------------------------------------------------------

# Window parameters
WIN_W_COARSE = 120   # wide enough to capture one full word plus small neighbours
STRIDE_COARSE = 20
WIN_W_FINE = 120     # keep same width for fine — easyocr needs context to read cleanly
STRIDE_FINE = 5      # tighter stride for precise edge detection

# Search the x-range where the subtitle words appear.
# Based on the full-band result we know text spans roughly x=316 to x=1603.
X_START = 300
X_END = min(W, 1650)

print('--- Coarse sweep (win=120px, stride=20px) ---')
coarse_matches = []
for x in range(X_START, X_END, STRIDE_COARSE):
    x2 = min(W, x + WIN_W_COARSE)
    crop = band[:, x:x2, :]
    results = reader.readtext(crop, detail=0)
    text = ' '.join(results).strip()
    if TARGET_WORD.lower() in text.lower():
        coarse_matches.append({'x1': x, 'x2': x2, 'text': text})
        print(f'  MATCH x={x}-{x2}: "{text}"')

if not coarse_matches:
    print(f'  No coarse match found for "{TARGET_WORD}"')
    print()
    print('FAIL — sliding window could not locate the word "lamb".')
    sys.exit(1)

# Bracket: earliest left edge and latest right edge of all coarse matches
bracket_x1 = min(m['x1'] for m in coarse_matches)
bracket_x2 = max(m['x2'] for m in coarse_matches)
print(f'Coarse bracket:  x={bracket_x1} to x={bracket_x2}')
print()

# ---------------------------------------------------------------------------
# Step 4 — Fine sweep inside the bracket to pinpoint word edges
# ---------------------------------------------------------------------------

# Shrink window to ~80px (just over one word) and stride=5
WIN_W_FINE = 80
STRIDE_FINE = 5
MARGIN = 20  # expand bracket slightly for the fine sweep

fine_x_start = max(0, bracket_x1 - MARGIN)
fine_x_end = min(W, bracket_x2 + MARGIN)

print(f'--- Fine sweep (win={WIN_W_FINE}px, stride={STRIDE_FINE}px, x={fine_x_start}-{fine_x_end}) ---')

# Track fine windows by presence/absence of the target word.
# Because easyocr needs context to read a word cleanly, "exact" here means the
# recognised text contains "lamb" and nothing else (or just lamb + punctuation).
# We also track the first and last window positions that contain the word to
# derive left/right edges of the rendered word.
lamb_present = []   # windows where "lamb" appears in text
lamb_absent_after = None  # first x where word disappears on the right side

for x in range(fine_x_start, fine_x_end, STRIDE_FINE):
    x2 = min(W, x + WIN_W_FINE)
    crop = band[:, x:x2, :]
    results = reader.readtext(crop, detail=0)
    text = ' '.join(results).strip()
    text_lower = text.lower()
    if TARGET_WORD in text_lower:
        lamb_present.append({'x1': x, 'x2': x2, 'text': text})
        print(f'  HIT   x={x}-{x2}: "{text}"')

print()

# ---------------------------------------------------------------------------
# Step 5 — Determine best word box from fine sweep
# ---------------------------------------------------------------------------

# Strategy: the rendered word starts just before the leftmost window that
# contains it (window left - small offset) and ends just after the rightmost
# window whose LEFT edge still catches it.
#
# Edge estimation:
#   word_left  ≈ first hit x1  (window just started to include left side of word)
#   word_right ≈ last hit x1 + WIN_W_FINE  (window right when word is last seen)
#
# This gives us the tight box without requiring an exactly-isolated read.

if lamb_present:
    first_hit_x = lamb_present[0]['x1']
    last_hit_x  = lamb_present[-1]['x1']
    # Left edge: the window that first captures the word started at first_hit_x,
    # but the word left edge is ~WIN_W_FINE/2 to the right of that in the worst
    # case. Use first_hit_x as a conservative (slightly wide) left bound.
    word_left  = first_hit_x
    # Right edge: last window that contained the word ends at last_hit_x + WIN_W_FINE,
    # but the word right edge is inside that window. Use last_hit_x + WIN_W_FINE as
    # a conservative (slightly wide) right bound.
    word_right = last_hit_x + WIN_W_FINE
    match_quality = 'FINE'
    best_matches = lamb_present
else:
    # Fine sweep found nothing — fall back to coarse bracket
    word_left = bracket_x1
    word_right = bracket_x2
    match_quality = 'COARSE_ONLY'
    best_matches = coarse_matches

# Clamp to image width
word_left = max(0, word_left)
word_right = min(W, word_right)

best_box = {
    'left': word_left,
    'top': BAND_Y1,
    'right': word_right,
    'bottom': BAND_Y2,
}

print(f'Match quality:   {match_quality}')
print(f'Best box:        {best_box}')
print(f'Box dimensions:  {word_right - word_left}w x {BAND_Y2 - BAND_Y1}h px')
print()

# ---------------------------------------------------------------------------
# Step 6 — OCR verification on the best crop
# ---------------------------------------------------------------------------

best_crop = img[BAND_Y1:BAND_Y2, word_left:word_right, :]
cv2.imwrite(BEST_CROP_PATH, best_crop)

verify_results = reader.readtext(BEST_CROP_PATH, detail=0)
verify_text = ' '.join(verify_results).strip()
print(f'--- OCR verification on best crop ---')
print(f'Crop:            {BEST_CROP_PATH}')
print(f'OCR recognized:  "{verify_text}"')
ocr_correct = re.sub(r'[^a-z]', '', verify_text.lower()) == TARGET_WORD
print(f'Reads "lamb":    {"YES" if ocr_correct else "NO (partial or noisy)"}')
print()

# ---------------------------------------------------------------------------
# Step 7 — Save overlay on full ROI
# ---------------------------------------------------------------------------

overlay = img.copy()

# P8-B reference — blue
cv2.rectangle(overlay,
              (P8B_LAMB_BOX['left'], P8B_LAMB_BOX['top']),
              (P8B_LAMB_BOX['right'], P8B_LAMB_BOX['bottom']),
              (255, 80, 0), 2)
cv2.putText(overlay, 'P8B-ref',
            (P8B_LAMB_BOX['left'], max(0, P8B_LAMB_BOX['top'] - 8)),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 80, 0), 1, cv2.LINE_AA)

# P10-E result — green
cv2.rectangle(overlay,
              (best_box['left'], best_box['top']),
              (best_box['right'], best_box['bottom']),
              (0, 220, 0), 3)
cv2.putText(overlay, 'P10E',
            (best_box['left'], min(H - 4, best_box['bottom'] + 20)),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 220, 0), 2, cv2.LINE_AA)

cv2.imwrite(OVERLAY_PATH, overlay)
print(f'Overlay saved:   {OVERLAY_PATH}')
print()

# ---------------------------------------------------------------------------
# Final report
# ---------------------------------------------------------------------------

print('=' * 62)
print('P10-E FINAL REPORT')
print('=' * 62)
print()
print(f'OCR engine:         {OCR_ENGINE}')
print(f'Search band:        y={BAND_Y1} to y={BAND_Y2}  (full image width)')
print(f'Coarse window:      {WIN_W_COARSE}px wide, {STRIDE_COARSE}px stride')
print(f'Fine window:        {WIN_W_FINE}px wide, {STRIDE_FINE}px stride (edge detection)')
print(f'Match quality:      {match_quality}')
print(f'Best matched text:  "{verify_text}"')
print(f'Best box:           left={best_box["left"]} top={best_box["top"]} right={best_box["right"]} bottom={best_box["bottom"]}')
print(f'  vs P8-B ref:      left={P8B_LAMB_BOX["left"]} top={P8B_LAMB_BOX["top"]} right={P8B_LAMB_BOX["right"]} bottom={P8B_LAMB_BOX["bottom"]}')
print(f'  Δleft={best_box["left"] - P8B_LAMB_BOX["left"]:+d}px  Δright={best_box["right"] - P8B_LAMB_BOX["right"]:+d}px')
print(f'OCR reads "lamb":   {"YES — correct word located" if ocr_correct else "NO — partial match or noise"}')
print()
print(f'Overlay image:      {OVERLAY_PATH}')
print(f'Best crop image:    {BEST_CROP_PATH}')
print(f'Subtitle band:      {BAND_PATH}')
print()
print('Files created:')
print('  scripts/p10e_sliding_window_ocr_validation.py')
for p in [BAND_PATH, BEST_CROP_PATH, OVERLAY_PATH]:
    if os.path.exists(p):
        print(f'  {p}')
print()
print('Files NOT modified:')
print('  script.js | Runtime | P1/P8/P10A/P10C/P10D scripts | frozen docs')
print()
if ocr_correct:
    print('CONCLUSION: Sliding-window OCR successfully located "lamb".')
    print(f'  Real pixel position: x={best_box["left"]}–{best_box["right"]}')
    print(f'  P8-B model position: x={P8B_LAMB_BOX["left"]}–{P8B_LAMB_BOX["right"]}')
    print(f'  Offset: {best_box["left"] - P8B_LAMB_BOX["left"]:+d}px left, '
          f'{best_box["right"] - P8B_LAMB_BOX["right"]:+d}px right')
    print()
    print('Next recommended step:')
    print('  P10-F — use this OCR-derived box as the ground-truth pixel position,')
    print('  replacing the Qwen coordinate in the P8-B visual mapping pipeline.')
else:
    print('CONCLUSION: Best crop did not cleanly OCR as "lamb".')
    print('  Inspect overlay and crop manually before proceeding.')
    print()
    print('Next recommended step:')
    print('  Check overlay image for visual confirmation, or try a tighter')
    print('  window / different OCR config (--psm 8, scale-up).')
print('=' * 62)
