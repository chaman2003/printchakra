"""
CamScanner-Quality Document Processing Test Script
Iteratively test and refine processing until perfect quality is achieved.
"""

import cv2
import numpy as np
import os

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
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    
    # Try edge detection
    edges = cv2.Canny(blurred, 50, 150)
    edges = cv2.dilate(edges, np.ones((2, 2)), iterations=1)
    
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:10]
    
    for contour in contours:
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        
        if len(approx) == 4:
            area = cv2.contourArea(approx)
            img_area = image.shape[0] * image.shape[1]
            if area > img_area * 0.1:  # At least 10% of image
                return approx.reshape(4, 2)
    
    return None


def camscanner_process_v1(image):
    """
    Version 1: Basic CamScanner-style processing
    Focus: Clean white background, sharp black text, NO NOISE
    """
    print("\n=== CamScanner V1: Basic Clean Processing ===")
    
    # Step 1: Convert to grayscale using LAB for better contrast
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_channel = lab[:, :, 0]
    
    # Step 2: Remove shadows using morphological background estimation
    # Key: Large kernel to capture background illumination
    h, w = l_channel.shape
    kernel_size = max(h, w) // 8  # Larger kernel for better background
    kernel_size = kernel_size if kernel_size % 2 == 1 else kernel_size + 1
    kernel_size = max(kernel_size, 51)
    
    print(f"  Shadow removal kernel: {kernel_size}x{kernel_size}")
    
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    background = cv2.morphologyEx(l_channel, cv2.MORPH_CLOSE, kernel)
    background = cv2.GaussianBlur(background, (kernel_size, kernel_size), 0)
    
    # Normalize illumination
    shadow_free = cv2.divide(l_channel, background, scale=255)
    shadow_free = np.clip(shadow_free, 0, 255).astype(np.uint8)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v1_01_shadow_removed.jpg"), shadow_free)
    
    # Step 3: Strong contrast enhancement
    # Use CLAHE with higher clip limit
    clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(shadow_free)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v1_02_clahe.jpg"), enhanced)
    
    # Step 4: Threshold to get clean black/white
    # Otsu's method for automatic threshold
    _, binary = cv2.threshold(enhanced, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v1_03_binary.jpg"), binary)
    
    # Step 5: Clean up noise with morphological operations
    # Remove small white specks (noise)
    kernel_small = np.ones((2, 2), np.uint8)
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel_small)
    
    # Fill small black holes in white areas
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel_small)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v1_04_cleaned.jpg"), cleaned)
    
    return cleaned


def camscanner_process_v2(image):
    """
    Version 2: Improved with better noise handling
    """
    print("\n=== CamScanner V2: Better Noise Handling ===")
    
    # Step 1: Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Step 2: Bilateral filter to smooth while keeping edges
    # This is KEY for reducing noise without losing text
    smoothed = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v2_01_bilateral.jpg"), smoothed)
    
    # Step 3: Shadow removal
    h, w = smoothed.shape
    kernel_size = max(h, w) // 10
    kernel_size = kernel_size if kernel_size % 2 == 1 else kernel_size + 1
    kernel_size = max(kernel_size, 51)
    
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    background = cv2.morphologyEx(smoothed, cv2.MORPH_CLOSE, kernel)
    background = cv2.GaussianBlur(background, (kernel_size, kernel_size), 0)
    
    shadow_free = cv2.divide(smoothed, background, scale=255)
    shadow_free = np.clip(shadow_free, 0, 255).astype(np.uint8)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v2_02_shadow_free.jpg"), shadow_free)
    
    # Step 4: Normalize brightness - make background truly white
    # Find background value (brightest common value)
    hist = cv2.calcHist([shadow_free], [0], None, [256], [0, 256])
    background_val = np.argmax(hist[200:]) + 200
    
    # Scale so background becomes 255
    if background_val < 250:
        scale = 255.0 / background_val
        normalized = np.clip(shadow_free * scale, 0, 255).astype(np.uint8)
    else:
        normalized = shadow_free
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v2_03_normalized.jpg"), normalized)
    
    # Step 5: Adaptive threshold with larger block size
    # Larger block = more context = cleaner result
    block_size = max(h, w) // 20
    block_size = block_size if block_size % 2 == 1 else block_size + 1
    block_size = max(block_size, 31)
    
    binary = cv2.adaptiveThreshold(
        normalized, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        block_size, 8
    )
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v2_04_adaptive.jpg"), binary)
    
    # Step 6: Remove noise specks
    # Use connected components to remove small regions
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
        cv2.bitwise_not(binary), connectivity=8
    )
    
    # Create clean image
    cleaned = np.ones_like(binary) * 255
    min_area = 15  # Minimum area to keep
    
    for i in range(1, num_labels):
        area = stats[i, cv2.CC_STAT_AREA]
        if area >= min_area:
            cleaned[labels == i] = 0
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v2_05_cleaned.jpg"), cleaned)
    
    return cleaned


def camscanner_process_v3(image):
    """
    Version 3: CamScanner Magic Color mode
    Creates ultra-clean document with perfect contrast
    """
    print("\n=== CamScanner V3: Magic Color Mode ===")
    
    # Step 1: Convert to grayscale with better luminance preservation
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Step 2: Heavy bilateral filtering to create "painted" look
    # This removes texture noise while keeping text sharp
    smooth1 = cv2.bilateralFilter(gray, d=9, sigmaColor=50, sigmaSpace=50)
    smooth2 = cv2.bilateralFilter(smooth1, d=9, sigmaColor=50, sigmaSpace=50)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v3_01_smoothed.jpg"), smooth2)
    
    # Step 3: Estimate and remove background illumination
    h, w = smooth2.shape
    
    # Downsample for faster morphological operations
    scale = 0.25
    small = cv2.resize(smooth2, (int(w * scale), int(h * scale)))
    
    kernel_size = max(small.shape) // 4
    kernel_size = kernel_size if kernel_size % 2 == 1 else kernel_size + 1
    kernel_size = max(kernel_size, 31)
    
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    background_small = cv2.morphologyEx(small, cv2.MORPH_CLOSE, kernel)
    background_small = cv2.GaussianBlur(background_small, (kernel_size, kernel_size), 0)
    
    # Upscale background
    background = cv2.resize(background_small, (w, h), interpolation=cv2.INTER_LINEAR)
    background = cv2.GaussianBlur(background, (51, 51), 0)  # Smooth edges
    
    # Normalize
    shadow_free = cv2.divide(smooth2, background, scale=255)
    shadow_free = np.clip(shadow_free, 0, 255).astype(np.uint8)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v3_02_shadow_free.jpg"), shadow_free)
    
    # Step 4: Gamma correction to brighten
    gamma = 1.2
    inv_gamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(256)]).astype("uint8")
    brightened = cv2.LUT(shadow_free, table)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v3_03_brightened.jpg"), brightened)
    
    # Step 5: Contrast stretching
    p2, p98 = np.percentile(brightened, (2, 98))
    stretched = np.clip((brightened - p2) * (255.0 / (p98 - p2)), 0, 255).astype(np.uint8)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v3_04_stretched.jpg"), stretched)
    
    # Step 6: Final threshold with Otsu
    _, binary = cv2.threshold(stretched, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v3_05_otsu.jpg"), binary)
    
    # Step 7: Morphological cleanup
    # Open to remove noise, close to fill gaps
    kernel = np.ones((2, 2), np.uint8)
    cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v3_06_cleaned.jpg"), cleaned)
    
    return cleaned


def camscanner_process_v4(image):
    """
    Version 4: Document Scanner approach - NO heavy thresholding
    Focus: Natural looking document with clean background
    """
    print("\n=== CamScanner V4: Natural Document Look ===")
    
    # Step 1: Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Step 2: Denoise with Non-local Means (best for document noise)
    denoised = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v4_01_denoised.jpg"), denoised)
    
    # Step 3: Shadow removal with divide-by-background technique
    h, w = denoised.shape
    
    # Use morphological closing for background estimation
    kernel_size = max(h, w) // 8
    kernel_size = kernel_size if kernel_size % 2 == 1 else kernel_size + 1
    kernel_size = max(kernel_size, 51)
    
    # Morphological closing to estimate background
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    background = cv2.morphologyEx(denoised, cv2.MORPH_CLOSE, kernel)
    background = cv2.GaussianBlur(background, (kernel_size, kernel_size), 0)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v4_02_background.jpg"), background)
    
    # Divide to normalize
    normalized = cv2.divide(denoised, background, scale=255)
    normalized = np.clip(normalized, 0, 255).astype(np.uint8)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v4_03_normalized.jpg"), normalized)
    
    # Step 4: Enhance contrast with CLAHE (gentler settings)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(normalized)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v4_04_enhanced.jpg"), enhanced)
    
    # Step 5: Make background white while preserving text
    # Use high percentile as white point
    p95 = np.percentile(enhanced, 95)
    result = np.clip((enhanced.astype(float) / p95) * 255, 0, 255).astype(np.uint8)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v4_05_whitened.jpg"), result)
    
    # Step 6: Light sharpening for crisp text
    kernel = np.array([
        [0, -0.3, 0],
        [-0.3, 2.2, -0.3],
        [0, -0.3, 0]
    ])
    sharpened = cv2.filter2D(result, -1, kernel)
    sharpened = np.clip(sharpened, 0, 255).astype(np.uint8)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v4_06_sharpened.jpg"), sharpened)
    
    return sharpened


def camscanner_process_v5(image):
    """
    Version 5: BEST - Combines all techniques optimally
    This should produce CamScanner-quality output
    """
    print("\n=== CamScanner V5: OPTIMAL QUALITY ===")
    
    h, w = image.shape[:2]
    print(f"  Input size: {w}x{h}")
    
    # ========================================
    # STAGE 1: DENOISING (Critical first step)
    # ========================================
    print("  Stage 1: Denoising...")
    
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # First pass: bilateral filter (edge-preserving smoothing)
    denoised = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)
    
    # Second pass: Non-local means for remaining noise
    denoised = cv2.fastNlMeansDenoising(denoised, None, h=8, templateWindowSize=7, searchWindowSize=21)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v5_01_denoised.jpg"), denoised)
    
    # ========================================
    # STAGE 2: SHADOW/ILLUMINATION CORRECTION
    # ========================================
    print("  Stage 2: Shadow removal...")
    
    # Large morphological close to estimate background (better than median for large images)
    bg_size = max(h, w) // 6
    bg_size = bg_size if bg_size % 2 == 1 else bg_size + 1
    bg_size = max(bg_size, 51)
    
    print(f"    Background kernel: {bg_size}")
    
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (bg_size, bg_size))
    background = cv2.morphologyEx(denoised, cv2.MORPH_CLOSE, kernel)
    
    # Smooth the background estimate
    background = cv2.GaussianBlur(background, (bg_size, bg_size), 0)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v5_02_background.jpg"), background)
    
    # Normalize: original / background * 255
    # This removes shadows and uneven lighting
    shadow_free = np.zeros_like(denoised, dtype=np.float32)
    mask = background > 0
    shadow_free[mask] = (denoised[mask].astype(np.float32) / background[mask].astype(np.float32)) * 255
    shadow_free = np.clip(shadow_free, 0, 255).astype(np.uint8)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v5_03_shadow_free.jpg"), shadow_free)
    
    # ========================================
    # STAGE 3: CONTRAST ENHANCEMENT
    # ========================================
    print("  Stage 3: Contrast enhancement...")
    
    # CLAHE for local contrast
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(shadow_free)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v5_04_clahe.jpg"), enhanced)
    
    # ========================================
    # STAGE 4: BACKGROUND WHITENING
    # ========================================
    print("  Stage 4: Background whitening...")
    
    # Find the background level (mode of bright pixels)
    hist = cv2.calcHist([enhanced], [0], None, [256], [0, 256]).flatten()
    
    # Look for peak in upper half (background should be bright)
    peak_idx = np.argmax(hist[180:]) + 180
    
    # Scale so peak becomes white
    if peak_idx < 250:
        scale_factor = 255.0 / peak_idx
        whitened = np.clip(enhanced.astype(np.float32) * scale_factor, 0, 255).astype(np.uint8)
    else:
        whitened = enhanced
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v5_05_whitened.jpg"), whitened)
    
    # ========================================
    # STAGE 5: TEXT DARKENING (Make text blacker)
    # ========================================
    print("  Stage 5: Text enhancement...")
    
    # Gamma correction to darken dark areas (text)
    # Lower gamma = darker darks
    gamma = 0.85
    inv_gamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(256)]).astype("uint8")
    darkened = cv2.LUT(whitened, table)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v5_06_gamma.jpg"), darkened)
    
    # ========================================
    # STAGE 6: FINAL CLEANUP & SHARPENING
    # ========================================
    print("  Stage 6: Final cleanup...")
    
    # Light unsharp mask for crisp text
    gaussian = cv2.GaussianBlur(darkened, (0, 0), 1.5)
    sharpened = cv2.addWeighted(darkened, 1.3, gaussian, -0.3, 0)
    sharpened = np.clip(sharpened, 0, 255).astype(np.uint8)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v5_07_sharpened.jpg"), sharpened)
    
    # Final contrast stretch to ensure full range
    p1, p99 = np.percentile(sharpened, (1, 99))
    final = np.clip((sharpened - p1) * (255.0 / (p99 - p1)), 0, 255).astype(np.uint8)
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "v5_08_final.jpg"), final)
    
    return final


def main():
    """Run all versions and compare"""
    print("=" * 60)
    print("CamScanner Quality Test")
    print("=" * 60)
    
    # Load original image
    original = load_image()
    
    # Save original for reference
    cv2.imwrite(os.path.join(OUTPUT_DIR, "00_original.jpg"), original)
    
    # Try to find and crop document
    print("\nFinding document boundaries...")
    doc_pts = find_document(original)
    
    if doc_pts is not None:
        warped = four_point_transform(original, doc_pts)
        print(f"✓ Document found and warped: {warped.shape[1]}x{warped.shape[0]}")
    else:
        warped = original
        print("! No document found, using full image")
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "01_warped.jpg"), warped)
    
    # Run all processing versions
    results = {}
    
    results['v1'] = camscanner_process_v1(warped)
    results['v2'] = camscanner_process_v2(warped)
    results['v3'] = camscanner_process_v3(warped)
    results['v4'] = camscanner_process_v4(warped)
    results['v5'] = camscanner_process_v5(warped)
    
    # Save final results
    for name, img in results.items():
        output_path = os.path.join(OUTPUT_DIR, f"FINAL_{name}.jpg")
        cv2.imwrite(output_path, img, [cv2.IMWRITE_JPEG_QUALITY, 95])
        print(f"\n✓ Saved: {output_path}")
    
    print("\n" + "=" * 60)
    print("TESTING COMPLETE!")
    print(f"Check outputs in: {OUTPUT_DIR}")
    print("=" * 60)
    print("\nBest result should be v5 - check v5_08_final.jpg")


if __name__ == "__main__":
    main()
