"""LaporJalan AI service: image -> structured damage analysis.

Called only by the `analyze` Edge Function with a shared secret; never directly by the app.
"""
from __future__ import annotations

import hmac
import io
import os
from functools import lru_cache

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from .detector import Detector, ModelUnavailable, load_detector

MAX_BYTES = 5 * 1024 * 1024
ALLOWED = {"image/jpeg", "image/png", "image/webp"}
MIN_CONFIDENCE = float(os.getenv("MIN_CONFIDENCE", "0.25"))
Image.MAX_IMAGE_PIXELS = 40_000_000  # decompression-bomb guard

app = FastAPI(title="LaporJalan AI Service", version="0.1.0")


@lru_cache(maxsize=1)
def get_detector() -> Detector:
    return load_detector()


def require_token(x_internal_token: str | None = Header(default=None)) -> None:
    expected = os.getenv("AI_SERVICE_INTERNAL_TOKEN", "")
    # Fail closed: an unset secret must not mean "open".
    if not expected or not x_internal_token or not hmac.compare_digest(x_internal_token, expected):
        raise HTTPException(status_code=401, detail={"code": "unauthorized"})


def estimate_severity(area_ratio: float, confidence: float) -> str:
    """Crude heuristic from the largest detection's share of the frame. An ESTIMATE only."""
    if confidence < 0.4:
        return "low"
    if area_ratio >= 0.20:
        return "critical"
    if area_ratio >= 0.08:
        return "high"
    if area_ratio >= 0.02:
        return "medium"
    return "low"


@app.get("/health")
def health() -> dict:
    try:
        get_detector()
        return {"status": "ok", "model_loaded": True}
    except ModelUnavailable as e:
        return {"status": "degraded", "model_loaded": False, "reason": str(e)}


@app.post("/analyze", dependencies=[Depends(require_token)])
async def analyze(file: UploadFile = File(...)) -> dict:
    if file.content_type not in ALLOWED:
        raise HTTPException(status_code=415, detail={"code": "unsupported_media_type"})
    data = await file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=413, detail={"code": "file_too_large"})
    try:
        image = Image.open(io.BytesIO(data))
        image.load()  # decodes the real content; the declared type is not trusted
        image = image.convert("RGB")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise HTTPException(status_code=422, detail={"code": "invalid_image"})

    try:
        detector = get_detector()
    except ModelUnavailable as e:
        # Never return made-up predictions.
        raise HTTPException(status_code=503, detail={"code": "model_unavailable", "message": str(e)})

    boxes = [b for b in detector.detect(image) if b.confidence >= MIN_CONFIDENCE]
    if not boxes:
        return {"category": "none", "confidence": 0.0, "boxes": [], "severity_estimate": None,
                "model_version": detector.version, "note": "Tidak ada kerusakan yang dikenali model."}

    best = max(boxes, key=lambda b: b.confidence)
    frame = image.width * image.height
    largest = max(boxes, key=lambda b: b.w * b.h)
    return {
        "category": best.label,
        "confidence": round(best.confidence, 4),
        "boxes": [{"label": b.label, "raw_label": b.raw_label, "confidence": round(b.confidence, 4),
                   "x": round(b.x), "y": round(b.y), "w": round(b.w), "h": round(b.h)} for b in boxes],
        "severity_estimate": estimate_severity((largest.w * largest.h) / frame, largest.confidence),
        "model_version": detector.version,
        "note": "Keparahan hanya estimasi dan perlu ditinjau petugas.",
    }
