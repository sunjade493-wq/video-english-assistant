#!/usr/bin/env python3
"""
P10-D Word-list Grounding Validation

Replaces the P10-A single-word grounding prompt with the validated P10-C
Variant 5 word-list strategy:
  - Ask Qwen-VL for the complete word-by-word JSON bounding-box list.
  - Programmatically extract the entry where word == target word.
  - Crop the ROI image to that box.
  - Run OCR verification on the crop to confirm it reads the correct word.

Input:  tmp/p8_b_frames/frame_lamb_subtitle_roi.jpg
Output: tmp/p10d_lamb_wordlist_debug.jpg  (overlay)
        tmp/p10d_lamb_crop.jpg            (cropped word region for OCR)
        stdout: full report

No PaddleOCR. No Runtime changes. No script.js changes.
"""

import sys
import os
import json
import base64
import re

ROI_PATH = os.path.join('tmp', 'p8_b_frames', 'frame_lamb_subtitle_roi.jpg')
DEBUG_OVERLAY_PATH = os.path.join('tmp', 'p10d_lamb_wordlist_debug.jpg')
CROP_PATH = os.path.join('tmp', 'p10d_lamb_crop.jpg')
TARGET_WORD = 'lamb'
FULL_SUBTITLE = 'Can you believe our little lamb is finally getting married?'

# P8-B reference box for comparison
P8B_LAMB_BOX = {'left': 704, 'top': 234, 'right': 777, 'bottom': 278}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_image_base64(path):
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')


def call_qwen_vl(api_key, model, image_b64, prompt):
    import urllib.request
    url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
    payload = json.dumps({
        'model': model,
        'input': {
            'messages': [{
                'role': 'user',
                'content': [
                    {'image': f'data:image/jpeg;base64,{image_b64}'},
                    {'text': prompt},
                ],
            }]
        },
        'parameters': {'result_format': 'message'},
    }).encode('utf-8')
    req = urllib.request.Request(
        url, data=payload,
        headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read().decode('utf-8'))


def extract_response_text(response):
    raw = response['output']['choices'][0]['message']['content']
    if isinstance(raw, list):
        raw = ' '.join(
            item.get('text', '') if isinstance(item, dict) else str(item)
            for item in raw
        )
    return raw.strip()


# Validated Variant 5 prompt (P10-C winner)
def build_word_list_prompt(subtitle_text, target):
    words = subtitle_text.rstrip('?!.').replace('?', '').replace('!', '').replace('.', '').split()
    word_count = len(subtitle_text.split())
    word_list = ', '.join(subtitle_text.split())
    return (
        f'This image is a {1920}x{324} pixel subtitle ROI. '
        f'The English subtitle text is: "{subtitle_text}" '
        f'Return a JSON array listing EVERY word in the subtitle with its bounding box. '
        f'Format: [{{"word": "Can", "left": <int>, "top": <int>, "right": <int>, "bottom": <int>}}, ...] '
        f'Include all {word_count} words in left-to-right order: '
        f'{word_list} '
        f'Return ONLY the JSON array. No other text.'
    )


def parse_word_list_response(text, target_word):
    """Extract the JSON array from the response and find the target word entry."""
    m = re.search(r'\[.*?\]', text, re.DOTALL)
    if not m:
        return None, None

    try:
        entries = json.loads(m.group(0))
    except Exception:
        return None, None

    all_words = []
    target_box = None
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        word = entry.get('word', '')
        all_words.append(word)
        # Match case-insensitively; strip trailing punctuation from response word
        clean = word.strip('?!.,;:').lower()
        if clean == target_word.lower() and target_box is None:
            try:
                target_box = {
                    'left': int(entry['left']),
                    'top': int(entry['top']),
                    'right': int(entry['right']),
                    'bottom': int(entry['bottom']),
                }
            except (KeyError, ValueError):
                pass

    return target_box, all_words


def run_ocr_on_crop(crop_path):
    """
    Run lightweight OCR on the crop image.
    Tries easyocr first, then pytesseract, then reports unavailable.
    Returns (recognized_text, ocr_engine) tuple.
    """
    # Try easyocr
    try:
        import easyocr
        reader = easyocr.Reader(['en'], verbose=False)
        results = reader.readtext(crop_path, detail=0)
        text = ' '.join(results).strip()
        return text, 'easyocr'
    except ImportError:
        pass
    except Exception as e:
        return f'(easyocr error: {e})', 'easyocr'

    # Try pytesseract
    try:
        import pytesseract
        from PIL import Image as PILImage
        img = PILImage.open(crop_path)
        text = pytesseract.image_to_string(img, config='--psm 8').strip()
        return text, 'pytesseract'
    except ImportError:
        pass
    except Exception as e:
        return f'(pytesseract error: {e})', 'pytesseract'

    return None, 'unavailable'


def save_crop(roi_path, box, crop_path, margin=4):
    """Save a tight crop of the bounding box from the ROI image."""
    try:
        import cv2
        img = cv2.imread(roi_path)
        if img is None:
            return False
        h, w = img.shape[:2]
        x1 = max(0, box['left'] - margin)
        y1 = max(0, box['top'] - margin)
        x2 = min(w, box['right'] + margin)
        y2 = min(h, box['bottom'] + margin)
        crop = img[y1:y2, x1:x2]
        os.makedirs(os.path.dirname(crop_path) or '.', exist_ok=True)
        cv2.imwrite(crop_path, crop)
        return True
    except Exception as e:
        print(f'  (crop save failed: {e})')
        return False


def save_overlay(roi_path, box, output_path, all_words_returned):
    """Draw the P8-B reference box (blue) and the P10-D result box (green) on the ROI."""
    try:
        import cv2
        img = cv2.imread(roi_path)
        if img is None:
            print(f'  (overlay skipped: cannot read {roi_path})')
            return

        # P8-B reference — blue
        cv2.rectangle(img,
                      (P8B_LAMB_BOX['left'], P8B_LAMB_BOX['top']),
                      (P8B_LAMB_BOX['right'], P8B_LAMB_BOX['bottom']),
                      (255, 80, 0), 2)
        cv2.putText(img, 'P8B-ref',
                    (P8B_LAMB_BOX['left'], max(0, P8B_LAMB_BOX['top'] - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 80, 0), 1, cv2.LINE_AA)

        # P10-D result — green
        if box:
            cv2.rectangle(img,
                          (box['left'], box['top']),
                          (box['right'], box['bottom']),
                          (0, 220, 0), 3)
            cv2.putText(img, 'P10D',
                        (box['left'], max(0, box['bottom'] + 20)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 220, 0), 2, cv2.LINE_AA)
        else:
            cv2.putText(img, 'P10D: NO BOX',
                        (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 220), 2, cv2.LINE_AA)

        os.makedirs(os.path.dirname(output_path) or '.', exist_ok=True)
        cv2.imwrite(output_path, img)
        print(f'  Overlay saved: {output_path}')
    except Exception as e:
        print(f'  (overlay skipped: {e})')


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if not os.path.exists(ROI_PATH):
    print(f'ERROR: Image not found: {ROI_PATH}')
    sys.exit(1)

api_key = os.environ.get('DASHSCOPE_API_KEY')
if not api_key:
    print('ERROR: DASHSCOPE_API_KEY is not set')
    sys.exit(1)

model = os.environ.get('P10D_MODEL', 'qwen-vl-plus')

print('=' * 60)
print('P10-D Word-list Grounding Validation')
print('=' * 60)
print(f'Model:         {model}')
print(f'Input image:   {ROI_PATH}')
print(f'Target word:   {TARGET_WORD}')
print(f'Subtitle:      {FULL_SUBTITLE}')
print(f'P8-B ref box:  {P8B_LAMB_BOX}')
print(f'Strategy:      Variant 5 word-list (P10-C validated)')
print()

image_b64 = load_image_base64(ROI_PATH)
prompt = build_word_list_prompt(FULL_SUBTITLE, TARGET_WORD)

print('Calling Qwen-VL API (word-list prompt)...')
try:
    response = call_qwen_vl(api_key, model, image_b64, prompt)
except Exception as e:
    print(f'API ERROR: {e}')
    sys.exit(1)

try:
    raw_text = extract_response_text(response)
except Exception as e:
    print(f'RESPONSE PARSE ERROR: {e}')
    print(f'Raw: {json.dumps(response, indent=2)[:500]}')
    sys.exit(1)

print(f'Raw response (first 600 chars):')
print(raw_text[:600])
if len(raw_text) > 600:
    print('...(truncated)')
print()

# Extract target word box from word list
box, all_words = parse_word_list_response(raw_text, TARGET_WORD)

print('-' * 60)
print('Grounding result')
print('-' * 60)
print(f'Words returned by model: {all_words}')
print(f'Extracted box for "{TARGET_WORD}": {box}')

if box is None:
    print()
    print('FAIL — could not extract bounding box for target word from word-list response')
    save_overlay(ROI_PATH, None, DEBUG_OVERLAY_PATH, all_words)
    sys.exit(1)

width = box['right'] - box['left']
height = box['bottom'] - box['top']
dx = abs(box['left'] - P8B_LAMB_BOX['left'])
dy = abs(box['top'] - P8B_LAMB_BOX['top'])
dw = abs(width - (P8B_LAMB_BOX['right'] - P8B_LAMB_BOX['left']))

print(f'Box dimensions:          {width}w x {height}h px')
print(f'Delta from P8-B ref:     Δleft={dx}px  Δtop={dy}px  Δwidth={dw}px')
print()

# Save overlay
save_overlay(ROI_PATH, box, DEBUG_OVERLAY_PATH, all_words)

# Save crop
print('Saving word crop for OCR verification...')
crop_saved = save_crop(ROI_PATH, box, CROP_PATH)

# OCR verification
print()
print('-' * 60)
print('OCR Verification')
print('-' * 60)

if not crop_saved:
    print('SKIP — crop could not be saved; OCR skipped')
    ocr_text = None
    ocr_engine = 'skipped'
else:
    ocr_text, ocr_engine = run_ocr_on_crop(CROP_PATH)
    print(f'OCR engine:       {ocr_engine}')
    print(f'OCR recognized:   "{ocr_text}"')

print()
print('=' * 60)
print('P10-D FINAL REPORT')
print('=' * 60)
print()
print(f'Model:               {model}')
print(f'Strategy:            Variant 5 word-list (P10-C validated)')
print(f'Target word:         {TARGET_WORD}')
print(f'P8-B reference box:  {P8B_LAMB_BOX}')
print(f'P10-D returned box:  {box}')
print(f'  Δleft={dx}px  Δtop={dy}px  Δwidth={dw}px')
print()

if ocr_text is not None and ocr_engine != 'unavailable':
    ocr_match = TARGET_WORD.lower() in ocr_text.lower()
    print(f'OCR engine:          {ocr_engine}')
    print(f'OCR recognized:      "{ocr_text}"')
    print(f'OCR reads "lamb":    {"YES" if ocr_match else "NO"}')
    print()
    if ocr_match:
        print('PASS — OCR confirms the cropped region contains the word "lamb".')
        print('The word-list grounding strategy is verified end-to-end.')
    else:
        print('FAIL — OCR did not read "lamb" from the cropped region.')
        print('The model box may still be misaligned with the rendered pixels.')
elif ocr_engine == 'unavailable':
    print('OCR:  Neither easyocr nor pytesseract is available.')
    print('      Cannot perform automated OCR verification.')
    print('      Manually inspect the crop image to confirm contents.')
    # Box-proximity verdict as fallback
    if dx <= 40 and dy <= 20:
        print()
        print('Box proximity: CLOSE to P8-B reference (within 40px horizontal tolerance).')
        print('Visual inspection of the overlay and crop is recommended.')
    else:
        print()
        print(f'Box proximity: DIFFERS from P8-B reference by Δleft={dx}px.')
else:
    print(f'OCR: {ocr_text}')

print()
print('Overlay image:  ', DEBUG_OVERLAY_PATH)
print('Crop image:     ', CROP_PATH)
print()
print('Files created:')
print('  scripts/p10d_word_list_grounding_validation.py')
if os.path.exists(DEBUG_OVERLAY_PATH):
    print(f'  {DEBUG_OVERLAY_PATH}')
if crop_saved and os.path.exists(CROP_PATH):
    print(f'  {CROP_PATH}')
print()
print('Files NOT modified:')
print('  script.js  |  Runtime  |  P1/P8 scripts  |  frozen documents')
print('=' * 60)
