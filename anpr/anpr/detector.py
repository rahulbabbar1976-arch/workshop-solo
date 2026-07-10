"""
Plate detectors.

Two implementations sharing a `.detect(frame) -> List[(x, y, w, h)]` interface:

- ClassicDetector: Haar cascade + contour/edge fallback. No extra downloads,
  works out of the box, moderate accuracy.
- YOLODetector: uses an Ultralytics YOLO model (e.g. a plate-detection model
  fine-tuned on license plates) for much higher accuracy and robustness to
  angle/lighting/plate format. Requires `ultralytics` and a weights file.
"""

import os
import sys
from typing import List, Tuple

import cv2
import numpy as np


class ClassicDetector:
    """Haar cascade + contour-based fallback. No extra downloads required."""

    def __init__(self):
        cascade_path = os.path.join(
            cv2.data.haarcascades, "haarcascade_russian_plate_number.xml"
        )
        self.cascade = cv2.CascadeClassifier(cascade_path)
        if self.cascade.empty():
            print("Warning: could not load Haar cascade, "
                  "falling back to contour-based detection only.",
                  file=sys.stderr)
            self.cascade = None

    def detect(self, frame: np.ndarray) -> List[Tuple[int, int, int, int]]:
        boxes = []
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        if self.cascade is not None:
            detections = self.cascade.detectMultiScale(
                gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 20)
            )
            for (x, y, w, h) in detections:
                boxes.append((int(x), int(y), int(w), int(h)))

        boxes.extend(self._contour_candidates(gray, frame.shape))
        return _dedupe(boxes)

    def _contour_candidates(
        self, gray: np.ndarray, frame_shape: Tuple[int, int, int]
    ) -> List[Tuple[int, int, int, int]]:
        candidates = []
        h_img, w_img = frame_shape[:2]

        blur = cv2.bilateralFilter(gray, 11, 17, 17)
        edges = cv2.Canny(blur, 30, 200)
        edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=1)

        contours, _ = cv2.findContours(
            edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE
        )
        contours = sorted(contours, key=cv2.contourArea, reverse=True)[:40]

        for c in contours:
            x, y, w, h = cv2.boundingRect(c)
            if w == 0 or h == 0:
                continue
            aspect_ratio = w / float(h)
            area_ratio = (w * h) / float(w_img * h_img)
            if 2.0 <= aspect_ratio <= 6.5 and 0.0005 <= area_ratio <= 0.15:
                candidates.append((int(x), int(y), int(w), int(h), aspect_ratio))

        # Sort candidates by how close their aspect ratio is to standard plate (4.2)
        candidates.sort(key=lambda b: abs(b[4] - 4.2))
        
        # Limit to top 3 best matches
        return [(b[0], b[1], b[2], b[3]) for b in candidates[:3]]



class YOLODetector:
    """
    Wraps an Ultralytics YOLO model trained/fine-tuned for license plate
    detection. Much more robust than the classic detector across angles,
    lighting, and plate formats — recommended for production use.

    You need a plate-detection weights file (a generic COCO-pretrained
    YOLO model will NOT detect plates — it wasn't trained on that class).
    Options:
      - Train/fine-tune your own with Ultralytics on a plate dataset.
      - Use a community plate-detection checkpoint (search Ultralytics HUB
        or Roboflow Universe for "license plate detection yolov8").
    Pass the .pt weights path via `weights_path`.
    """

    def __init__(self, weights_path: str, conf_thresh: float = 0.25,
                 device: str = "cpu"):
        try:
            from ultralytics import YOLO
        except ImportError as e:
            raise ImportError(
                "ultralytics is not installed. Run: "
                "pip install ultralytics --break-system-packages"
            ) from e

        if not os.path.exists(weights_path):
            raise FileNotFoundError(
                f"YOLO weights not found at '{weights_path}'. Provide a path "
                "to a .pt file trained for license plate detection."
            )

        self.model = YOLO(weights_path)
        self.conf_thresh = conf_thresh
        self.device = device

    def detect(self, frame: np.ndarray) -> List[Tuple[int, int, int, int]]:
        results = self.model.predict(
            frame, conf=self.conf_thresh, device=self.device, verbose=False
        )
        boxes = []
        for r in results:
            if r.boxes is None:
                continue
            for b in r.boxes:
                x1, y1, x2, y2 = b.xyxy[0].tolist()
                x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                w, h = x2 - x1, y2 - y1
                if w > 0 and h > 0:
                    boxes.append((x1, y1, w, h))
        return boxes


def _dedupe(
    boxes: List[Tuple[int, int, int, int]], iou_thresh: float = 0.4
) -> List[Tuple[int, int, int, int]]:
    """Merge/drop overlapping boxes so we don't OCR the same plate twice."""
    if not boxes:
        return []

    def iou(a, b):
        ax, ay, aw, ah = a
        bx, by, bw, bh = b
        ax2, ay2, bx2, by2 = ax + aw, ay + ah, bx + bw, by + bh
        ix1, iy1 = max(ax, bx), max(ay, by)
        ix2, iy2 = min(ax2, bx2), min(ay2, by2)
        iw, ih = max(0, ix2 - ix1), max(0, iy2 - iy1)
        inter = iw * ih
        union = aw * ah + bw * bh - inter
        return inter / union if union else 0

    boxes = sorted(boxes, key=lambda b: b[2] * b[3], reverse=True)
    kept = []
    for b in boxes:
        if all(iou(b, k) < iou_thresh for k in kept):
            kept.append(b)
    return kept


def build_detector(kind: str = "classic", yolo_weights: str = None,
                    yolo_conf: float = 0.25, yolo_device: str = "cpu"):
    """Factory: build a detector by name, with a safe fallback to classic."""
    if kind == "yolo":
        try:
            return YOLODetector(yolo_weights, conf_thresh=yolo_conf,
                                 device=yolo_device)
        except Exception as e:
            print(f"Warning: could not load YOLO detector ({e}). "
                  "Falling back to classic detector.", file=sys.stderr)
            return ClassicDetector()
    return ClassicDetector()
