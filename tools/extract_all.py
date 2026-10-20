"""Dump every frame of the reference video as PNG.  usage: extract_all.py <video> <out_dir>"""
import cv2, sys, os
src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
cap = cv2.VideoCapture(src); i = 0
while True:
    ok, fr = cap.read()
    if not ok: break
    cv2.imwrite(os.path.join(out, f"f{i:03d}.png"), fr); i += 1
print(i)
