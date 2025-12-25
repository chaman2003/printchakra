"""
CamScanner Perfect Processing - Final Refined Version
Based on testing results, this is the best algorithm
"""

import cv2
import numpy as np
import os
import time

INPUT_PATH = r"C:\Users\chama\OneDrive\Desktop\printchakra\original.jpg"
OUTPUT_DIR = r"C:\Users\chama\OneDrive\Desktop\printchakra\test_outputs"

os.makedirs(OUTPUT_DIR, exist_ok=True)


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

    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]], dtype="float32")

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    return warped


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
        
        for contour in contours:
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
            
            if len(approx) == 4:
                area = cv2.contourArea(approx)
                img_area = small.shape[0] * small.shape[1]
                if area > img_area * 0.1:
                    return (approx.reshape(4, 2) / scale).astype(np.float32)
    
    return None


def estimate_background(gray, kernel_ratio=8):
    """Estimate background illumination using downscaling for speed"""
    h, w = gray.shape
    
    max_dim = 800
    scale = min(max_dim / max(h, w), 1.0)
    
    if scale < 1.0:
        small = cv2.resize(gray, (int(w * scale), int(h * scale)))
    else:
        small = gray
    
    sh, sw = small.shape
    k_size = max(sh, sw) // kernel_ratio
    k_size = k_size if k_size % 2 == 1 else k_size + 1
    k_size = max(k_size, 31)
    k_size = min(k_size, 151)
    
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_size, k_size))
    bg = cv2.morphologyEx(small, cv2.MORPH_CLOSE, kernel)
    bg = cv2.GaussianBlur(bg, (k_size, k_size), 0)
    
    if scale < 1.0:
        bg = cv2.resize(bg, (w, h), interpolation=cv2.INTER_LINEAR)
        bg = cv2.GaussianBlur(bg, (51, 51), 0)
    
    return bg


def camscanner_final(image, save_steps=True):
    """
    THE FINAL CAMSCANNER ALGORITHM
    Produces clean, noise-free document scan
    """
    print("\n=== FINAL CamScanner Algorithm ===")
    start = time.time()
    
    h, w = image.shape[:2]
    print(f"  Processing {w}x{h} image...")
    
    # =============================================
    # STEP 1: GRAYSCALE
    # =============================================
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    if save_steps:
        cv2.imwrite(os.path.join(OUTPUT_DIR, "final_1_gray.jpg"), gray)
    
    # =============================================
    # STEP 2: DENOISE (Key for clean output)
    # =============================================
    print("  Denoising...")
    
    # Strong bilateral filtering to smooth while keeping edges
    denoised = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)
    denoised = cv2.bilateralFilter(denoised, d=7, sigmaColor=50, sigmaSpace=50)
    
    if save_steps:
        cv2.imwrite(os.path.join(OUTPUT_DIR, "final_2_denoised.jpg"), denoised)
    
    # =============================================
    # STEP 3: SHADOW REMOVAL
    # =============================================
    print("  Removing shadows...")
    
    background = estimate_background(denoised, kernel_ratio=6)
    
    if save_steps:
        cv2.imwrite(os.path.join(OUTPUT_DIR, "final_3_background.jpg"), background)
    
    # Normalize illumination
    shadow_free = np.zeros_like(denoised, dtype=np.float32)
    mask = background > 10
    shadow_free[mask] = (denoised[mask].astype(np.float32) / background[mask].astype(np.float32)) * 255
    shadow_free = np.clip(shadow_free, 0, 255).astype(np.uint8)
    
    if save_steps:
        cv2.imwrite(os.path.join(OUTPUT_DIR, "final_4_shadow_free.jpg"), shadow_free)
    
    # =============================================
    # STEP 4: CONTRAST STRETCHING
    # =============================================
    print("  Enhancing contrast...")
    
    # Find actual range of values
    p2, p98 = np.percentile(shadow_free, (2, 98))
    
    # Stretch to full range
    stretched = np.clip((shadow_free - p2) * (255.0 / max(p98 - p2, 1)), 0, 255).astype(np.uint8)
    
    if save_steps:
        cv2.imwrite(os.path.join(OUTPUT_DIR, "final_5_stretched.jpg"), stretched)
    
    # =============================================
    # STEP 5: ADAPTIVE THRESHOLD (Clean B/W)
    # =============================================
    print("  Creating clean black/white...")
    
    # Block size based on image size
    block_size = max(h, w) // 25
    block_size = block_size if block_size % 2 == 1 else block_size + 1
    block_size = max(block_size, 51)
    block_size = min(block_size, 251)
    
    print(f"    Block size: {block_size}")
    
    binary = cv2.adaptiveThreshold(
        stretched, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        block_size, 15  # Higher C value = more white background
    )
    
    if save_steps:
        cv2.imwrite(os.path.join(OUTPUT_DIR, "final_6_binary.jpg"), binary)
    
    # =============================================
    # STEP 6: NOISE REMOVAL (Critical!)
    # =============================================
    print("  Removing noise specks...")
    
    # Morphological cleanup
    kernel_small = np.ones((2, 2), np.uint8)
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel_small)  # Close small holes
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel_small)   # Remove small specks
    
    if save_steps:
        cv2.imwrite(os.path.join(OUTPUT_DIR, "final_7_morphology.jpg"), cleaned)
    
    # Remove small connected components
    # Invert: text becomes white for analysis
    inverted = cv2.bitwise_not(cleaned)
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(inverted, connectivity=8)
    
    # Calculate minimum area threshold (relative to image size)
    # Smaller documents need lower threshold
    min_area = max(25, (h * w) // 100000)  # At least 25 pixels, scales with image
    print(f"    Minimum component area: {min_area} pixels")
    
    # Build clean output - start with white
    final = np.ones_like(cleaned) * 255
    
    # Keep only components larger than min_area
    components_kept = 0
    components_removed = 0
    
    for i in range(1, num_labels):  # Skip background (label 0)
        area = stats[i, cv2.CC_STAT_AREA]
        if area >= min_area:
            final[labels == i] = 0  # Set to black (text)
            components_kept += 1
        else:
            components_removed += 1
    
    print(f"    Kept {components_kept} components, removed {components_removed} noise specks")
    
    if save_steps:
        cv2.imwrite(os.path.join(OUTPUT_DIR, "final_8_cleaned.jpg"), final)
    
    elapsed = time.time() - start
    print(f"  ✓ Complete in {elapsed:.2f}s")
    
    return final


def camscanner_grayscale(image, save_steps=True):
    """
    Grayscale mode - preserves some gray tones for natural look
    Good for documents with images/photos
    """
    print("\n=== CamScanner GRAYSCALE Mode ===")
    start = time.time()
    
    h, w = image.shape[:2]
    
    # Grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Denoise
    denoised = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)
    
    if save_steps:
        cv2.imwrite(os.path.join(OUTPUT_DIR, "gray_1_denoised.jpg"), denoised)
    
    # Shadow removal
    background = estimate_background(denoised, kernel_ratio=8)
    shadow_free = np.zeros_like(denoised, dtype=np.float32)
    mask = background > 10
    shadow_free[mask] = (denoised[mask].astype(np.float32) / background[mask].astype(np.float32)) * 255
    shadow_free = np.clip(shadow_free, 0, 255).astype(np.uint8)
    
    if save_steps:
        cv2.imwrite(os.path.join(OUTPUT_DIR, "gray_2_shadow_free.jpg"), shadow_free)
    
    # CLAHE for local contrast
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(shadow_free)
    
    if save_steps:
        cv2.imwrite(os.path.join(OUTPUT_DIR, "gray_3_clahe.jpg"), enhanced)
    
    # Brighten background to white
    p95 = np.percentile(enhanced, 95)
    if p95 > 0 and p95 < 250:
        brightened = np.clip(enhanced.astype(np.float32) * (255.0 / p95), 0, 255).astype(np.uint8)
    else:
        brightened = enhanced
    
    if save_steps:
        cv2.imwrite(os.path.join(OUTPUT_DIR, "gray_4_brightened.jpg"), brightened)
    
    # Gamma to darken text
    gamma = 0.85
    table = np.array([((i / 255.0) ** (1.0 / gamma)) * 255 for i in range(256)]).astype("uint8")
    result = cv2.LUT(brightened, table)
    
    if save_steps:
        cv2.imwrite(os.path.join(OUTPUT_DIR, "gray_5_gamma.jpg"), result)
    
    # Sharpen
    gaussian = cv2.GaussianBlur(result, (0, 0), 1.5)
    sharpened = cv2.addWeighted(result, 1.4, gaussian, -0.4, 0)
    sharpened = np.clip(sharpened, 0, 255).astype(np.uint8)
    
    if save_steps:
        cv2.imwrite(os.path.join(OUTPUT_DIR, "gray_6_final.jpg"), sharpened)
    
    elapsed = time.time() - start
    print(f"  ✓ Complete in {elapsed:.2f}s")
    
    return sharpened


def main():
    print("=" * 60)
    print("CamScanner FINAL Processing")
    print("=" * 60)
    
    # Load image
    image = cv2.imread(INPUT_PATH)
    if image is None:
        print(f"ERROR: Could not load {INPUT_PATH}")
        return
    
    print(f"✓ Loaded: {image.shape[1]}x{image.shape[0]}")
    
    # Find document
    print("\nDetecting document borders...")
    doc_pts = find_document(image)
    
    if doc_pts is not None:
        warped = four_point_transform(image, doc_pts)
        print(f"✓ Document cropped: {warped.shape[1]}x{warped.shape[0]}")
    else:
        warped = image
        print("! Using full image (no document detected)")
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "0_cropped.jpg"), warped)
    
    # Process
    bw_result = camscanner_final(warped, save_steps=True)
    gray_result = camscanner_grayscale(warped, save_steps=True)
    
    # Save finals
    cv2.imwrite(os.path.join(OUTPUT_DIR, "RESULT_blackwhite.jpg"), bw_result, [cv2.IMWRITE_JPEG_QUALITY, 95])
    cv2.imwrite(os.path.join(OUTPUT_DIR, "RESULT_grayscale.jpg"), gray_result, [cv2.IMWRITE_JPEG_QUALITY, 95])
    
    print("\n" + "=" * 60)
    print("DONE!")
    print(f"\nResults in: {OUTPUT_DIR}")
    print("  - RESULT_blackwhite.jpg : Clean black text on white (like Magic Color)")
    print("  - RESULT_grayscale.jpg  : Natural grayscale with shadows removed")
    print("=" * 60)


if __name__ == "__main__":
    main()
