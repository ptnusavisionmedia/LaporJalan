"""Damage detector abstraction.

No predictions are ever fabricated: if weights are missing or the inference backend is not
installed, `ModelUnavailable` is raised and the API answers 503.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from PIL import Image


class ModelUnavailable(Exception):
    """Weights or inference backend are not available."""


@dataclass
class Box:
    label: str          # normalised category, see CATEGORY_MAP
    raw_label: str      # class name as emitted by the model
    confidence: float   # 0..1
    x: float            # box, pixels in the submitted image
    y: float
    w: float
    h: float


class Detector(Protocol):
    version: str

    def detect(self, image: Image.Image) -> list[Box]: ...


# Maps raw model class names to the API categories. The defaults assume weights trained on
# RDD2022-style classes; override with CLASS_MAP_PATH (JSON object) for other label sets.
# Sidewalk damage is NOT covered by those datasets, so it is only reported if a custom map
# routes some class to "sidewalk_damage".
DEFAULT_CLASS_MAP = {
    "D00": "road_crack", "D10": "road_crack", "D20": "road_crack",
    "D40": "pothole", "pothole": "pothole", "crack": "road_crack",
}


def load_class_map() -> dict[str, str]:
    path = os.getenv("CLASS_MAP_PATH")
    if not path:
        return DEFAULT_CLASS_MAP
    return json.loads(Path(path).read_text(encoding="utf-8"))


class UltralyticsDetector:
    """Backend using the `ultralytics` package.

    LICENSE WARNING: ultralytics is AGPL-3.0 (or a paid enterprise licence). Serving it over
    a network triggers AGPL source-disclosure duties. Verify the licence of BOTH the package
    and the weights file before deploying. It is deliberately not in requirements.txt.
    """

    def __init__(self, weights_path: str, version: str) -> None:
        try:
            from ultralytics import YOLO  # type: ignore
        except ImportError as e:  # pragma: no cover - depends on optional install
            raise ModelUnavailable("Paket 'ultralytics' tidak terpasang") from e
        self._model = YOLO(weights_path)
        self.version = version
        self._map = load_class_map()

    def detect(self, image: Image.Image) -> list[Box]:  # pragma: no cover - needs weights
        result = self._model.predict(image, verbose=False)[0]
        names = result.names
        out: list[Box] = []
        for b in result.boxes:
            raw = str(names[int(b.cls)])
            x1, y1, x2, y2 = (float(v) for v in b.xyxy[0])
            out.append(Box(self._map.get(raw, "surface_damage"), raw, float(b.conf), x1, y1, x2 - x1, y2 - y1))
        return out


def load_detector() -> Detector:
    weights = os.getenv("MODEL_PATH", "models/damage.pt")
    if not Path(weights).is_file():
        raise ModelUnavailable(f"Berkas bobot model tidak ditemukan: {weights}")
    return UltralyticsDetector(weights, os.getenv("MODEL_VERSION", Path(weights).name))
