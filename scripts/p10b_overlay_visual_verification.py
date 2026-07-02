#!/usr/bin/env python3
"""
P10-B Overlay Visual Verification

Draws both the P8-B reference box and the P10-A grounding box on the
lamb subtitle ROI image so we can visually compare which box wraps
the rendered word "lamb" more accurately.

No AI calls. No PaddleOCR. No Runtime changes.
"""

import sys
import os

INPUT_PATH = os.path.join('tmp', 'p8_b_frames', 'frame_lamb_subtitle_roi.jpg')
OUTPUT_PATH = os.path.join('tmp', 'p10b_lamb_overlay_comparison.jpg')

P8B_BOX = {'left': 704, 'top': 234, 'right': 777, 'bottom': 278}
P10A_BOX = {'left': 758, 'top': 240, 'right': 836, 'bottom': 279}

if not os.path.exists(INPUT_PATH):
    print(f'ERROR: Image not found: {INPUT_PATH}')
    sys.exit(1)

try:
    import cv2
    import numpy as np
except ImportError:
    print('ERROR: opencv-python is required. Run: pip install opencv-python')
    sys.exit(1)

img = cv2.imread(INPUT_PATH)
if img is None:
    print(f'ERROR: Could not read image: {INPUT_PATH}')
    sys.exit(1)

# --- Draw P8-B box: blue (BGR: 255, 80, 0), thick border ---
cv2.rectangle(img,
              (P8B_BOX['left'], P8B_BOX['top']),
              (P8B_BOX['right'], P8B_BOX['bottom']),
              (255, 80, 0), 3)
cv2.putText(img, 'P8-B',
            (P8B_BOX['left'], max(0, P8B_BOX['top'] - 8)),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 80, 0), 2, cv2.LINE_AA)

# --- Draw P10-A box: green (BGR: 0, 210, 0), thick border ---
cv2.rectangle(img,
              (P10A_BOX['left'], P10A_BOX['top']),
              (P10A_BOX['right'], P10A_BOX['bottom']),
              (0, 210, 0), 3)
cv2.putText(img, 'P10-A',
            (P10A_BOX['left'], max(0, P10A_BOX['bottom'] + 20)),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 210, 0), 2, cv2.LINE_AA)

os.makedirs('tmp', exist_ok=True)
cv2.imwrite(OUTPUT_PATH, img)

print('==================================================')
print('P10-B Overlay Visual Verification')
print('==================================================')
print(f'Input:   {INPUT_PATH}')
print(f'Output:  {OUTPUT_PATH}')
print('')
print(f'P8-B box  (blue):  left={P8B_BOX["left"]} top={P8B_BOX["top"]} right={P8B_BOX["right"]} bottom={P8B_BOX["bottom"]}  ({P8B_BOX["right"]-P8B_BOX["left"]}w x {P8B_BOX["bottom"]-P8B_BOX["top"]}h px)')
print(f'P10-A box (green): left={P10A_BOX["left"]} top={P10A_BOX["top"]} right={P10A_BOX["right"]} bottom={P10A_BOX["bottom"]}  ({P10A_BOX["right"]-P10A_BOX["left"]}w x {P10A_BOX["bottom"]-P10A_BOX["top"]}h px)')
print('')
print('Open the output image to inspect which box wraps the word "lamb" more accurately.')
print('==================================================')
