"""Make the lighter intro frame set used on phones/tablets (540x1000 instead of 702x1300).

usage: python3 tools/mobile_frames.py assets/intro assets/intro-m
"""
import os, sys
import cv2

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
total = 0
for name in sorted(os.listdir(src)):
    if not name.endswith(".webp"):
        continue
    im = cv2.imread(os.path.join(src, name))
    small = cv2.resize(im, (540, 1000), interpolation=cv2.INTER_AREA)
    path = os.path.join(out, name)
    cv2.imwrite(path, small, [cv2.IMWRITE_WEBP_QUALITY, 66])
    total += os.path.getsize(path)
print(f"{len(os.listdir(out))} frames, {total / 1e6:.2f} MB")
