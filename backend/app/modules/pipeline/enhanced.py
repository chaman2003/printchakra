"""
Enhanced Document Processing Pipeline - Notebook Integration
Implements all 12 steps from processing.ipynb with adjustable parameters
"""

import logging
import os
import sys
import threading
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import pytesseract
from PIL import Image

_tesseract_cmd = os.environ.get("TESSERACT_CMD")
if _tesseract_cmd:
    pytesseract.pytesseract.tesseract_cmd = _tesseract_cmd

from ..image import ImageEnhancer

logger = logging.getLogger(__name__)


class EnhancedDocumentPipeline:
    """
    Complete document processing pipeline matching notebook implementation

    12-Step Pipeline:
    1. Load Original Image
    2. Downscale for Detection
    3. Convert to Grayscale (Detection)
    4. Gaussian Blur
    5. Canny Edge Detection
    6. Find Document Contour
    7. Perspective Transform (Crop)
    8. Grayscale & Downscale for Processing
    9. Morphological Background Estimation
    10. Smooth and Upscale Background
    11. Shadow Removal (Enhancement)
    12. OCR Text Extraction
    """

    _ocr_engine = None
    _ocr_device = "cpu"
    _ocr_lock = threading.Lock()

    def __init__(self, storage_dir: str = None, emit_callback=None):
        """
        Initialize the pipeline

        Args:
            storage_dir: Directory to store processed images
            emit_callback: Callback function for progress updates (for Socket.IO)
        """
        self.storage_dir = storage_dir or os.getcwd()
        self.emit_callback = emit_callback
        self.enhancer = ImageEnhancer()

        logger.info(f"EnhancedDocumentPipeline initialized with storage_dir: {self.storage_dir}")

    def emit_progress(self, step: int, total_steps: int, stage_name: str, message: str) -> None:
        """
        Emit progress update

        Args:
            step: Current step number
            total_steps: Total steps
            stage_name: Name of current stage
            message: Progress message
        """
        if self.emit_callback:
            try:
                self.emit_callback(
                    {
                        "step": step,
                        "total_steps": total_steps,
                        "stage_name": stage_name,
                        "message": message,
                    }
                )
            except Exception as e:
                logger.warning(f"Emit callback error: {e}")

        logger.info(f"[STEP {step}/{total_steps}] {stage_name} - {message}")

    def _remove_shadows_keep_color(self, image_bgr: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Notebook-style shadow removal while preserving color output."""
        gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        max_dim = 800
        bg_scale = min(max_dim / max(h, w), 1.0)
        if bg_scale < 1.0:
            small_gray = cv2.resize(gray, (int(w * bg_scale), int(h * bg_scale)))
        else:
            small_gray = gray

        sh, sw = small_gray.shape
        k = max(sh, sw) // 8
        k = k if k % 2 == 1 else k + 1
        k = max(31, min(k, 127))

        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
        bg_raw = cv2.morphologyEx(small_gray, cv2.MORPH_CLOSE, kernel)
        bg_smoothed = cv2.GaussianBlur(bg_raw, (k, k), 0)

        if bg_scale < 1.0:
            bg = cv2.resize(bg_smoothed, (w, h), interpolation=cv2.INTER_LINEAR)
            bg = cv2.GaussianBlur(bg, (31, 31), 0)
        else:
            bg = bg_smoothed

        bg_safe = bg.astype(np.float32)
        mask = bg_safe > 10

        result_color = np.zeros_like(image_bgr, dtype=np.float32)
        for c in range(3):
            channel = image_bgr[:, :, c].astype(np.float32)
            result_color[:, :, c][mask] = (channel[mask] / bg_safe[mask]) * 255.0

        enhanced_color = np.clip(result_color, 0, 255).astype(np.uint8)
        enhanced_gray = cv2.cvtColor(enhanced_color, cv2.COLOR_BGR2GRAY)
        return enhanced_color, enhanced_gray

    @staticmethod
    def _order_points(pts: np.ndarray) -> np.ndarray:
        """Order contour points as top-left, top-right, bottom-right, bottom-left."""
        rect = np.zeros((4, 2), dtype="float32")
        s = pts.sum(axis=1)
        diff = np.diff(pts, axis=1)
        rect[0] = pts[np.argmin(s)]
        rect[2] = pts[np.argmax(s)]
        rect[1] = pts[np.argmin(diff)]
        rect[3] = pts[np.argmax(diff)]
        return rect

    def _four_point_transform(self, image: np.ndarray, pts: np.ndarray) -> np.ndarray:
        """Apply the notebook's perspective transform."""
        rect = self._order_points(pts.astype("float32"))
        (tl, tr, br, bl) = rect

        width_a = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
        width_b = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
        max_width = max(int(width_a), int(width_b))

        height_a = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
        height_b = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
        max_height = max(int(height_a), int(height_b))

        dst = np.array(
            [[0, 0], [max_width - 1, 0], [max_width - 1, max_height - 1], [0, max_height - 1]],
            dtype="float32",
        )
        matrix = cv2.getPerspectiveTransform(rect, dst)
        return cv2.warpPerspective(image, matrix, (max_width, max_height))

    @staticmethod
    def _is_reasonable_document_quad(
        contour: np.ndarray,
        image_shape: Tuple[int, int],
        min_area_ratio: float = 0.22,
        max_area_ratio: float = 0.97,
    ) -> bool:
        """Validate that a 4-point contour looks like a full-page document."""
        img_h, img_w = image_shape[:2]
        if img_h <= 0 or img_w <= 0:
            return False

        contour_area = float(cv2.contourArea(contour))
        image_area = float(img_h * img_w)
        if image_area <= 0:
            return False
        area_ratio = contour_area / image_area
        if area_ratio < min_area_ratio or area_ratio > max_area_ratio:
            return False

        # Reject highly elongated or tiny projected rectangles.
        x, y, w, h = cv2.boundingRect(contour.astype(np.int32))
        if w <= 0 or h <= 0:
            return False
        aspect = max(w / max(h, 1e-6), h / max(w, 1e-6))
        if aspect > 3.0:
            return False

        return True

    @staticmethod
    def _quad_confidence(contour: np.ndarray, image_shape: Tuple[int, int]) -> float:
        """Score how likely a quad is to be the actual document boundary."""
        img_h, img_w = image_shape[:2]
        if img_h <= 0 or img_w <= 0:
            return 0.0

        area = float(cv2.contourArea(contour))
        image_area = float(img_h * img_w)
        if image_area <= 0:
            return 0.0
        area_ratio = area / image_area

        # Prefer quads that occupy a substantial part of frame,
        # but avoid forcing full-frame borders.
        area_score = max(0.0, 1.0 - abs(area_ratio - 0.65) / 0.65)

        rect = EnhancedDocumentPipeline._order_points(contour.astype("float32"))
        tl, tr, br, bl = rect
        edges = [
            np.linalg.norm(tr - tl),
            np.linalg.norm(br - tr),
            np.linalg.norm(bl - br),
            np.linalg.norm(tl - bl),
        ]
        if min(edges) <= 1e-6:
            return 0.0

        # Penalize highly skewed/degenerate quads.
        edge_ratio = min(edges) / max(edges)
        edge_score = max(0.0, min(1.0, edge_ratio * 2.0))

        # Right-angle consistency using cosine similarity (0 is ideal).
        def _abs_cos(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
            ab = a - b
            cb = c - b
            denom = float(np.linalg.norm(ab) * np.linalg.norm(cb))
            if denom <= 1e-6:
                return 1.0
            return abs(float(np.dot(ab, cb)) / denom)

        angle_err = np.mean(
            [
                _abs_cos(tl, tr, br),
                _abs_cos(tr, br, bl),
                _abs_cos(br, bl, tl),
                _abs_cos(bl, tl, tr),
            ]
        )
        angle_score = max(0.0, 1.0 - min(1.0, angle_err * 2.0))

        return float(0.55 * area_score + 0.20 * edge_score + 0.25 * angle_score)

    @staticmethod
    def _expand_quad(contour: np.ndarray, image_shape: Tuple[int, int], expand_ratio: float = 0.03) -> np.ndarray:
        """Expand quad slightly so card/page borders are not clipped."""
        img_h, img_w = image_shape[:2]
        pts = contour.astype(np.float32)
        center = np.mean(pts, axis=0)
        expanded = center + (pts - center) * (1.0 + expand_ratio)
        expanded[:, 0] = np.clip(expanded[:, 0], 0, max(img_w - 1, 0))
        expanded[:, 1] = np.clip(expanded[:, 1], 0, max(img_h - 1, 0))
        return expanded

    def _init_paddle_ocr(self) -> Tuple[Any, str]:
        """Initialize a shared PaddleOCR engine, falling back when unavailable."""
        with self._ocr_lock:
            if self._ocr_engine is not None:
                return self._ocr_engine, self._ocr_device

            if "torch" in sys.modules:
                raise RuntimeError("Torch already loaded; skipping PaddleOCR to avoid shm.dll conflicts")

            device = "cpu"
            try:
                if hasattr(cv2, "cuda") and cv2.cuda.getCudaEnabledDeviceCount() > 0:
                    device = "gpu"
            except Exception:
                device = "cpu"

            from paddleocr import PaddleOCR

            try:
                engine = PaddleOCR(
                    lang="en",
                    det_db_thresh=0.3,
                    det_db_box_thresh=0.5,
                    rec_batch_num=6,
                    device=device,
                    show_log=False,
                )
            except TypeError:
                engine = PaddleOCR(
                    use_angle_cls=True,
                    lang="en",
                    use_gpu=device == "gpu",
                    show_log=False,
                )

            self.__class__._ocr_engine = engine
            self.__class__._ocr_device = device
            return engine, device

    def _run_tesseract_ocr(self, image: np.ndarray) -> Tuple[str, List[Dict[str, Any]], str]:
        """Run the notebook's Tesseract OCR fallback."""
        pil_image = Image.fromarray(image)
        data = pytesseract.image_to_data(
            pil_image,
            lang="eng",
            config="--oem 3 --psm 3",
            output_type=pytesseract.Output.DICT,
        )

        boxes: List[Dict[str, Any]] = []
        texts: List[str] = []
        total = len(data.get("text", []))
        for idx in range(total):
            text = (data["text"][idx] or "").strip()
            try:
                conf = float(data["conf"][idx])
            except Exception:
                conf = -1.0
            if not text or conf <= 0:
                continue

            x = int(data["left"][idx])
            y = int(data["top"][idx])
            w = int(data["width"][idx])
            h = int(data["height"][idx])
            texts.append(text)
            boxes.append(
                {
                    "text": text,
                    "bbox": [[x, y], [x + w, y], [x + w, y + h], [x, y + h]],
                    "confidence": conf / 100.0,
                }
            )

        return " ".join(texts).strip(), boxes, "tesseract"

    def _run_paddle_ocr(self, image: np.ndarray) -> Tuple[str, List[Dict[str, Any]], str]:
        """Run PaddleOCR using the notebook-style configuration."""
        engine, device = self._init_paddle_ocr()
        result = engine.ocr(image)

        boxes: List[Dict[str, Any]] = []
        texts: List[str] = []
        for page in result or []:
            if not page:
                continue
            for line in page:
                points = line[0] if isinstance(line[0], list) else []
                text = line[1][0] if len(line) > 1 else ""
                score = float(line[1][1]) if len(line) > 1 else 0.0
                cleaned = (text or "").strip()
                if not cleaned:
                    continue
                texts.append(cleaned)
                boxes.append(
                    {
                        "text": cleaned,
                        "bbox": points,
                        "confidence": score,
                    }
                )

        return "\n".join(texts).strip(), boxes, f"paddleocr_{device}"

    def process_complete_pipeline(
        self,
        input_path: str,
        output_path: str,
        enhancement_params: Dict[str, Any] = None,
        options: Dict[str, Any] = None,
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Execute complete 12-step processing pipeline

        Args:
            input_path: Path to input image
            output_path: Path to save processed image
            enhancement_params: Custom enhancement parameters
            options: Processing options

        Returns:
            Tuple of (success, text_or_error, pipeline_stats)
        """
        try:
            if enhancement_params:
                self.enhancer.update_parameters(**enhancement_params)

            options = options or {}
            total_steps = 12
            pipeline_stats = {
                "steps": {},
                "start_time": datetime.now().isoformat(),
                "total_steps": total_steps,
                "parameters": self.enhancer.get_parameters(),
            }

            # ========== STEP 1: Load Original Image ==========
            self.emit_progress(
                1, total_steps, "Load Original Image", "Loading captured image..."
            )
            img = cv2.imread(input_path)
            if img is None:
                raise ValueError("Could not read input image")

            original_shape = img.shape
            pipeline_stats["steps"]["step_1"] = {
                "stage": "Load Original Image",
                "input_shape": original_shape,
                "timestamp": datetime.now().isoformat(),
            }

            # ========== STEP 2: Downscale for Detection ==========
            self.emit_progress(
                2, total_steps, "Downscale for Detection", "Creating smaller image for contour detection..."
            )
            detection_scale = 0.25
            small = cv2.resize(img, (0, 0), fx=detection_scale, fy=detection_scale)
            pipeline_stats["steps"]["step_2"] = {
                "stage": "Downscale for Detection",
                "scale": detection_scale,
                "output_shape": small.shape,
            }

            # ========== STEP 3: Convert to Grayscale (Detection) ==========
            self.emit_progress(
                3, total_steps, "Convert to Grayscale", "Preparing detection grayscale image..."
            )
            gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
            pipeline_stats["steps"]["step_3"] = {
                "stage": "Convert to Grayscale (Detection)",
                "output_shape": gray.shape,
                "channels": 1,
            }

            # ========== STEP 4: Gaussian Blur ==========
            self.emit_progress(4, total_steps, "Gaussian Blur", "Smoothing detection image...")
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            pipeline_stats["steps"]["step_4"] = {
                "stage": "Gaussian Blur",
                "method": "Gaussian 5x5",
                "output_shape": blurred.shape,
            }

            # Working copy for final output path (kept in color).
            working_color = img.copy()

            # ========== STEP 5: Canny Edge Detection ==========
            self.emit_progress(5, total_steps, "Edge Detection", "Finding document edges with Canny...")
            try:
                # Use multi-scale Canny matching notebook: (30, 100), (50, 150), (75, 200)
                edges = self.enhancer.apply_canny_edge_detection(
                    blurred, use_multi_scale=True, debug=True
                )
                # Dilate edges to close small gaps (matching notebook)
                edges = cv2.dilate(edges, np.ones((2, 2)), iterations=2)
                
                pipeline_stats["steps"]["step_5"] = {
                    "stage": "Edge Detection",
                    "method": "Canny Multi-Scale (30-100, 50-150, 75-200)",
                    "output_shape": edges.shape,
                    "edge_pixels": int(np.sum(edges > 0)),
                }
            except Exception as edge_err:
                logger.warning(f"Edge detection failed: {edge_err}, using fallback")
                # Fallback to simple Canny
                edges = cv2.Canny(blurred, 50, 150)
                pipeline_stats["steps"]["step_5"] = {
                    "stage": "Edge Detection",
                    "method": "Canny Fallback (50, 150)",
                    "error": str(edge_err),
                    "output_shape": edges.shape,
                }

            # ========== STEP 6: Find Document Contour ==========
            self.emit_progress(
                6, total_steps, "Find Document Contour", "Searching for 4-point page boundary..."
            )
            edge_lo = cv2.Canny(blurred, 20, 80)
            edge_hi = cv2.Canny(blurred, 60, 180)
            morph_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
            merged_edges = cv2.bitwise_or(edges, cv2.bitwise_or(edge_lo, edge_hi))
            merged_edges = cv2.morphologyEx(merged_edges, cv2.MORPH_CLOSE, morph_kernel, iterations=2)
            merged_edges = cv2.dilate(merged_edges, np.ones((2, 2), np.uint8), iterations=1)

            contours, _ = cv2.findContours(merged_edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
            contours = sorted(contours, key=cv2.contourArea, reverse=True)
            document_contour = None
            selected_area_ratio = 0.0
            selected_confidence = 0.0
            best_candidate = None
            best_score = 0.0
            selected_method = "none"

            # Pass 1: True quadrilateral candidates.
            for contour in contours[:30]:
                perimeter = cv2.arcLength(contour, True)
                for epsilon_ratio in (0.015, 0.02, 0.03):
                    epsilon = epsilon_ratio * perimeter
                    approx = cv2.approxPolyDP(contour, epsilon, True)
                    if len(approx) == 4:
                        candidate = approx.reshape(4, 2)
                        if self._is_reasonable_document_quad(candidate, gray.shape):
                            score = self._quad_confidence(candidate, gray.shape)
                            if score > best_score:
                                best_score = score
                                best_candidate = candidate

            # Pass 2 fallback: min-area rectangle from large contours.
            if best_candidate is None or best_score < 0.55:
                for contour in contours[:20]:
                    if cv2.contourArea(contour) < (gray.shape[0] * gray.shape[1] * 0.16):
                        continue
                    rect = cv2.minAreaRect(contour)
                    (w_rect, h_rect) = rect[1]
                    if w_rect <= 1 or h_rect <= 1:
                        continue
                    box = cv2.boxPoints(rect).astype(np.float32)
                    if self._is_reasonable_document_quad(
                        box,
                        gray.shape,
                        min_area_ratio=0.18,
                        max_area_ratio=0.98,
                    ):
                        score = self._quad_confidence(box, gray.shape)
                        # Small penalty vs true poly quads to prefer exact detections.
                        score *= 0.92
                        if score > best_score:
                            best_score = score
                            best_candidate = box
                            selected_method = "min_area_rect"

            # Apply perspective only when contour confidence is high enough.
            if best_candidate is not None and best_score >= 0.50:
                document_contour = best_candidate
                selected_area_ratio = float(cv2.contourArea(document_contour)) / float(
                    gray.shape[0] * gray.shape[1]
                )
                selected_confidence = best_score
                if selected_method == "none":
                    selected_method = "quad_poly"
            pipeline_stats["steps"]["step_6"] = {
                "stage": "Find Document Contour",
                "contours_found": len(contours),
                "document_found": document_contour is not None,
                "selected_area_ratio": selected_area_ratio,
                "selected_confidence": selected_confidence,
                "best_confidence_seen": best_score,
                "method": selected_method,
            }

            # ========== STEP 7: Perspective Transform (Crop) ==========
            self.emit_progress(
                7, total_steps, "Perspective Transform", "Cropping and straightening document..."
            )
            if document_contour is not None:
                expanded_contour = self._expand_quad(document_contour, gray.shape, expand_ratio=0.02)
                scaled_contour = expanded_contour / detection_scale
                warped = self._four_point_transform(working_color, scaled_contour)
                original_area = float(working_color.shape[0] * working_color.shape[1])
                warped_area = float(warped.shape[0] * warped.shape[1]) if warped is not None else 0.0
                warp_area_ratio = (warped_area / original_area) if original_area > 0 else 0.0
                warp_h, warp_w = (warped.shape[:2] if warped is not None else (0, 0))
                warp_aspect = (float(warp_w) / float(warp_h)) if warp_h > 0 else 0.0

                # Safety: avoid accidental crop to tiny regions (e.g. logo block).
                if (
                    warped is not None
                    and selected_area_ratio >= 0.24
                    and warp_area_ratio >= 0.26
                    and 0.42 <= warp_aspect <= 2.35
                ):
                    working_color = warped
                    applied = True
                else:
                    applied = False
                    logger.warning(
                        "Perspective transform rejected (warp_area_ratio=%.3f, warp_aspect=%.3f). Keeping original frame.",
                        warp_area_ratio,
                        warp_aspect,
                    )
                pipeline_stats["steps"]["step_7"] = {
                    "stage": "Perspective Transform (Crop)",
                    "applied": applied,
                    "new_shape": working_color.shape,
                    "warp_area_ratio": warp_area_ratio,
                    "warp_aspect": warp_aspect,
                }
            else:
                pipeline_stats["steps"]["step_7"] = {
                    "stage": "Perspective Transform (Crop)",
                    "applied": False,
                    "reason": "No 4-point contour found",
                }

            # ========== STEP 8: Grayscale & Downscale for Processing ==========
            self.emit_progress(8, total_steps, "Processing Prep", "Preparing image for enhancement...")
            processing_gray = cv2.cvtColor(working_color, cv2.COLOR_BGR2GRAY)
            h, w = processing_gray.shape
            max_dim = 800
            processing_scale = min(max_dim / max(h, w), 1.0)
            if processing_scale < 1.0:
                small_gray = cv2.resize(
                    processing_gray,
                    (int(w * processing_scale), int(h * processing_scale)),
                )
            else:
                small_gray = processing_gray
            pipeline_stats["steps"]["step_8"] = {
                "stage": "Grayscale & Downscale for Processing",
                "gray_shape": processing_gray.shape,
                "processing_scale": processing_scale,
                "downscaled_shape": small_gray.shape,
            }

            # ========== STEP 9: Morphological Background Estimation ==========
            self.emit_progress(9, total_steps, "Background Estimation", "Estimating page background...")
            sh, sw = small_gray.shape
            k = max(sh, sw) // 8
            k = k if k % 2 == 1 else k + 1
            k = max(31, min(k, 127))
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
            bg_raw = cv2.morphologyEx(small_gray, cv2.MORPH_CLOSE, kernel)
            pipeline_stats["steps"]["step_9"] = {
                "stage": "Morphological Background Estimation",
                "kernel_size": k,
                "output_shape": bg_raw.shape,
            }

            # ========== STEP 10: Smooth and Upscale Background ==========
            self.emit_progress(10, total_steps, "Background Smoothing", "Smoothing estimated background...")
            bg_smoothed = cv2.GaussianBlur(bg_raw, (k, k), 0)
            if processing_scale < 1.0:
                bg = cv2.resize(bg_smoothed, (w, h), interpolation=cv2.INTER_LINEAR)
                bg = cv2.GaussianBlur(bg, (31, 31), 0)
            else:
                bg = bg_smoothed
            pipeline_stats["steps"]["step_10"] = {
                "stage": "Smooth and Upscale Background",
                "output_shape": bg.shape,
            }

            # ========== STEP 11: Shadow Removal (Enhancement) ==========
            self.emit_progress(11, total_steps, "Shadow Removal", "Removing shadows and enhancing document...")
            bg_safe = bg.astype(np.float32)
            mask = bg_safe > 10
            result_color = np.zeros_like(working_color, dtype=np.float32)
            for channel_index in range(3):
                channel = working_color[:, :, channel_index].astype(np.float32)
                result_color[:, :, channel_index][mask] = (channel[mask] / bg_safe[mask]) * 255.0
            enhanced_color = np.clip(result_color, 0, 255).astype(np.uint8)
            enhanced_gray = cv2.cvtColor(enhanced_color, cv2.COLOR_BGR2GRAY)
            gray_std = float(enhanced_gray.std())
            gray_range = int(enhanced_gray.max()) - int(enhanced_gray.min())
            output_image = enhanced_color

            # Guard against collapsed outputs that become almost solid-color blocks.
            if gray_std < 8.0 or gray_range < 24:
                logger.warning(
                    "Enhanced output collapsed to near-uniform image; falling back to cropped/original image"
                )
                output_image = working_color
                enhanced_gray = cv2.cvtColor(output_image, cv2.COLOR_BGR2GRAY)
            pipeline_stats["steps"]["step_11"] = {
                "stage": "Shadow Removal (Enhancement)",
                "output_shape": enhanced_gray.shape,
                "method": "Notebook-style color-preserving shadow removal",
                "stddev": gray_std,
                "range": gray_range,
                "fallback_used": output_image is not enhanced_color,
            }

            # Save the enhanced document for dashboard preview and downloads.
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            cv2.imwrite(output_path, output_image, [cv2.IMWRITE_JPEG_QUALITY, 90])

            # ========== STEP 12: OCR Text Extraction ==========
            self.emit_progress(12, total_steps, "OCR Text Extraction", "Extracting text from processed document...")
            text = ""
            raw_results: List[Dict[str, Any]] = []
            ocr_engine = "tesseract"
            try:
                try:
                    text, raw_results, ocr_engine = self._run_paddle_ocr(enhanced_gray)
                except Exception as paddle_error:
                    logger.warning(f"PaddleOCR unavailable, falling back to Tesseract: {paddle_error}")
                    text, raw_results, ocr_engine = self._run_tesseract_ocr(enhanced_gray)
            except Exception as ocr_error:
                logger.warning(f"OCR failed: {ocr_error}")

            confidence_avg = (
                sum(float(item.get("confidence", 0.0)) for item in raw_results) / len(raw_results)
                if raw_results
                else 0.0
            )
            text_lines = [line.strip() for line in text.splitlines() if line.strip()]
            structured_units = [{"text": line, "type": "paragraph"} for line in text_lines]
            pipeline_stats["steps"]["step_12"] = {
                "stage": "OCR Text Extraction",
                "engine": ocr_engine,
                "text_length": len(text),
                "words_extracted": len(text.split()),
                "regions_detected": len(raw_results),
                "confidence": float(confidence_avg * 100),
            }
            pipeline_stats["ocr_result"] = {
                "raw_results": raw_results,
                "structured_units": structured_units,
                "full_text": text,
                "derived_title": text_lines[0][:120] if text_lines else "",
                "confidence_avg": float(confidence_avg),
                "word_count": len([word for word in text.replace("\n", " ").split(" ") if word.strip()]),
                "timestamp": datetime.now().isoformat(),
                "processing_time_ms": 0,
                "image_dimensions": [int(output_image.shape[1]), int(output_image.shape[0])],
                "engine": ocr_engine,
            }
            pipeline_stats["output"] = {
                "output_path": output_path,
                "file_size": os.path.getsize(output_path),
                "format": "JPEG",
                "compression_quality": 90,
            }

            pipeline_stats["end_time"] = datetime.now().isoformat()
            pipeline_stats["success"] = True

            logger.info(
                f"✅ Pipeline complete. Text extracted: {len(text)} characters using {ocr_engine}"
            )

            return True, text, pipeline_stats

        except Exception as e:
            logger.error(f"Pipeline error: {str(e)}")
            pipeline_stats["error"] = str(e)
            pipeline_stats["success"] = False
            return False, str(e), pipeline_stats

    def process_with_custom_params(
        self,
        input_path: str,
        output_path: str,
        enhancement_params: Dict[str, Any] = None,
        edge_thresholds: Tuple[int, int] = None,
        morpho_params: Dict[str, int] = None,
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Process image with fully custom parameters

        Useful for A/B testing and parameter optimization

        Args:
            input_path: Input image path
            output_path: Output image path
            enhancement_params: Dict with brightness_boost, equalization_strength, etc.
            edge_thresholds: Tuple of (threshold1, threshold2) for Canny
            morpho_params: Dict with kernel_size and iterations for morphological ops

        Returns:
            Tuple of (success, text_or_error, pipeline_stats)
        """
        # Apply custom enhancement params
        if enhancement_params:
            self.enhancer.update_parameters(**enhancement_params)

        # Could extend with custom thresholds, etc.
        return self.process_complete_pipeline(input_path, output_path)

    def get_pipeline_info(self) -> Dict[str, Any]:
        """Get current pipeline configuration and stats"""
        return {
            "total_steps": 12,
            "current_parameters": self.enhancer.get_parameters(),
            "available_enhancements": {
                "brightness_boost_range": (0, 50),
                "equalization_strength_range": (0.0, 1.0),
                "clahe_clip_limit_range": (1.0, 4.0),
                "clahe_tile_size_options": [4, 8, 16],
            },
            "supported_formats": ["jpg", "jpeg", "png", "bmp"],
            "max_image_size": "50MB",
            "ocr_languages": ["eng"],
        }
