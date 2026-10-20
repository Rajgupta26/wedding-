"""Remove the baked-in title text from a video frame (mask by local contrast + brown hue, then inpaint)."""
import cv2, numpy as np, sys
K17 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))
K5 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
def text_mask(f):
    H, W = f.shape[:2]
    med = f.astype(np.float32)
    gray = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32)
    bg = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, K17)
    dark = bg - gray
    b, g, r = med[...,0], med[...,1], med[...,2]
    region = np.zeros((H, W), bool); region[int(.307*H):int(.655*H), int(.19*W):int(.80*W)] = True
    weak = (dark > 12) & ((r - b) > 12) & region
    core = (dark > 42) & ((r - b) > 48) & region
    n, lab = cv2.connectedComponents(weak.astype(np.uint8), connectivity=8)
    good = np.unique(lab[core]); good = good[good > 0]
    m = np.isin(lab, good).astype(np.uint8) * 255
    return cv2.dilate(m, K5)
def detext(f):
    return cv2.inpaint(f, text_mask(f), 6, cv2.INPAINT_TELEA)
