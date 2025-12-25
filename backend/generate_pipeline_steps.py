"""
Complete CamScanner processing pipeline with step-by-step output images
"""
import cv2
import numpy as np
import os

INPUT = r"C:\Users\chama\OneDrive\Desktop\printchakra\original.jpg"
OUTPUT_DIR = r"C:\Users\chama\OneDrive\Desktop\printchakra\test_outputs"

os.makedirs(OUTPUT_DIR, exist_ok=True)

def find_document(image):
    """Detect document boundaries"""
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

def main():
    print("\n" + "="*70)
    print("CAMSCANNER DOCUMENT PROCESSING PIPELINE - STEP BY STEP")
    print("="*70)
    
    # STEP 1: Load Original
    print("\n[STEP 1] LOADING ORIGINAL IMAGE")
    print("-" * 70)
    image = cv2.imread(INPUT)
    if image is None:
        print("ERROR: Could not load image")
        return
    print(f"✓ Loaded: {image.shape[1]}x{image.shape[0]} pixels")
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step_01_original.jpg"), image)
    
    # STEP 2: Downscale for Detection
    print("\n[STEP 2] DOWNSCALE FOR DETECTION")
    print("-" * 70)
    scale = 0.25
    small = cv2.resize(image, (0, 0), fx=scale, fy=scale)
    print(f"✓ Downscaled to: {small.shape[1]}x{small.shape[0]} (scale={scale})")
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step_02_downscaled.jpg"), small)

    # STEP 3: Grayscale (Detection)
    print("\n[STEP 3] GRAYSCALE (DETECTION)")
    print("-" * 70)
    gray_small = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    print(f"✓ Converted detection image to grayscale")
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step_03_grayscale_detect.jpg"), gray_small)

    # STEP 4: Gaussian Blur
    print("\n[STEP 4] GAUSSIAN BLUR")
    print("-" * 70)
    blurred = cv2.GaussianBlur(gray_small, (5, 5), 0)
    print(f"✓ Applied 5x5 Gaussian blur")
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step_04_blurred.jpg"), blurred)

    # STEP 5: Canny Edge Detection
    print("\n[STEP 5] CANNY EDGE DETECTION")
    print("-" * 70)
    edges = cv2.Canny(blurred, 50, 150)
    edges_dilated = cv2.dilate(edges, np.ones((2, 2)), iterations=2)
    print(f"✓ Edges detected and dilated")
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step_05_edges.jpg"), edges_dilated)

    # STEP 6: Find Document Contour
    print("\n[STEP 6] FIND DOCUMENT CONTOUR")
    print("-" * 70)
    pts = find_document(image) # This repeats detection internally, but we use the result for vis
    vis = image.copy()
    if pts is not None:
        pts_int = pts.astype(int)
        cv2.polylines(vis, [pts_int], True, (0, 255, 0), 3)
        print(f"✓ Document contour found")
    else:
        print("! No contour found")
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step_06_contour.jpg"), vis)

    # STEP 7: Perspective Transform
    print("\n[STEP 7] PERSPECTIVE TRANSFORM")
    print("-" * 70)
    if pts is not None:
        warped = four_point_transform(image, pts)
        print(f"✓ Image warped and cropped")
    else:
        warped = image
        print("! Using original image")
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step_07_warped.jpg"), warped)

    # STEP 8: Grayscale (Processing)
    print("\n[STEP 8] GRAYSCALE (PROCESSING)")
    print("-" * 70)
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    print(f"✓ Converted warped image to grayscale")
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step_08_grayscale_process.jpg"), gray)

    # STEP 9: Downscale for Background
    print("\n[STEP 9] DOWNSCALE FOR BACKGROUND")
    print("-" * 70)
    h, w = gray.shape
    max_dim = 800
    bg_scale = min(max_dim / max(h, w), 1.0)
    if bg_scale < 1.0:
        small_bg = cv2.resize(gray, (int(w * bg_scale), int(h * bg_scale)))
    else:
        small_bg = gray
    print(f"✓ Downscaled for background est (scale={bg_scale:.2f})")
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step_09_downscaled_bg.jpg"), small_bg)

    # STEP 10: Morphological Background
    print("\n[STEP 10] MORPHOLOGICAL BACKGROUND")
    print("-" * 70)
    sh, sw = small_bg.shape
    k = max(sh, sw) // 8
    k = k if k % 2 == 1 else k + 1
    k = max(31, min(k, 127))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    bg_raw = cv2.morphologyEx(small_bg, cv2.MORPH_CLOSE, kernel)
    print(f"✓ Estimated background (kernel={k})")
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step_10_morph_bg.jpg"), bg_raw)

    # STEP 11: Smooth/Upscale Background
    print("\n[STEP 11] SMOOTH & UPSCALE BACKGROUND")
    print("-" * 70)
    bg_smoothed = cv2.GaussianBlur(bg_raw, (k, k), 0)
    if bg_scale < 1.0:
        bg = cv2.resize(bg_smoothed, (w, h), interpolation=cv2.INTER_LINEAR)
        bg = cv2.GaussianBlur(bg, (31, 31), 0)
    else:
        bg = bg_smoothed
    print(f"✓ Resized background to match original: {bg.shape[1]}x{bg.shape[0]}")
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step_11_final_bg.jpg"), bg)

    # STEP 12: Shadow Removal (Final)
    print("\n[STEP 12] SHADOW REMOVAL (FINAL)")
    print("-" * 70)
    result = np.zeros_like(gray, dtype=np.float32)
    mask = bg > 10
    result[mask] = (gray[mask].astype(np.float32) / bg[mask].astype(np.float32)) * 255
    result = np.clip(result, 0, 255).astype(np.uint8)
    print(f"✓ Shadow removal complere")
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step_12_final_output.jpg"), result)
    
    # FINAL
    print("\n" + "="*70)
    print("PROCESSING COMPLETE!")
    print("="*70)
    print(f"\nOutput images saved in: {OUTPUT_DIR}")
    print("\nPipeline summary - 12 Steps:")
    print("  1. Load Original")
    print("  2. Downscale (Detection)")
    print("  3. Grayscale (Detection)")
    print("  4. Gaussian Blur")
    print("  5. Canny Edge Detection")
    print("  6. Find Document Contour")
    print("  7. Perspective Transform")
    print("  8. Grayscale (Processing)")
    print("  9. Downscale (Background)")
    print("  10. Morphological Background")
    print("  11. Smooth/Upscale Background")
    print("  12. Shadow Removal (Final)")
    print("\nAll 12 intermediate steps saved as JPEGs in test_outputs/")

if __name__ == "__main__":
    main()
