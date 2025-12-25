"""
Standalone test of the CamScanner algorithm
This tests the exact code that will be used in app.py
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
    """Simple document detection"""
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


def estimate_background_fast(gray_image, kernel_ratio=8):
    """Fast background estimation using downscaling"""
    h, w = gray_image.shape
    
    max_dim = 800
    scale = min(max_dim / max(h, w), 1.0)
    
    if scale < 1.0:
        small = cv2.resize(gray_image, (int(w * scale), int(h * scale)))
    else:
        small = gray_image
    
    sh, sw = small.shape
    k_size = max(sh, sw) // kernel_ratio
    k_size = k_size if k_size % 2 == 1 else k_size + 1
    k_size = max(k_size, 31)
    k_size = min(k_size, 151)
    
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_size, k_size))
    background_small = cv2.morphologyEx(small, cv2.MORPH_CLOSE, kernel)
    background_small = cv2.GaussianBlur(background_small, (k_size, k_size), 0)
    
    if scale < 1.0:
        background = cv2.resize(background_small, (w, h), interpolation=cv2.INTER_LINEAR)
        background = cv2.GaussianBlur(background, (51, 51), 0)
    else:
        background = background_small
    
    return background


def remove_shadows(image):
    """Remove shadows using illumination normalization"""
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    
    background = estimate_background_fast(gray, kernel_ratio=6)
    
    shadow_free = np.zeros_like(gray, dtype=np.float32)
    mask = background > 10
    shadow_free[mask] = (gray[mask].astype(np.float32) / background[mask].astype(np.float32)) * 255
    shadow_free = np.clip(shadow_free, 0, 255).astype(np.uint8)
    
    return shadow_free


def enhance_document_quality(gray_image, mode='document'):
    """CamScanner-quality enhancement - clean black text on white"""
    h, w = gray_image.shape[:2]
    
    if mode == 'grayscale':
        # Natural grayscale look
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray_image)
        
        p95 = np.percentile(enhanced, 95)
        if p95 > 0 and p95 < 250:
            brightened = np.clip(enhanced.astype(np.float32) * (255.0 / p95), 0, 255).astype(np.uint8)
        else:
            brightened = enhanced
        
        gamma = 0.85
        table = np.array([((i / 255.0) ** (1.0 / gamma)) * 255 for i in range(256)]).astype("uint8")
        result = cv2.LUT(brightened, table)
        
        gaussian = cv2.GaussianBlur(result, (0, 0), 1.5)
        sharpened = cv2.addWeighted(result, 1.4, gaussian, -0.4, 0)
        result = np.clip(sharpened, 0, 255).astype(np.uint8)
        
    else:
        # Document mode - clean black/white
        p2, p98 = np.percentile(gray_image, (2, 98))
        stretched = np.clip((gray_image - p2) * (255.0 / max(p98 - p2, 1)), 0, 255).astype(np.uint8)
        
        block_size = max(h, w) // 25
        block_size = block_size if block_size % 2 == 1 else block_size + 1
        block_size = max(block_size, 51)
        block_size = min(block_size, 251)
        
        binary = cv2.adaptiveThreshold(
            stretched, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            block_size, 15
        )
        
        kernel_small = np.ones((2, 2), np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel_small)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel_small)
        
        # Remove small noise components
        inverted = cv2.bitwise_not(cleaned)
        num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(inverted, connectivity=8)
        
        min_area = max(25, (h * w) // 100000)
        
        result = np.ones_like(cleaned) * 255
        
        for i in range(1, num_labels):
            area = stats[i, cv2.CC_STAT_AREA]
            if area >= min_area:
                result[labels == i] = 0
    
    return result


def process_document(input_path, output_path):
    """Main processing function - mirrors app.py logic"""
    print(f"\n{'='*60}")
    print("CamScanner Quality Document Processing")
    print(f"{'='*60}")
    start = time.time()
    
    # Load
    print("\n[1/6] Loading image...")
    image = cv2.imread(input_path)
    if image is None:
        raise ValueError(f"Could not load {input_path}")
    print(f"  ✓ Loaded: {image.shape[1]}x{image.shape[0]}")
    
    # Detect document
    print("\n[2/6] Detecting document...")
    doc_pts = find_document(image)
    if doc_pts is not None:
        warped = four_point_transform(image, doc_pts)
        print(f"  ✓ Document cropped: {warped.shape[1]}x{warped.shape[0]}")
    else:
        warped = image
        print("  ! No document detected, using full image")
    
    cv2.imwrite(os.path.join(OUTPUT_DIR, "app_1_cropped.jpg"), warped)
    
    # Grayscale
    print("\n[3/6] Converting to grayscale...")
    gray = cv2.cvtColor(warped, cv2.COLOR_BGR2GRAY)
    cv2.imwrite(os.path.join(OUTPUT_DIR, "app_2_gray.jpg"), gray)
    
    # Denoise
    print("\n[4/6] Denoising...")
    denoised = cv2.bilateralFilter(gray, d=9, sigmaColor=75, sigmaSpace=75)
    denoised = cv2.bilateralFilter(denoised, d=7, sigmaColor=50, sigmaSpace=50)
    cv2.imwrite(os.path.join(OUTPUT_DIR, "app_3_denoised.jpg"), denoised)
    
    # Shadow removal
    print("\n[5/6] Removing shadows...")
    shadow_free = remove_shadows(denoised)
    cv2.imwrite(os.path.join(OUTPUT_DIR, "app_4_shadow_free.jpg"), shadow_free)
    
    # Enhancement
    print("\n[6/6] Enhancing (CamScanner Magic Color)...")
    enhanced = enhance_document_quality(shadow_free, mode='document')
    cv2.imwrite(os.path.join(OUTPUT_DIR, "app_5_enhanced.jpg"), enhanced)
    
    # Save final
    cv2.imwrite(output_path, enhanced, [cv2.IMWRITE_JPEG_QUALITY, 95])
    
    elapsed = time.time() - start
    print(f"\n{'='*60}")
    print(f"✓ COMPLETE in {elapsed:.2f}s")
    print(f"  Output: {output_path}")
    print(f"  Size: {enhanced.shape[1]}x{enhanced.shape[0]}")
    print(f"{'='*60}")
    
    return enhanced


if __name__ == "__main__":
    output = os.path.join(OUTPUT_DIR, "APP_FINAL_OUTPUT.jpg")
    result = process_document(INPUT_PATH, output)
    
    # Open result
    import subprocess
    subprocess.Popen(['start', '', output], shell=True)
