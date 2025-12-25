"""
CamScanner-Quality Document Processing Test Script V2
Optimized for large images - uses downscaling for heavy operations
"""

import cv2
import numpy as np
import os
import time

# Input/output paths
INPUT_PATH = r"C:\Users\chama\OneDrive\Desktop\printchakra\original.jpg"
OUTPUT_DIR = r"C:\Users\chama\OneDrive\Desktop\printchakra\test_outputs"

os.makedirs(OUTPUT_DIR, exist_ok=True)

def load_image():
    """Load the original image"""
    img = cv2.imread(INPUT_PATH)
    if img is None:
        raise ValueError(f"Could not load image from {INPUT_PATH}")
    print(f"✓ Loaded image: {img.shape[1]}x{img.shape[0]} pixels")
    return img


def order_points(pts):
    """Order points: top-left, top-right, bottom-right, bottom-left"""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def four_point_transform(image, pts):
    """Apply perspective transform to get bird's eye view of document"""
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
    """Find document contour in image"""
    # Downscale for faster processing
    scale = 0.25
    small = cv2.resize(image, (0, 0), fx=scale, fy=scale)
    
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Try multiple edge detection thresholds
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
                if area > img_area * 0.1:  # At least 10% of image
                    # Scale back to original size
                    return (approx.reshape(4, 2) / scale).astype(np.float32)
    
    return None


def estimate_background_fast(gray_image, kernel_ratio=10):
    """
    Fast background estimation using downscaling
    """
    h, w = gray_image.shape
    
    # Downscale for faster morphological operations
    max_dim = 800
    scale = min(max_dim / max(h, w), 1.0)
    
    if scale < 1.0:
        small = cv2.resize(gray_image, (int(w * scale), int(h * scale)))
    else:
        small = gray_image
    
    sh, sw = small.shape
    
    # Kernel size relative to small image
    k_size = max(sh, sw) // kernel_ratio
    k_size = k_size if k_size % 2 == 1 else k_size + 1
    k_size = max(k_size, 31)
    k_size = min(k_size, 151)
    
    # Morphological closing
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_size, k_size))
    background_small = cv2.morphologyEx(small, cv2.MORPH_CLOSE, kernel)
    
    # Smooth
    background_small = cv2.GaussianBlur(background_small, (k_size, k_size), 0)
    
    # Upscale back
    if scale < 1.0:
        background = cv2.resize(background_small, (w, h), interpolation=cv2.INTER_LINEAR)
        # Extra smoothing to hide upscaling artifacts
        background = cv2.GaussianBlur(background, (51, 51), 0)
    else:
        background = background_small
    
    return background


def camscanner_optimal(image):
    """
    OPTIMAL CamScanner-quality processing
    Based on real CamScanner algorithm analysis
    """
    print("\n=== OPTIMAL CamScanner Processing ===")
    start = time.time()
    
    h, w = image.shape[:2]
    print(f"  Input: {w}x{h}")
    
    # ========================================
    # STEP 1: Convert to Grayscale (LAB L-channel)
    # ========================================
    print("  [1/6] Grayscale conversion...")
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    gray = lab[:, :, 0]
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step1_gray.jpg"), gray)
    
    # ========================================
    # STEP 2: Denoise (Critical for clean output)
    # ========================================
    print("  [2/6] Denoising...")
    
    # Bilateral filter - preserves edges while smoothing
    denoised = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step2_denoised.jpg"), denoised)
    
    # ========================================
    # STEP 3: Shadow/Illumination Correction
    # ========================================
    print("  [3/6] Shadow removal...")
    
    # Estimate background illumination
    background = estimate_background_fast(denoised, kernel_ratio=8)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step3_background.jpg"), background)
    
    # Normalize: divide by background
    shadow_free = np.zeros_like(denoised, dtype=np.float32)
    mask = background > 10  # Avoid division by zero
    shadow_free[mask] = (denoised[mask].astype(np.float32) / background[mask].astype(np.float32)) * 255
    shadow_free = np.clip(shadow_free, 0, 255).astype(np.uint8)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step3_shadow_free.jpg"), shadow_free)
    
    # ========================================
    # STEP 4: Contrast Enhancement
    # ========================================
    print("  [4/6] Contrast enhancement...")
    
    # CLAHE for local contrast
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(shadow_free)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step4_clahe.jpg"), enhanced)
    
    # ========================================
    # STEP 5: Background Whitening & Text Darkening
    # ========================================
    print("  [5/6] Background whitening...")
    
    # Find background level from histogram
    hist = cv2.calcHist([enhanced], [0], None, [256], [0, 256]).flatten()
    
    # Background is the brightest peak
    # Look for mode in upper quarter
    upper_hist = hist[192:]
    bg_level = np.argmax(upper_hist) + 192
    
    # Scale so background becomes pure white
    if bg_level < 250 and bg_level > 0:
        scale = 255.0 / bg_level
        whitened = np.clip(enhanced.astype(np.float32) * scale, 0, 255).astype(np.uint8)
    else:
        whitened = enhanced
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step5_whitened.jpg"), whitened)
    
    # Gamma correction to darken text while keeping background white
    # Values below mid-gray get darker, above stay bright
    gamma = 0.8
    inv_gamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(256)]).astype("uint8")
    result = cv2.LUT(whitened, table)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step5_gamma.jpg"), result)
    
    # ========================================
    # STEP 6: Final Sharpening
    # ========================================
    print("  [6/6] Sharpening...")
    
    # Unsharp mask for crisp text
    gaussian = cv2.GaussianBlur(result, (0, 0), 1.5)
    sharpened = cv2.addWeighted(result, 1.4, gaussian, -0.4, 0)
    sharpened = np.clip(sharpened, 0, 255).astype(np.uint8)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "step6_sharpened.jpg"), sharpened)
    
    elapsed = time.time() - start
    print(f"  ✓ Complete in {elapsed:.2f}s")
    
    return sharpened


def camscanner_magic_color(image):
    """
    CamScanner "Magic Color" mode - more aggressive cleaning
    Creates pure black text on pure white background
    """
    print("\n=== CamScanner MAGIC COLOR Mode ===")
    start = time.time()
    
    h, w = image.shape[:2]
    
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Heavy denoising
    denoised = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)
    denoised = cv2.bilateralFilter(denoised, d=9, sigmaColor=50, sigmaSpace=50)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "magic_1_denoised.jpg"), denoised)
    
    # Shadow removal
    background = estimate_background_fast(denoised, kernel_ratio=6)
    shadow_free = np.zeros_like(denoised, dtype=np.float32)
    mask = background > 10
    shadow_free[mask] = (denoised[mask].astype(np.float32) / background[mask].astype(np.float32)) * 255
    shadow_free = np.clip(shadow_free, 0, 255).astype(np.uint8)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "magic_2_shadow_free.jpg"), shadow_free)
    
    # Aggressive contrast stretching
    p1, p99 = np.percentile(shadow_free, (1, 99))
    stretched = np.clip((shadow_free - p1) * (255.0 / max(p99 - p1, 1)), 0, 255).astype(np.uint8)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "magic_3_stretched.jpg"), stretched)
    
    # Adaptive thresholding for clean black/white
    # Use large block size for cleaner result
    block_size = max(h, w) // 30
    block_size = block_size if block_size % 2 == 1 else block_size + 1
    block_size = max(block_size, 31)
    block_size = min(block_size, 201)
    
    binary = cv2.adaptiveThreshold(
        stretched, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        block_size, 12
    )
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "magic_4_binary.jpg"), binary)
    
    # Clean up small noise using morphological operations
    kernel = np.ones((2, 2), np.uint8)
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)  # Fill small holes
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)  # Remove small specks
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "magic_5_cleaned.jpg"), cleaned)
    
    # Remove small connected components (noise)
    # Invert for analysis (text = white)
    inverted = cv2.bitwise_not(cleaned)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(inverted, connectivity=8)
    
    # Create clean output
    final = np.ones_like(cleaned) * 255
    min_area = 20  # Minimum pixels to keep
    
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if area >= min_area:
            final[labels == i] = 0
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "magic_6_final.jpg"), final)
    
    elapsed = time.time() - start
    print(f"  ✓ Complete in {elapsed:.2f}s")
    
    return final


def camscanner_auto(image):
    """
    CamScanner "Auto" mode - balanced enhancement
    Preserves some gray tones for natural look
    """
    print("\n=== CamScanner AUTO Mode ===")
    start = time.time()
    
    h, w = image.shape[:2]
    
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Moderate denoising
    denoised = cv2.bilateralFilter(gray, d=7, sigmaColor=50, sigmaSpace=50)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "auto_1_denoised.jpg"), denoised)
    
    # Shadow removal
    background = estimate_background_fast(denoised, kernel_ratio=8)
    shadow_free = np.zeros_like(denoised, dtype=np.float32)
    mask = background > 10
    shadow_free[mask] = (denoised[mask].astype(np.float32) / background[mask].astype(np.float32)) * 255
    shadow_free = np.clip(shadow_free, 0, 255).astype(np.uint8)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "auto_2_shadow_free.jpg"), shadow_free)
    
    # CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(shadow_free)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "auto_3_clahe.jpg"), enhanced)
    
    # Normalize brightness
    p95 = np.percentile(enhanced, 95)
    if p95 > 0:
        normalized = np.clip(enhanced.astype(np.float32) * (255.0 / p95), 0, 255).astype(np.uint8)
    else:
        normalized = enhanced
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "auto_4_normalized.jpg"), normalized)
    
    # Soft gamma for slight text darkening
    gamma = 0.9
    table = np.array([((i / 255.0) ** (1.0 / gamma)) * 255 for i in range(256)]).astype("uint8")
    result = cv2.LUT(normalized, table)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "auto_5_gamma.jpg"), result)
    
    # Light sharpening
    gaussian = cv2.GaussianBlur(result, (0, 0), 1.0)
    sharpened = cv2.addWeighted(result, 1.3, gaussian, -0.3, 0)
    sharpened = np.clip(sharpened, 0, 255).astype(np.uint8)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "auto_6_final.jpg"), sharpened)
    
    elapsed = time.time() - start
    print(f"  ✓ Complete in {elapsed:.2f}s")
    
    return sharpened


def main():
    """Run processing and compare"""
    print("=" * 60)
    print("CamScanner Quality Test V2")
    print("=" * 60)
    
    # Load original image
    original = load_image()
    
    # Save original
    cv2.imwrite(os.path.join(OUTPUT_DIR, "00_original.jpg"), original)
    
    # Find document
    print("\nDetecting document...")
    doc_pts = find_document(original)
    
    if doc_pts is not None:
        warped = four_point_transform(original, doc_pts)
        print(f"✓ Document detected: {warped.shape[1]}x{warped.shape[0]}")
    else:
        print("! No document boundary found, using full image")
        warped = original
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "01_warped.jpg"), warped)
    
    # Process with different modes
    optimal = camscanner_optimal(warped)
    magic = camscanner_magic_color(warped)
    auto = camscanner_auto(warped)
    
    # Save final outputs at high quality
    cv2.imwrite(os.path.join(OUTPUT_DIR, "FINAL_optimal.jpg"), optimal, [cv2.IMWRITE_JPEG_QUALITY, 95])
    cv2.imwrite(os.path.join(OUTPUT_DIR, "FINAL_magic.jpg"), magic, [cv2.IMWRITE_JPEG_QUALITY, 95])
    cv2.imwrite(os.path.join(OUTPUT_DIR, "FINAL_auto.jpg"), auto, [cv2.IMWRITE_JPEG_QUALITY, 95])
    
    print("\n" + "=" * 60)
    print("COMPLETE!")
    print(f"Output directory: {OUTPUT_DIR}")
    print("\nResults:")
    print("  - FINAL_optimal.jpg : Best balanced quality")
    print("  - FINAL_magic.jpg   : Pure black/white (Magic Color)")
    print("  - FINAL_auto.jpg    : Natural document look")
    print("=" * 60)


if __name__ == "__main__":
    main()
