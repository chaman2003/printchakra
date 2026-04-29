import asyncio
import base64
import json
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path
from typing import Any

import cv2
import img2pdf
import numpy as np
from fastapi import HTTPException, WebSocket, WebSocketDisconnect
from PIL import Image

logger = logging.getLogger(__name__)


# Single source-of-truth config for the scan pipeline.
SCAN_CONFIG: dict[str, Any] = {
    "motion_threshold_pixels": 50000,
    "motion_pixel_diff_threshold": 25,
    "settle_time_seconds": 1.5,
    "enhancement_mode": "color",
    "jpeg_quality": 85,
}


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _base_session_dir() -> Path:
    return _repo_root() / "backend" / "public" / "data" / "scan_sessions"


def _pdf_output_dir() -> Path:
    return _repo_root() / "backend" / "public" / "data" / "pdf_exports"


def _order_points(pts: np.ndarray) -> np.ndarray:
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]
    return rect


def _quad_border_touches(pts: np.ndarray, shape: tuple[int, int, int], margin_ratio: float = 0.02) -> int:
    h, w = shape[:2]
    margin_x = w * margin_ratio
    margin_y = h * margin_ratio
    xs = pts[:, 0]
    ys = pts[:, 1]
    touches = 0
    if np.min(xs) <= margin_x:
        touches += 1
    if np.max(xs) >= (w - margin_x):
        touches += 1
    if np.min(ys) <= margin_y:
        touches += 1
    if np.max(ys) >= (h - margin_y):
        touches += 1
    return touches


def _scale_quad(pts: np.ndarray, shape: tuple[int, int, int], scale_ratio: float = 1.0) -> np.ndarray:
    h, w = shape[:2]
    center = np.mean(pts, axis=0)
    scaled = center + (pts - center) * scale_ratio
    scaled[:, 0] = np.clip(scaled[:, 0], 0, max(w - 1, 0))
    scaled[:, 1] = np.clip(scaled[:, 1], 0, max(h - 1, 0))
    return scaled.astype("float32")


def _is_document_aspect(max_width: float, max_height: float) -> bool:
    long_side = max(max_width, max_height)
    short_side = min(max_width, max_height)
    if long_side <= 1e-6:
        return False
    ratio = short_side / long_side
    # Accept common document/card proportions (A-series sheets, IDs, badges).
    return 0.55 <= ratio <= 0.90


def detect_document_and_crop(frame_bgr: np.ndarray) -> tuple[np.ndarray, bool]:
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (21, 21), 0)
    edges = cv2.Canny(blur, 50, 150)
    dilated = cv2.dilate(edges, np.ones((3, 3), dtype=np.uint8), iterations=1)
    frame_area = float(frame_bgr.shape[0] * frame_bgr.shape[1])
    contours, _ = cv2.findContours(dilated, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)
    best_pts: np.ndarray | None = None
    best_score = 0.0
    for contour in contours[:50]:
        contour_area = float(cv2.contourArea(contour))
        # Ignore tiny contours; they are commonly logos/inner boxes.
        if frame_area <= 0 or (contour_area / frame_area) < 0.08:
            continue
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        candidate_sets: list[np.ndarray] = []
        if len(approx) == 4 and cv2.isContourConvex(approx):
            candidate_sets.append(approx.reshape(4, 2).astype("float32"))

        # Fallback candidate from minAreaRect helps tilted ID cards.
        rect = cv2.minAreaRect(contour)
        rw, rh = rect[1]
        if rw > 1 and rh > 1:
            candidate_sets.append(cv2.boxPoints(rect).astype("float32"))

        for raw_pts in candidate_sets:
            pts = _order_points(raw_pts)
            tl, tr, br, bl = pts
            width_a = np.linalg.norm(br - bl)
            width_b = np.linalg.norm(tr - tl)
            max_width = int(max(width_a, width_b))
            height_a = np.linalg.norm(tr - br)
            height_b = np.linalg.norm(tl - bl)
            max_height = int(max(height_a, height_b))
            if max_width < 60 or max_height < 60:
                continue
            quad_area = float(cv2.contourArea(pts.astype(np.float32)))
            area_ratio = quad_area / frame_area if frame_area > 0 else 0.0
            if area_ratio < 0.08 or area_ratio > 0.90:
                continue
            # Reject candidates that hug many borders (often false scene boundaries).
            if _quad_border_touches(pts, frame_bgr.shape, margin_ratio=0.02) >= 1:
                continue
            if not _is_document_aspect(max_width, max_height):
                continue
            # Score larger central quads higher.
            c_x = float(np.mean(pts[:, 0]))
            c_y = float(np.mean(pts[:, 1]))
            h, w = frame_bgr.shape[:2]
            norm_dist = np.sqrt((c_x - w / 2) ** 2 + (c_y - h / 2) ** 2) / max(
                np.sqrt((w / 2) ** 2 + (h / 2) ** 2), 1e-6
            )
            score = (area_ratio * 0.8) + ((1.0 - norm_dist) * 0.2)
            if score > best_score:
                best_score = score
                best_pts = pts

    if best_pts is not None:
        # Expand a little so full document edges are preserved after warp.
        best_pts = _scale_quad(best_pts, frame_bgr.shape, scale_ratio=1.03)
        tl, tr, br, bl = best_pts
        width_a = np.linalg.norm(br - bl)
        width_b = np.linalg.norm(tr - tl)
        max_width = int(max(width_a, width_b))
        height_a = np.linalg.norm(tr - br)
        height_b = np.linalg.norm(tl - bl)
        max_height = int(max(height_a, height_b))
        dst = np.array(
            [[0, 0], [max_width - 1, 0], [max_width - 1, max_height - 1], [0, max_height - 1]],
            dtype="float32",
        )
        matrix = cv2.getPerspectiveTransform(best_pts, dst)
        warped = cv2.warpPerspective(frame_bgr, matrix, (max_width, max_height))
        # Keep output scan at useful full size.
        wh, ww = warped.shape[:2]
        target_long_side = max(int(max(frame_bgr.shape[:2]) * 0.9), 900)
        current_long_side = max(wh, ww)
        if current_long_side > 0 and current_long_side < target_long_side:
            scale = target_long_side / float(current_long_side)
            warped = cv2.resize(
                warped, (int(ww * scale), int(wh * scale)), interpolation=cv2.INTER_CUBIC
            )
        return warped, True

    # Fallback: segment bright, low-saturation paper/card regions.
    hsv = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, (0, 0, 110), (180, 110, 255))
    mask = cv2.medianBlur(mask, 5)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (9, 9))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    fallback_contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    fallback_contours = sorted(fallback_contours, key=cv2.contourArea, reverse=True)
    for contour in fallback_contours[:20]:
        area = float(cv2.contourArea(contour))
        area_ratio = area / frame_area if frame_area > 0 else 0.0
        if area_ratio < 0.08:
            continue
        rect = cv2.minAreaRect(contour)
        rw, rh = rect[1]
        if rw < 60 or rh < 60:
            continue
        pts = _order_points(cv2.boxPoints(rect).astype("float32"))
        if _quad_border_touches(pts, frame_bgr.shape, margin_ratio=0.02) >= 1:
            continue
        if not _is_document_aspect(rw, rh):
            continue
        pts = _scale_quad(pts, frame_bgr.shape, scale_ratio=1.03)
        tl, tr, br, bl = pts
        max_width = int(max(np.linalg.norm(br - bl), np.linalg.norm(tr - tl)))
        max_height = int(max(np.linalg.norm(tr - br), np.linalg.norm(tl - bl)))
        if max_width < 60 or max_height < 60:
            continue
        dst = np.array(
            [[0, 0], [max_width - 1, 0], [max_width - 1, max_height - 1], [0, max_height - 1]],
            dtype="float32",
        )
        matrix = cv2.getPerspectiveTransform(pts, dst)
        warped = cv2.warpPerspective(frame_bgr, matrix, (max_width, max_height))
        wh, ww = warped.shape[:2]
        target_long_side = max(int(max(frame_bgr.shape[:2]) * 0.9), 900)
        current_long_side = max(wh, ww)
        if current_long_side > 0 and current_long_side < target_long_side:
            scale = target_long_side / float(current_long_side)
            warped = cv2.resize(
                warped, (int(ww * scale), int(wh * scale)), interpolation=cv2.INTER_CUBIC
            )
        return warped, True

    # Final fallback: GrabCut in the center ROI, then minAreaRect on foreground.
    try:
        h, w = frame_bgr.shape[:2]
        grab_mask = np.zeros((h, w), np.uint8)
        bg_model = np.zeros((1, 65), np.float64)
        fg_model = np.zeros((1, 65), np.float64)
        rect = (int(w * 0.12), int(h * 0.18), int(w * 0.76), int(h * 0.74))
        cv2.grabCut(frame_bgr, grab_mask, rect, bg_model, fg_model, 5, cv2.GC_INIT_WITH_RECT)
        fg_mask = np.where((grab_mask == 2) | (grab_mask == 0), 0, 1).astype("uint8") * 255
        fg_mask = cv2.morphologyEx(
            fg_mask,
            cv2.MORPH_CLOSE,
            cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7)),
            iterations=2,
        )
        contours_gc, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours_gc = sorted(contours_gc, key=cv2.contourArea, reverse=True)
        for contour in contours_gc[:10]:
            area = float(cv2.contourArea(contour))
            if frame_area <= 0 or (area / frame_area) < 0.12:
                continue
            rect_gc = cv2.minAreaRect(contour)
            rw, rh = rect_gc[1]
            if rw < 80 or rh < 80:
                continue
            pts = _order_points(cv2.boxPoints(rect_gc).astype("float32"))
            if _quad_border_touches(pts, frame_bgr.shape, margin_ratio=0.02) >= 1:
                continue
            if not _is_document_aspect(rw, rh):
                continue
            pts = _scale_quad(pts, frame_bgr.shape, scale_ratio=1.04)
            tl, tr, br, bl = pts
            max_width = int(max(np.linalg.norm(br - bl), np.linalg.norm(tr - tl)))
            max_height = int(max(np.linalg.norm(tr - br), np.linalg.norm(tl - bl)))
            if max_width < 80 or max_height < 80:
                continue
            dst = np.array(
                [[0, 0], [max_width - 1, 0], [max_width - 1, max_height - 1], [0, max_height - 1]],
                dtype="float32",
            )
            matrix = cv2.getPerspectiveTransform(pts, dst)
            warped = cv2.warpPerspective(frame_bgr, matrix, (max_width, max_height))
            wh, ww = warped.shape[:2]
            target_long_side = max(int(max(frame_bgr.shape[:2]) * 0.9), 900)
            current_long_side = max(wh, ww)
            if current_long_side > 0 and current_long_side < target_long_side:
                scale = target_long_side / float(current_long_side)
                warped = cv2.resize(
                    warped, (int(ww * scale), int(wh * scale)), interpolation=cv2.INTER_CUBIC
                )
            return warped, True
    except Exception:
        pass
    return frame_bgr, False


def enhance_image_to_jpeg(frame_bgr: np.ndarray, mode: str, jpeg_quality: int) -> bytes:
    mode = (mode or "bw").lower()
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)

    def _notebook_shadow_remove(gray_img: np.ndarray) -> np.ndarray:
        h, w = gray_img.shape
        max_dim = 800
        bg_scale = min(max_dim / max(h, w), 1.0)
        small_gray = (
            cv2.resize(gray_img, (int(w * bg_scale), int(h * bg_scale)))
            if bg_scale < 1.0
            else gray_img
        )
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
        result = np.zeros_like(gray_img, dtype=np.float32)
        mask = bg > 10
        result[mask] = (gray_img[mask].astype(np.float32) / bg[mask].astype(np.float32)) * 255.0
        return np.clip(result, 0, 255).astype(np.uint8)

    if mode == "bw":
        base_gray = _notebook_shadow_remove(gray)
        enhanced = cv2.adaptiveThreshold(
            base_gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        denoised = cv2.fastNlMeansDenoising(enhanced, None, h=10)
        base = denoised
    else:
        lab = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        # Notebook-style shadow removal on luminance channel.
        l_shadow_free = _notebook_shadow_remove(l)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l2 = clahe.apply(l_shadow_free)
        color = cv2.cvtColor(cv2.merge((l2, a, b)), cv2.COLOR_LAB2BGR)
        denoised = cv2.fastNlMeansDenoisingColored(
            color, None, h=10, hColor=10, templateWindowSize=7, searchWindowSize=21
        )
        # CamScanner-like color pop with slight brightness/contrast lift.
        base = cv2.convertScaleAbs(denoised, alpha=1.08, beta=8)
    blurred = cv2.GaussianBlur(base, (5, 5), 0)
    sharpened = cv2.addWeighted(base, 1.5, blurred, -0.5, 0)
    quality = int(max(1, min(100, jpeg_quality)))
    ok, out = cv2.imencode(".jpg", sharpened, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not ok:
        raise RuntimeError("Failed to encode processed image to JPEG")
    return out.tobytes()


def process_crop_and_enhance(frame_bgr: np.ndarray, config: dict[str, Any]) -> tuple[bytes, bool]:
    cropped, found = detect_document_and_crop(frame_bgr)
    jpeg_bytes = enhance_image_to_jpeg(
        cropped,
        mode=str(config.get("enhancement_mode", "bw")),
        jpeg_quality=int(config.get("jpeg_quality", 85)),
    )
    return jpeg_bytes, found


@dataclass
class MotionState:
    previous_gray: np.ndarray | None = None
    motion_active: bool = False
    last_motion_timestamp: float = 0.0
    latest_frame_bgr: np.ndarray | None = None


@dataclass
class SessionData:
    session_id: str
    folder: Path
    files: list[Path] = field(default_factory=list)


class DocumentScanWebSocketService:
    def __init__(self, base_config: dict[str, Any] | None = None) -> None:
        self.base_config = dict(SCAN_CONFIG)
        if base_config:
            self.base_config.update(base_config)
        self.desktop_clients: set[WebSocket] = set()
        self.phone_states: dict[WebSocket, MotionState] = {}
        self.phone_sessions: dict[WebSocket, str] = {}
        self.sessions: dict[str, SessionData] = {}
        self.lock = asyncio.Lock()
        self.executor = ThreadPoolExecutor(max_workers=max(2, (os.cpu_count() or 2) // 2))
        _base_session_dir().mkdir(parents=True, exist_ok=True)
        _pdf_output_dir().mkdir(parents=True, exist_ok=True)

    def get_config(self) -> dict[str, Any]:
        return dict(self.base_config)

    async def websocket_handler(self, websocket: WebSocket) -> None:
        await websocket.accept()
        try:
            while True:
                packet = await websocket.receive()
                if packet.get("bytes") is not None:
                    await self._handle_binary_frame(websocket, packet["bytes"])
                elif packet.get("text") is not None:
                    await self._handle_text_message(websocket, packet["text"])
        except WebSocketDisconnect:
            await self._cleanup_client(websocket)
        except Exception:
            logger.exception("Document scan websocket error")
            await self._cleanup_client(websocket)

    async def _handle_text_message(self, websocket: WebSocket, text: str) -> None:
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            await websocket.send_json({"type": "error", "message": "Invalid JSON payload"})
            return
        message_type = str(payload.get("type", "")).lower()
        if message_type == "register":
            client = str(payload.get("client", "")).lower()
            if client == "desktop":
                async with self.lock:
                    self.desktop_clients.add(websocket)
                await websocket.send_json({"type": "registered", "client": "desktop"})
                return
            if client == "phone":
                # Session folders are always timestamp-named for deterministic ordering.
                session_id = str(int(time.time() * 1000))
                await self._register_phone(websocket, session_id)
                await websocket.send_json(
                    {"type": "registered", "client": "phone", "session_id": session_id}
                )
                return
            await websocket.send_json({"type": "error", "message": "Unknown client role"})
            return
        if message_type == "config":
            updates = payload.get("config") or {}
            if not isinstance(updates, dict):
                await websocket.send_json({"type": "error", "message": "config must be an object"})
                return
            self.base_config.update(updates)
            await websocket.send_json({"type": "config", "config": self.get_config()})
            return
        if message_type == "ping":
            await websocket.send_json({"type": "pong"})
            return
        await websocket.send_json({"type": "error", "message": "Unsupported message type"})

    async def _register_phone(self, websocket: WebSocket, session_id: str) -> None:
        async with self.lock:
            self.phone_states.setdefault(websocket, MotionState())
            self.phone_sessions[websocket] = session_id
            if session_id not in self.sessions:
                folder = _base_session_dir() / session_id
                folder.mkdir(parents=True, exist_ok=True)
                self.sessions[session_id] = SessionData(session_id=session_id, folder=folder)

    async def _handle_binary_frame(self, websocket: WebSocket, payload: bytes) -> None:
        state = self.phone_states.get(websocket)
        session_id = self.phone_sessions.get(websocket)
        if state is None or not session_id:
            await websocket.send_json(
                {"type": "error", "message": "Phone must register before sending frames"}
            )
            return
        frame = cv2.imdecode(np.frombuffer(payload, dtype=np.uint8), cv2.IMREAD_COLOR)
        if frame is None:
            await websocket.send_json({"type": "error", "message": "Invalid JPEG frame"})
            return
        settled = self._update_motion_state(state, frame)
        if settled is None:
            return
        loop = asyncio.get_running_loop()
        jpeg_bytes, found = await loop.run_in_executor(
            self.executor, process_crop_and_enhance, settled, self.get_config()
        )
        filename = f"{int(time.time() * 1000)}.jpg"
        await self._broadcast_processed_image(jpeg_bytes, session_id, filename, found)
        await self._save_session_image(session_id, filename, jpeg_bytes)

    def _update_motion_state(self, state: MotionState, frame_bgr: np.ndarray) -> np.ndarray | None:
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        if state.previous_gray is None:
            state.previous_gray = gray
            state.latest_frame_bgr = frame_bgr
            return None
        diff = cv2.absdiff(state.previous_gray, gray)
        motion_mask = cv2.threshold(
            diff, int(self.base_config.get("motion_pixel_diff_threshold", 25)), 255, cv2.THRESH_BINARY
        )[1]
        changed_pixels = int(cv2.countNonZero(motion_mask))
        now = time.time()
        threshold = int(self.base_config.get("motion_threshold_pixels", 50000))
        settle_time = float(self.base_config.get("settle_time_seconds", 1.5))
        state.previous_gray = gray
        state.latest_frame_bgr = frame_bgr
        if changed_pixels > threshold:
            state.motion_active = True
            state.last_motion_timestamp = now
            return None
        if state.motion_active and (now - state.last_motion_timestamp) >= settle_time:
            state.motion_active = False
            return state.latest_frame_bgr.copy() if state.latest_frame_bgr is not None else None
        return None

    async def _save_session_image(self, session_id: str, filename: str, jpeg_bytes: bytes) -> Path:
        async with self.lock:
            session = self.sessions.get(session_id)
            if session is None:
                folder = _base_session_dir() / session_id
                folder.mkdir(parents=True, exist_ok=True)
                session = SessionData(session_id=session_id, folder=folder)
                self.sessions[session_id] = session
            path = session.folder / filename
            with path.open("wb") as f:
                f.write(jpeg_bytes)
            session.files.append(path)
            session.files.sort()
            return path

    async def _broadcast_processed_image(
        self, jpeg_bytes: bytes, session_id: str, filename: str, found: bool
    ) -> None:
        payload = {
            "type": "processed_image",
            "session_id": session_id,
            "filename": filename,
            "found": found,
            "image_base64": base64.b64encode(jpeg_bytes).decode("ascii"),
        }
        async with self.lock:
            targets = list(self.desktop_clients)
        stale: list[WebSocket] = []
        for ws in targets:
            try:
                await ws.send_json(payload)
            except Exception:
                stale.append(ws)
        if stale:
            async with self.lock:
                for ws in stale:
                    self.desktop_clients.discard(ws)

    async def _cleanup_client(self, websocket: WebSocket) -> None:
        async with self.lock:
            self.desktop_clients.discard(websocket)
            self.phone_states.pop(websocket, None)
            self.phone_sessions.pop(websocket, None)

    def export_pdf(self, session_id: str) -> str:
        session = self.sessions.get(session_id)
        if session is None:
            folder = _base_session_dir() / session_id
            if not folder.exists():
                raise HTTPException(status_code=404, detail="session_id not found")
            files = sorted(folder.glob("*.jpg"))
            session = SessionData(session_id=session_id, folder=folder, files=files)
            self.sessions[session_id] = session
        images = sorted(session.files) if session.files else sorted(session.folder.glob("*.jpg"))
        if not images:
            raise HTTPException(status_code=404, detail="No images found for session")
        a4_size = (2480, 3508)
        converted: list[bytes] = []
        for image_path in images:
            with Image.open(image_path) as img:
                rgb = img.convert("RGB")
                ratio = min(a4_size[0] / rgb.width, a4_size[1] / rgb.height)
                resized = rgb.resize((int(rgb.width * ratio), int(rgb.height * ratio)), Image.Resampling.LANCZOS)
                canvas = Image.new("RGB", a4_size, (255, 255, 255))
                x = (a4_size[0] - resized.width) // 2
                y = (a4_size[1] - resized.height) // 2
                canvas.paste(resized, (x, y))
                buffer = BytesIO()
                canvas.save(buffer, format="JPEG", quality=95)
                converted.append(buffer.getvalue())
        output_path = _pdf_output_dir() / f"{session_id}.pdf"
        with output_path.open("wb") as out:
            out.write(img2pdf.convert(converted))
        return str(output_path)
