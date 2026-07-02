#!/usr/bin/env python3
"""
P10-C Prompt Constraint Validation

Tests whether stricter vision-language grounding prompts can make the model
correctly locate the rendered English subtitle word "lamb" in the ROI image.

Input:  tmp/p8_b_frames/frame_lamb_subtitle_roi.jpg  (1920x324 px)
Output: tmp/p10c_variant_N_<slug>.jpg  (one overlay per prompt variant)
        stdout: full report

No PaddleOCR. No Runtime changes. No script.js changes. No production pipeline.
"""

import sys
import os
import json
import base64
import re

ROI_PATH = os.path.join('tmp', 'p8_b_frames', 'frame_lamb_subtitle_roi.jpg')
OUTPUT_DIR = 'tmp'
TARGET_WORD = 'lamb'

# P8-B word-list reference boxes (all on the same horizontal band top=234 bottom=278)
# "our"   left=592  right=629
# "little" left=635 right=698
# "lamb"  left=704  right=777   <-- expected correct answer
# "is"    left=783  right=804
P8B_LAMB_BOX = {'left': 704, 'top': 234, 'right': 777, 'bottom': 278}
P8B_OUR_BOX  = {'left': 592, 'top': 234, 'right': 629, 'bottom': 278}

FULL_SUBTITLE = 'Can you believe our little lamb is finally getting married?'

# ---------------------------------------------------------------------------
# Prompt variants
# ---------------------------------------------------------------------------
# Each variant adds a new constraint layer on top of the previous one.

VARIANTS = [
    {
        'id': 1,
        'slug': 'position_anchor',
        'description': 'Anchor by position: lamb is word 6 (1-indexed) in the subtitle line',
        'prompt': (
            'This image is a 1920x324 pixel crop containing a single line of white burned-in '
            'English subtitle text at the bottom of a TV frame. '
            'The full subtitle reads exactly: '
            '"Can you believe our little lamb is finally getting married?" '
            'That sentence has 10 words. '
            'Count the words left-to-right: '
            '1=Can 2=you 3=believe 4=our 5=little 6=lamb 7=is 8=finally 9=getting 10=married? '
            'Return the pixel bounding box for word number 6, which is the word "lamb". '
            'Return ONLY a JSON object: '
            '{"left": <int>, "top": <int>, "right": <int>, "bottom": <int>}. '
            'No other text.'
        ),
    },
    {
        'id': 2,
        'slug': 'neighbor_exclusion',
        'description': 'Explicit neighbor exclusion: do NOT return our, little, or is',
        'prompt': (
            'This image is a 1920x324 pixel subtitle strip. '
            'The English subtitle text reads: '
            '"Can you believe our little lamb is finally getting married?" '
            'Find and return the bounding box of the rendered letters of the word "lamb" only. '
            'IMPORTANT constraints: '
            '- Do NOT return a box for the word "our". '
            '- Do NOT return a box for the word "little". '
            '- Do NOT return a box for the word "is". '
            '- Do NOT return a box covering the whole sentence. '
            '- "lamb" appears AFTER "little" and BEFORE "is" in the rendered subtitle. '
            '- "lamb" is rendered to the RIGHT of "little" and to the LEFT of "is". '
            'Return ONLY this JSON: '
            '{"left": <int>, "top": <int>, "right": <int>, "bottom": <int>}. '
            'No explanation. Just the JSON.'
        ),
    },
    {
        'id': 3,
        'slug': 'x_range_hint',
        'description': 'Provide approximate x-range hint: lamb is in the right half of the image',
        'prompt': (
            'This image is a 1920x324 pixel subtitle strip from a TV show. '
            'The white burned-in English subtitle reads: '
            '"Can you believe our little lamb is finally getting married?" '
            'The subtitle text is centered horizontally in the 1920px wide image. '
            'The word "lamb" is approximately in the horizontal range x=680 to x=800. '
            'Locate the exact rendered letters of the word "lamb" in that horizontal region. '
            '"lamb" comes right after the word "little" and right before the word "is". '
            'Return ONLY a JSON bounding box for the letters of "lamb": '
            '{"left": <int>, "top": <int>, "right": <int>, "bottom": <int>}. '
            'The left edge of "lamb" must be greater than 680. '
            'Do not return the box for "our" (which is around x=590 to x=630). '
            'Just the JSON, nothing else.'
        ),
    },
    {
        'id': 4,
        'slug': 'step_by_step_read',
        'description': 'Step-by-step: first read the full line, then identify lamb, then return box',
        'prompt': (
            'This image contains a white English subtitle line burned into a TV frame. '
            'Step 1: Read the full subtitle text from left to right. '
            'Step 2: Confirm the subtitle reads: '
            '"Can you believe our little lamb is finally getting married?" '
            'Step 3: Identify the 6th word: it is "lamb". '
            'Step 4: "lamb" is rendered AFTER the word "little" and BEFORE the word "is" '
            'in the horizontal layout. '
            'Step 5: Return the pixel bounding box that tightly wraps the 4 characters '
            'l-a-m-b as rendered in this image. '
            'Your final answer must be ONLY a JSON object: '
            '{"left": <int>, "top": <int>, "right": <int>, "bottom": <int>}. '
            'Do not include step explanations in your final answer. Just output the JSON.'
        ),
    },
    {
        'id': 5,
        'slug': 'word_list_json',
        'description': 'Ask for full word-box list and extract lamb entry from it',
        'prompt': (
            'This image is a 1920x324 pixel subtitle ROI. '
            'The English subtitle text is: '
            '"Can you believe our little lamb is finally getting married?" '
            'Return a JSON array listing EVERY word in the subtitle with its bounding box. '
            'Format: [{"word": "Can", "left": <int>, "top": <int>, "right": <int>, "bottom": <int>}, ...] '
            'Include all 10 words in left-to-right order: '
            'Can, you, believe, our, little, lamb, is, finally, getting, married? '
            'Return ONLY the JSON array. No other text.'
        ),
    },
]

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
        raw = ' '.join(item.get('text', '') if isinstance(item, dict) else str(item) for item in raw)
    return raw.strip()


def parse_single_box(text):
    """Extract a single {left,top,right,bottom} box from model text."""
    # JSON object with left/top/right/bottom
    m = re.search(
        r'\{[^{}]*"left"\s*:\s*(\d+)[^{}]*"top"\s*:\s*(\d+)[^{}]*"right"\s*:\s*(\d+)[^{}]*"bottom"\s*:\s*(\d+)[^{}]*\}',
        text)
    if m:
        return {'left': int(m.group(1)), 'top': int(m.group(2)),
                'right': int(m.group(3)), 'bottom': int(m.group(4)), 'format': 'json_ltrb'}

    # <box>(x1,y1,x2,y2)</box>
    m = re.search(r'<box>\s*\(?\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)?\s*</box>', text)
    if m:
        return {'left': int(m.group(1)), 'top': int(m.group(2)),
                'right': int(m.group(3)), 'bottom': int(m.group(4)), 'format': 'box_tag'}

    # x1=N y1=N x2=N y2=N
    m = re.search(r'x1\s*[=:]\s*(\d+)[,\s]+y1\s*[=:]\s*(\d+)[,\s]+x2\s*[=:]\s*(\d+)[,\s]+y2\s*[=:]\s*(\d+)',
                  text, re.IGNORECASE)
    if m:
        return {'left': int(m.group(1)), 'top': int(m.group(2)),
                'right': int(m.group(3)), 'bottom': int(m.group(4)), 'format': 'xy_named'}

    return None


def parse_word_list(text):
    """For variant 5: extract the 'lamb' entry from a word-list JSON array."""
    # Try to extract the JSON array
    m = re.search(r'\[.*?\]', text, re.DOTALL)
    if not m:
        return None
    try:
        entries = json.loads(m.group(0))
    except Exception:
        return None
    for entry in entries:
        if isinstance(entry, dict) and entry.get('word', '').lower() == 'lamb':
            try:
                return {
                    'left': int(entry['left']), 'top': int(entry['top']),
                    'right': int(entry['right']), 'bottom': int(entry['bottom']),
                    'format': 'word_list',
                }
            except Exception:
                return None
    return None


def save_overlay(roi_path, variant_box, output_path, variant_id, variant_slug):
    try:
        import cv2
        img = cv2.imread(roi_path)
        if img is None:
            print(f'  (overlay skipped: cannot read {roi_path})')
            return

        # Draw P8-B reference box for "lamb" — blue
        cv2.rectangle(img, (P8B_LAMB_BOX['left'], P8B_LAMB_BOX['top']),
                      (P8B_LAMB_BOX['right'], P8B_LAMB_BOX['bottom']), (255, 80, 0), 2)
        cv2.putText(img, 'P8B-lamb',
                    (P8B_LAMB_BOX['left'], max(0, P8B_LAMB_BOX['top'] - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 80, 0), 1, cv2.LINE_AA)

        # Draw P8-B reference box for "our" — orange (to show where "our" actually is)
        cv2.rectangle(img, (P8B_OUR_BOX['left'], P8B_OUR_BOX['top']),
                      (P8B_OUR_BOX['right'], P8B_OUR_BOX['bottom']), (0, 140, 255), 2)
        cv2.putText(img, 'P8B-our',
                    (P8B_OUR_BOX['left'], max(0, P8B_OUR_BOX['bottom'] + 18)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 140, 255), 1, cv2.LINE_AA)

        # Draw variant result box — green
        if variant_box:
            cv2.rectangle(img, (variant_box['left'], variant_box['top']),
                          (variant_box['right'], variant_box['bottom']), (0, 220, 0), 3)
            label = f'V{variant_id}'
            cv2.putText(img, label,
                        (variant_box['left'], max(0, variant_box['bottom'] + 20)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 220, 0), 2, cv2.LINE_AA)
        else:
            # No box parsed — draw a red "NO BOX" notice
            cv2.putText(img, f'V{variant_id}: NO BOX PARSED',
                        (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 220), 2, cv2.LINE_AA)

        os.makedirs(OUTPUT_DIR, exist_ok=True)
        cv2.imwrite(output_path, img)
        print(f'  Overlay saved: {output_path}')
    except Exception as e:
        print(f'  (overlay skipped: {e})')


def classify_result(box):
    """Return 'CORRECT', 'WRONG_OUR', 'WRONG_OTHER', or 'NO_BOX'."""
    if box is None:
        return 'NO_BOX'
    # Tolerance: within 40px horizontally of P8-B lamb box
    left_ok = abs(box['left'] - P8B_LAMB_BOX['left']) <= 40
    right_ok = abs(box['right'] - P8B_LAMB_BOX['right']) <= 40
    # Check if it looks like "our" box
    is_our = abs(box['left'] - P8B_OUR_BOX['left']) <= 40
    if is_our:
        return 'WRONG_OUR'
    if left_ok and right_ok:
        return 'CORRECT'
    if left_ok or right_ok:
        return 'PARTIAL'
    return 'WRONG_OTHER'


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

model = os.environ.get('P10C_MODEL', 'qwen-vl-plus')
image_b64 = load_image_base64(ROI_PATH)

print('=' * 60)
print('P10-C Prompt Constraint Validation')
print('=' * 60)
print(f'Model:         {model}')
print(f'Input image:   {ROI_PATH}')
print(f'Target word:   {TARGET_WORD}')
print(f'Subtitle:      {FULL_SUBTITLE}')
print(f'P8-B lamb box: {P8B_LAMB_BOX}')
print(f'P8-B our  box: {P8B_OUR_BOX}  (wrong answer reference)')
print(f'Variants:      {len(VARIANTS)}')
print()

results = []

for v in VARIANTS:
    print(f'--- Variant {v["id"]}: {v["slug"]} ---')
    print(f'Description: {v["description"]}')

    try:
        response = call_qwen_vl(api_key, model, image_b64, v['prompt'])
    except Exception as e:
        print(f'  API ERROR: {e}')
        results.append({'variant': v['id'], 'slug': v['slug'], 'box': None,
                        'raw': None, 'verdict': 'API_ERROR', 'overlay': None})
        print()
        continue

    try:
        raw_text = extract_response_text(response)
    except Exception as e:
        print(f'  RESPONSE PARSE ERROR: {e}')
        results.append({'variant': v['id'], 'slug': v['slug'], 'box': None,
                        'raw': None, 'verdict': 'PARSE_ERROR', 'overlay': None})
        print()
        continue

    print(f'  Raw response: {raw_text[:300]}{"..." if len(raw_text) > 300 else ""}')

    # Variant 5 uses word-list format
    if v['id'] == 5:
        box = parse_word_list(raw_text)
        if box is None:
            # fallback: try single-box parse on the raw text
            box = parse_single_box(raw_text)
    else:
        box = parse_single_box(raw_text)

    verdict = classify_result(box)
    print(f'  Parsed box:  {box}')
    print(f'  Verdict:     {verdict}')

    overlay_path = os.path.join(OUTPUT_DIR, f'p10c_variant_{v["id"]}_{v["slug"]}.jpg')
    save_overlay(ROI_PATH, box, overlay_path, v['id'], v['slug'])

    results.append({
        'variant': v['id'],
        'slug': v['slug'],
        'description': v['description'],
        'box': box,
        'raw_excerpt': raw_text[:400],
        'verdict': verdict,
        'overlay': overlay_path,
    })
    print()

# ---------------------------------------------------------------------------
# Final report
# ---------------------------------------------------------------------------
print('=' * 60)
print('P10-C FINAL REPORT')
print('=' * 60)
print()
print(f'Model used: {model}')
print(f'Target: "{TARGET_WORD}"  |  Expected box: {P8B_LAMB_BOX}')
print()
print(f'{"V#":<4} {"Slug":<25} {"Box":<40} {"Verdict"}')
print('-' * 90)
for r in results:
    box_str = str(r['box']) if r['box'] else 'None'
    print(f'{r["variant"]:<4} {r["slug"]:<25} {box_str:<40} {r["verdict"]}')

print()
correct = [r for r in results if r['verdict'] == 'CORRECT']
partial = [r for r in results if r['verdict'] == 'PARTIAL']
wrong_our = [r for r in results if r['verdict'] == 'WRONG_OUR']

if correct:
    print(f'PASS — Variant(s) that correctly located "lamb": {[r["variant"] for r in correct]}')
elif partial:
    print(f'PARTIAL — Variant(s) with partially correct box: {[r["variant"] for r in partial]}')
else:
    print('FAIL — No variant correctly located "lamb".')
    if wrong_our:
        print(f'Variants that returned "our" box: {[r["variant"] for r in wrong_our]}')

print()
print('Overlay images:')
for r in results:
    if r['overlay']:
        print(f'  V{r["variant"]}: {r["overlay"]}')

print()
print('Files created:')
print(f'  scripts/p10c_prompt_constraint_validation.py')
for r in results:
    if r['overlay'] and os.path.exists(r['overlay']):
        print(f'  {r["overlay"]}')

print()
print('Next recommended step:')
if correct:
    print('  At least one prompt variant succeeded. Freeze the winning prompt as P10-C result.')
    print('  Next: P10-D — integrate the validated prompt into the P8-B visual mapping pipeline.')
else:
    print('  No prompt variant successfully located "lamb".')
    print('  This confirms the model cannot reliably locate the correct word via prompting alone.')
    print('  Next: Consider P10-D — use OCR or pixel-level verification to ground the model output,')
    print('  or accept that this model tier cannot solve single-word localization reliably.')

print('=' * 60)
