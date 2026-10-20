import cv2, numpy as np, sys
src, outdir = sys.argv[1], sys.argv[2]
img = cv2.imread(src); H, W = img.shape[:2]
mir = img[:, ::-1]
def soft_rect(x0, y0, x1, y1, f):
    m = np.zeros((H, W), np.float32); m[max(0,int(y0*H)):int(y1*H), max(0,int(x0*W)):int(x1*W)] = 1
    return cv2.GaussianBlur(m, (0, 0), f)
# regions holding the flowers (fractions of the image)
tl = soft_rect(-.1, -.1, .47, .33, 14)
br = soft_rect(.52, .62, 1.1, 1.1, 14)
blend = np.clip(tl + br, 0, 1)[..., None]
clean = (img * (1 - blend) + mir * blend).astype(np.uint8)
# the source art is cropped off-centre (frame centred at x=367.5 of 675): mirror the missing lace
# onto the right edge so the frame sits in the middle of the image
ext = int(round(2 * 367.5 - W))
cv2.imwrite(f"{outdir}/card-clean.jpg", np.hstack([clean, clean[:, ext:0:-1]]), [cv2.IMWRITE_JPEG_QUALITY, 88])

# flower alpha from the difference to the clean plate
a = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32); b = cv2.cvtColor(clean, cv2.COLOR_BGR2LAB).astype(np.float32)
d = np.sqrt(((a - b) ** 2).sum(axis=2))
d = cv2.GaussianBlur(d, (0, 0), 2.5)
alpha = np.clip((d - 6) / 10, 0, 1)
alpha = cv2.morphologyEx((alpha * 255).astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
# fill interior holes
ff = (alpha > 90).astype(np.uint8) * 255
cnts, _ = cv2.findContours(ff, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
fill = np.zeros_like(ff)
for c in cnts:
    if cv2.contourArea(c) > 1500: cv2.drawContours(fill, [c], -1, 255, -1)
alpha = np.maximum(alpha, cv2.GaussianBlur(fill, (0, 0), 1.5))
alpha = (alpha.astype(np.float32) / 255) * np.clip(tl + br, 0, 1)
alpha = cv2.GaussianBlur(alpha, (0, 0), 1.2)
rgba = np.dstack([img, (alpha * 255).astype(np.uint8)])
for name, (x0, y0, x1, y1) in {"flower-tl": (0, 0, .47, .33), "flower-br": (.52, .62, 1, 1)}.items():
    crop = rgba[int(y0*H):int(y1*H), int(x0*W):int(x1*W)]
    ys, xs = np.where(crop[..., 3] > 8)
    crop = crop[ys.min():ys.max()+1, xs.min():xs.max()+1]
    cv2.imwrite(f"{outdir}/{name}.webp", crop, [cv2.IMWRITE_WEBP_QUALITY, 90])
    print(name, crop.shape[1], "x", crop.shape[0], "offset", int(x0*W)+xs.min(), int(y0*H)+ys.min())

