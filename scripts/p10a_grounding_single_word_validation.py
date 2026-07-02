#!/usr/bin/env python3
"""
P10-A Vision-Language Grounding Single-word Validation

Validates whether Qwen-VL (via DashScope) can locate the exact burned English
subtitle word "lamb" in the existing subtitle ROI frame using a grounding prompt.

Input:  tmp/p8_b_frames/frame_lamb_subtitle_roi.jpg
Output: tmp/p10a_lamb_grounding_debug.jpg (visualization)
        stdout: bounding box evidence and pass/fail verdict

No Runtime integration. No JSON artifact modification.
"""

import sys
import os
import json
import base64
import re

ROI_PATH = os.path.join('tmp', 'p8_b_frames', 'frame_lamb_subtitle_roi.jpg')
DEBUG_OUTPUT_PATH = os.path.join('tmp', 'p10a_lamb_grounding_debug.jpg')
TARGET_WORD = 'lamb'

# Known P8-B reference box for comparison (from p8_b_real_ai_visual_mapping_probe.json)
P8B_REF_BOX = {'left': 704, 'top': 234, 'right': 777, 'bottom': 278}


def load_image_base64(path):
    with open(path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')


def call_qwen_vl(api_key, model, image_b64, prompt):
    import urllib.request
    url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
    payload = json.dumps({
        'model': model,
        'input': {
            'messages': [
                {
                    'role': 'user',
                    'content': [
                        {'image': f'data:image/jpeg;base64,{image_b64}'},
                        {'text': prompt},
                    ],
                }
            ]
        },
        'parameters': {'result_format': 'message'},
    }).encode('utf-8')

    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode('utf-8'))


def parse_bounding_box(text):
    """Parse bounding box from various Qwen-VL response formats.

    Handles:
      1. JSON  {"left": N, "top": N, "right": N, "bottom": N}
      2. Qwen2 <box>(x1,y1,x2,y2)</box>
      3. Plain coordinate mentions (fallback)
    """
    # Try JSON object
    m = re.search(r'\{[^{}]*"left"\s*:\s*(\d+)[^{}]*"top"\s*:\s*(\d+)[^{}]*"right"\s*:\s*(\d+)[^{}]*"bottom"\s*:\s*(\d+)[^{}]*\}', text)
    if m:
        return {
            'left': int(m.group(1)),
            'top': int(m.group(2)),
            'right': int(m.group(3)),
            'bottom': int(m.group(4)),
            'format': 'json_ltrb',
        }

    # Try <box>(x1,y1,x2,y2)</box>
    m = re.search(r'<box>\s*\(?\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)?\s*</box>', text)
    if m:
        return {
            'left': int(m.group(1)),
            'top': int(m.group(2)),
            'right': int(m.group(3)),
            'bottom': int(m.group(4)),
            'format': 'box_tag',
        }

    # Try x1,y1,x2,y2 bare numbers
    m = re.search(r'x1\s*[=:]\s*(\d+)[,\s]+y1\s*[=:]\s*(\d+)[,\s]+x2\s*[=:]\s*(\d+)[,\s]+y2\s*[=:]\s*(\d+)', text, re.IGNORECASE)
    if m:
        return {
            'left': int(m.group(1)),
            'top': int(m.group(2)),
            'right': int(m.group(3)),
            'bottom': int(m.group(4)),
            'format': 'xy_named',
        }

    return None


def save_debug_visualization(roi_path, bb, p8b_ref, output_path):
    try:
        import cv2
        import numpy as np

        img = cv2.imread(roi_path)
        if img is None:
            print('(OpenCV: could not read image for visualization)')
            return

        # Draw P8-B reference box in blue
        cv2.rectangle(img,
                      (p8b_ref['left'], p8b_ref['top']),
                      (p8b_ref['right'], p8b_ref['bottom']),
                      (255, 100, 0), 2)
        cv2.putText(img, 'P8B-ref', (p8b_ref['left'], max(0, p8b_ref['top'] - 6)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 100, 0), 1, cv2.LINE_AA)

        # Draw P10-A result box in green
        if bb:
            cv2.rectangle(img,
                          (bb['left'], bb['top']),
                          (bb['right'], bb['bottom']),
                          (0, 220, 0), 2)
            cv2.putText(img, 'P10A', (bb['left'], max(0, bb['top'] - 6)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 220, 0), 1, cv2.LINE_AA)

        os.makedirs('tmp', exist_ok=True)
        cv2.imwrite(output_path, img)
        print(f'Debug visualization saved: {output_path}')
    except Exception as e:
        print(f'(Visualization skipped: {e})')


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

model = os.environ.get('P10A_MODEL', 'qwen-vl-plus')

print('==================================================')
print('P10-A Vision-Language Grounding — lamb validation')
print('==================================================')
print(f'Model:       {model}')
print(f'Input image: {ROI_PATH}')
print(f'Target word: {TARGET_WORD}')
print('')

# Load image
image_b64 = load_image_base64(ROI_PATH)

# Grounding prompt: explicitly ask for the bounding box of the exact word "lamb"
prompt = (
    'This image is a cropped subtitle region from a TV show frame. '
    'The image coordinate origin (0,0) is at the top-left corner. '
    'Locate the exact rendered English word "lamb" in the white burned-in subtitle text. '
    'Return ONLY a JSON object with the pixel bounding box of the word "lamb": '
    '{"left": <x of left edge>, "top": <y of top edge>, "right": <x of right edge>, "bottom": <y of bottom edge>}. '
    'Do not return any other text. Do not describe the image. Just the JSON.'
)

print('Calling Qwen-VL API...')

try:
    response = call_qwen_vl(api_key, model, image_b64, prompt)
except Exception as e:
    print(f'API ERROR: {e}')
    sys.exit(1)

# Extract response text
try:
    raw_text = response['output']['choices'][0]['message']['content']
    if isinstance(raw_text, list):
        raw_text = ' '.join(
            item.get('text', '') if isinstance(item, dict) else str(item)
            for item in raw_text
        )
    raw_text = raw_text.strip()
except Exception as e:
    print(f'RESPONSE PARSE ERROR: {e}')
    print(f'Raw response: {json.dumps(response, indent=2)[:500]}')
    sys.exit(1)

print(f'Raw response text:')
print(raw_text)
print('')

# Parse bounding box
bb = parse_bounding_box(raw_text)

print('--------------------------------------------------')
print('P10-A Result')
print('--------------------------------------------------')
print('')
print(f'P8-B reference box for "lamb": {P8B_REF_BOX}')

if bb:
    print(f'P10-A grounding box for "lamb": {json.dumps(bb)}')

    # Check if box has reasonable dimensions for one word
    width = bb['right'] - bb['left']
    height = bb['bottom'] - bb['top']

    # Compare with P8-B reference
    dx = abs(bb['left'] - P8B_REF_BOX['left'])
    dy = abs(bb['top'] - P8B_REF_BOX['top'])
    dw = abs((bb['right'] - bb['left']) - (P8B_REF_BOX['right'] - P8B_REF_BOX['left']))

    print(f'')
    print(f'Word box dimensions:   {width}w x {height}h px')
    print(f'Delta from P8-B ref:   dx={dx}px  dy={dy}px  dw={dw}px')
    print('')

    reasonable = (20 < width < 200) and (5 < height < 100)
    close_to_ref = (dx <= 40) and (dy <= 20)

    if reasonable and close_to_ref:
        print('P10-A PASSED — "lamb" grounding box is reasonable and close to P8-B reference')
    elif reasonable:
        print('P10-A PARTIAL — box is reasonable dimensions but differs from P8-B reference')
    else:
        print('P10-A FAILED — box dimensions are not plausible for a single word')
else:
    print('P10-A FAILED — could not parse bounding box from response')

print('')
print('==================================================')

# Save visualization
save_debug_visualization(ROI_PATH, bb, P8B_REF_BOX, DEBUG_OUTPUT_PATH)
