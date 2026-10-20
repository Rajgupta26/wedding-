import cv2, numpy as np, sys
src, outdir = sys.argv[1], sys.argv[2]
img = cv2.imread(src); H, W = img.shape[:2]
clean = cv2.imread(f"{outdir}/card-clean.jpg")[:, :W]   # ignore the mirrored strip added on the right
# (cx, cy, radius) of each pearl flower, in image pixels
flowers = [(110, 105, 150), (35, 290, 72), (560, 1065, 175), (628, 850, 72)]
yy, xx = np.mgrid[0:H, 0:W]
mask = np.full((H, W), cv2.GC_BGD, np.uint8)
for cx, cy, r in flowers:
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    mask[(dist < r * 1.25) & (mask == cv2.GC_BGD)] = cv2.GC_PR_BGD
for cx, cy, r in flowers:
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    mask[dist < r * 0.85] = cv2.GC_PR_FGD
    mask[dist < r * 0.5] = cv2.GC_FGD
# the clean-plate difference is strong evidence too
a = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32); b = cv2.cvtColor(clean, cv2.COLOR_BGR2LAB).astype(np.float32)
d = cv2.GaussianBlur(np.sqrt(((a - b) ** 2).sum(axis=2)), (0, 0), 2)
bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
cv2.grabCut(img, mask, None, bgd, fgd, 8, cv2.GC_INIT_WITH_MASK)
fg = np.isin(mask, [cv2.GC_FGD, cv2.GC_PR_FGD]).astype(np.uint8) * 255
fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
n, lab, st, _ = cv2.connectedComponentsWithStats(fg)
keep = np.zeros_like(fg)
for k in range(1, n):
    if st[k, cv2.CC_STAT_AREA] > 3000: keep[lab == k] = 255
cnts, _ = cv2.findContours(keep, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
keep = np.zeros_like(keep); cv2.drawContours(keep, cnts, -1, 255, -1)
alpha = cv2.GaussianBlur(cv2.erode(keep, np.ones((3, 3), np.uint8)), (0, 0), 1.3)
# soft drop shadow baked under the petals so the cut-outs sit on the card naturally
shadow = cv2.GaussianBlur(cv2.dilate(keep, np.ones((5, 5), np.uint8)), (0, 0), 9).astype(np.float32) / 255 * 0.28
sh = np.roll(np.roll(shadow, 7, axis=0), 4, axis=1)
A = alpha.astype(np.float32) / 255
outA = A + sh * (1 - A)
shadow_col = np.array([70, 95, 125], np.float32)  # warm brown (BGR)
rgb = (img.astype(np.float32) * A[..., None] + shadow_col * (sh * (1 - A))[..., None]) / np.maximum(outA[..., None], 1e-4)
rgba = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), (outA * 255).astype(np.uint8)])
for name, (x0, y0, x1, y1) in {"flower-tl": (0, 0, .5, .36), "flower-br": (.5, .6, 1, 1)}.items():
    crop = rgba[int(y0*H):int(y1*H), int(x0*W):int(x1*W)]
    ys, xs = np.where(crop[..., 3] > 6)
    crop = crop[ys.min():ys.max()+1, xs.min():xs.max()+1]
    cv2.imwrite(f"{outdir}/{name}.webp", crop, [cv2.IMWRITE_WEBP_QUALITY, 90])
    print(name, crop.shape[1], "x", crop.shape[0], "at", int(x0*W)+xs.min(), int(y0*H)+ys.min())
