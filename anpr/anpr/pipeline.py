import re
from dataclasses import dataclass
from typing import List, Optional, Tuple

import cv2
import numpy as np

from .detector import build_detector
from .reader import PlateReader
from .storage import PlateLogger


@dataclass
class PlateResult:
    text: str
    confidence: float
    box: Tuple[int, int, int, int]  # x, y, w, h in the frame
    plate_type: str = "Private Vehicle"


class ANPRPipeline:
    PLATE_REGEX = re.compile(
        r"^(?:[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}|"
        r"[0-9]{2}BH[0-9]{4}[A-Z]{1,2}|"
        r"[0-9]{1,3}CD[0-9]{1,4}|"
        r"[0-9]{1,3}CC[0-9]{1,4})$"
    )

    def __init__(self, detector_kind: str = "classic",
                 yolo_weights: Optional[str] = None,
                 yolo_conf: float = 0.25,
                 yolo_device: str = "cpu",
                 languages: Optional[List[str]] = None,
                 gpu: bool = False,
                 logger: Optional[PlateLogger] = None):
        self.detector_kind = detector_kind
        self.detector = build_detector(
            kind=detector_kind, yolo_weights=yolo_weights,
            yolo_conf=yolo_conf, yolo_device=yolo_device,
        )
        self.reader = PlateReader(languages=languages, gpu=gpu)
        self.logger = logger

    def score_plate(self, text: str, conf: float) -> float:
        score = conf
        if self.PLATE_REGEX.match(text):
            score += 10.0
        elif len(text) in (8, 9, 10) and text[:2].isalpha() and text[-4:].isdigit():
            score += 5.0
        return score


    def process_frame(self, frame: np.ndarray,
                       source: str = "") -> Tuple[np.ndarray, List[PlateResult]]:
        # Downscale frame if too large to prevent CPU freezes/performance issues
        h_orig, w_orig = frame.shape[:2]
        max_dim = 1024
        scale = 1.0
        if max(h_orig, w_orig) > max_dim:
            scale = max_dim / float(max(h_orig, w_orig))
            proc_frame = cv2.resize(frame, (int(w_orig * scale), int(h_orig * scale)), interpolation=cv2.INTER_AREA)
        else:
            proc_frame = frame

        results: List[PlateResult] = []
        boxes = self.detector.detect(proc_frame)
        h_img, w_img = proc_frame.shape[:2]

        # Fallback: if no boxes found and using classic detector, run full frame OCR text detection
        if not boxes and self.detector_kind == "classic":
            try:
                full_results = self.reader.reader.readtext(proc_frame)
                for bbox, text, conf in full_results:
                    cleaned = re.sub(r"[^A-Z0-9]", "", text.upper())
                    if len(cleaned) >= 5:
                        xs = [pt[0] for pt in bbox]
                        ys = [pt[1] for pt in bbox]
                        x_min, y_min = int(min(xs)), int(min(ys))
                        w_box, h_box = int(max(xs) - x_min), int(max(ys) - y_min)
                        if w_box > 0 and h_box > 0:
                            boxes.append((x_min, y_min, w_box, h_box))
            except Exception:
                pass

        for (x, y, w, h) in boxes:
            candidates = []
            # Try 15% padding first as it is the most robust, then fall back to 5% and 25%
            for pad_factor in [0.15, 0.05, 0.25]:
                pad_x = int(w * pad_factor)
                pad_y = int(h * 0.15)
                x0, y0 = max(0, x - pad_x), max(0, y - pad_y)
                x1, y1 = min(w_img, x + w + pad_x), min(h_img, y + h + pad_y)
                crop = proc_frame[y0:y1, x0:x1]
                if crop.size == 0:
                    continue

                read = self.reader.read(crop)
                if read is not None:
                    raw_text, conf = read
                    corrected = self.reader.clean_and_correct_plate(raw_text)
                    score = self.score_plate(corrected, conf)
                    color_class = self.reader.classify_morth_plate_color(crop)
                    candidates.append((corrected, conf, score, color_class))
                    
                    # Early exit if we have a highly confident, syntactically correct plate
                    if self.PLATE_REGEX.match(corrected) and conf > 0.50:
                        break

            if candidates:
                # Pick the highest-scoring candidate
                candidates.sort(key=lambda c: c[2], reverse=True)
                best_text, best_conf, best_score, best_color = candidates[0]
                
                # Check for minimum length to avoid logging noise
                if len(best_text) >= 5:
                    result = PlateResult(text=best_text, confidence=best_conf, box=(x, y, w, h), plate_type=best_color)
                    results.append(result)


                    if self.logger is not None:
                        self.logger.log(best_text, best_conf, (x, y, w, h), source=source)

        # Deduplicate results if the same plate text is found in multiple boxes
        unique_results = []
        seen_texts = set()
        # Sort results by confidence descending
        results.sort(key=lambda r: r.confidence, reverse=True)
        for r in results:
            if r.text not in seen_texts:
                seen_texts.add(r.text)
                unique_results.append(r)

        annotated = self._annotate(proc_frame, unique_results)
        return annotated, unique_results


    @staticmethod
    def _annotate(frame: np.ndarray, results: List[PlateResult]) -> np.ndarray:
        out = frame.copy()
        for r in results:
            x, y, w, h = r.box
            cv2.rectangle(out, (x, y), (x + w, y + h), (0, 255, 0), 2)
            label = f"{r.text} ({r.plate_type})"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(out, (x, y - th - 10), (x + tw + 6, y), (0, 255, 0), -1)
            cv2.putText(out, label, (x + 3, y - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
        return out


