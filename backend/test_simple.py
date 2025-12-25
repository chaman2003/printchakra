"""
Simple CamScanner-style processing test
"""
import cv2
import numpy as np
import os

INPUT = r"C:\Users\chama\OneDrive\Desktop\printchakra\original.jpg"
OUTPUT = r"C:\Users\chama\OneDrive\Desktop\printchakra\test_outputs\SIMPLE_OUTPUT.jpg"

def find_document(image):
    scale = 0.25
    small = cv2.resize(image, (0, 0), fx=scale, fy=scale)
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    for low, high in [(30, 100), (50, 150), (75, 200)]:
        edges = cv2.Canny(blurred, low, high)
        edges = cv2.dilate(edges, np.ones((2, 2)), iterations=2)
        contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:10]
        
        for c in contours:
            peri = cv2.arcLength(c, True)
            approx = cv2.approxPolyDP(c, 0.02 * peri, True)
            if len(approx) == 4:
                area = cv2.contourArea(approx)
                if area > small.shape[0] * small.shape[1] * 0.1:
                    return (approx.reshape(4, 2) / scale).astype(np.float32)
    return None

def order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect

def four_point_transform(image, pts):
    rect = order_points(pts)
    (tl, tr, br, bl) = rect
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))
    dst = np.array([[0, 0], [maxWidth - 1, 0], [maxWidth - 1, maxHeight - 1], [0, maxHeight - 1]], dtype="float32")
    M = cv2.getPerspectiveTransform(rect, dst)
    return cv2.warpPerspective(image, M, (maxWidth, maxHeight))

def enhance_simple(gray):
    """
    Simple enhancement: shadow removal + white background
    NO thresholding, NO morphology - natural look
    """
    h, w = gray.shape
    
    # Background estimation (downscaled for speed)
    max_dim = 800
    scale = min(max_dim / max(h, w), 1.0)
    if scale < 1.0:
        small = cv2.resize(gray, (int(w * scale), int(h * scale)))
    else:
        small = gray
    
    sh, sw = small.shape
    k = max(sh, sw) // 8
    k = k if k % 2 == 1 else k + 1
    k = max(31, min(k, 127))
    
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    bg = cv2.morphologyEx(small, cv2.MORPH_CLOSE, kernel)
    bg = cv2.GaussianBlur(bg, (k, k), 0)
    
    if scale < 1.0:
        bg = cv2.resize(bg, (w, h), interpolation=cv2.INTER_LINEAR)
        bg = cv2.GaussianBlur(bg, (31, 31), 0)
    
    # Normalize illumination (remove shadows)
    result = np.zeros_like(gray, dtype=np.float32)
    mask = bg > 10
    result[mask] = (gray[mask].astype(np.float32) / bg[mask].astype(np.float32)) * 255
    result = np.clip(result, 0, 255).astype(np.uint8)
    
    # Make background white
    p95 = np.percentile(result, 95)
    if 0 < p95 < 250:
        result = np.clip(result.astype(np.float32) * (255.0 / p95), 0, 255).astype(np.uint8)
    
    # Gentle gamma for slightly darker text
    gamma = 0.9
    table = np.array([((i / 255.0) ** (1.0 / gamma)) * 255 for i in range(256)]).astype("uint8")
    result = cv2.LUT(result, table)
    
    return result

# Main
print("Loading...")
img = cv2.imread(INPUT)
print(f"Loaded: {img.shape[1]}x{img.shape[0]}")

print("Detecting document...")
pts = find_document(img)
if pts is not None:
    warped = four_point_transform(img, pts)
    print(f"Cropped: {warped.shape[1]}x{warped.shape[0]}")
else:
    warped = img
    print("Using full image")

print("Processing...")
gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
result = enhance_simple(gray)

print("Saving...")
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
cv2.imwrite(OUTPUT, result, [cv2.IMWRITE_JPEG_QUALITY, 95])
print(f"Done: {OUTPUT}")

# Open
import subprocess
subprocess.Popen(['start', '', OUTPUT], shell=True)
