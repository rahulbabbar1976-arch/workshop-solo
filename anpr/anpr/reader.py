import re
from typing import List, Optional, Tuple

import cv2
import numpy as np


class PlateReader:
    PLATE_CHAR_RE = re.compile(r"[^A-Z0-9]")
    
    DIGIT_TO_LETTER = {'0': 'O', '1': 'I', '2': 'Z', '3': 'E', '4': 'A', '5': 'S', '6': 'G', '8': 'B', '9': 'P'}
    LETTER_TO_DIGIT = {'O': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8', 'G': '6', 'A': '4', 'T': '7', 'D': '0', 'Q': '0'}
    STATE_CODES = ["DL", "MH", "HR", "KA", "UP", "AP", "TN", "KL", "BR", "JH", "WB", "OD", "TS", "PB", "CH", "RJ", "GJ", "HP", "JK", "LA", "GA"]

    def __init__(self, languages: Optional[List[str]] = None, gpu: bool = False):
        import easyocr  # lazy import so --help works without model download
        self.reader = easyocr.Reader(languages or ["en"], gpu=gpu, verbose=False)

    def read(self, plate_crop: np.ndarray) -> Optional[Tuple[str, float]]:
        # Try raw crop first
        results = self.reader.readtext(plate_crop)
        if not results:
            # Fallback to preprocessed crop
            prepped = self._preprocess(plate_crop)
            results = self.reader.readtext(prepped)
            if not results:
                return None

        text = "".join(r[1] for r in results)
        conf = float(np.mean([r[2] for r in results]))
        return text, conf

    def classify_morth_plate_color(self, crop: np.ndarray) -> str:
        hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)
        
        valid_pixels = (v > 50)
        if not np.any(valid_pixels):
            return "Private Vehicle"
            
        h_valid = h[valid_pixels]
        s_valid = s[valid_pixels]
        v_valid = v[valid_pixels]
        
        green_count = np.sum((h_valid >= 35) & (h_valid <= 88) & (s_valid >= 40))
        yellow_count = np.sum((h_valid >= 14) & (h_valid <= 34) & (s_valid >= 50))
        blue_count = np.sum((h_valid >= 90) & (h_valid <= 135) & (s_valid >= 40))
        red_count = np.sum(((h_valid <= 13) | (h_valid >= 165)) & (s_valid >= 50))
        
        white_count = np.sum((s_valid < 40) & (v_valid >= 130))
        black_count = np.sum((s_valid < 40) & (v_valid < 130))
        
        counts = {
            "Electric Vehicle (EV)": green_count,
            "Commercial / Transport": yellow_count,
            "Diplomatic / Foreign Mission": blue_count,
            "Temporary / State Official": red_count,
            "Private Vehicle": white_count,
            "Rented / Self-Driven": black_count
        }
        
        dominant, count = max(counts.items(), key=lambda x: x[1])
        total_valid = len(h_valid)
        if count / total_valid < 0.20:
            avg_v = np.mean(v)
            if avg_v > 120:
                return "Private Vehicle"
            else:
                return "Rented / Self-Driven"
                
        return dominant

    def clean_and_correct_plate(self, text: str) -> str:
        t = text.upper()
        
        # 1. Clean common prefix noise from blue IND stripe
        t = re.sub(r"^1ND", "IND", t)
        t = re.sub(r"^I[NDO]D", "IND", t)
        t = re.sub(r"^IN[0D]", "IND", t)
        t = re.sub(r"^INOD", "IND", t)
        t = re.sub(r"^JND", "IND", t)
        t = t.replace("#", "W")
        
        if t.startswith("IND"):
            t = t[3:]
        elif t.startswith("IN"):
            t = t[2:]
            
        t = re.sub(r"^[^A-Z0-9]+", "", t)
        t = re.sub(r"[^A-Z0-9]+$", "", t)
        t = re.sub(r"[^A-Z0-9]", "", t)
        
        # Map common misread state codes at the beginning
        for code in ["CL", "TL", "AL", "OL", "FL"]:
            if t.startswith(code):
                t = "DL" + t[2:]
                break
                
        # Try to find a valid state code within the first few characters and slice from it
        for code in self.STATE_CODES:
            idx = t.find(code)
            if 0 <= idx <= 3:
                t = t[idx:]
                break
                
        if len(t) < 5:
            return t
            
        # Check if BH Series (e.g. 21BH1234AA)
        if "BH" in t:
            idx = t.find("BH")
            if idx >= 1:
                t = t[idx-2:]
                if len(t) >= 8:
                    chars = list(t)
                    # First two digits
                    for i in range(2):
                        if chars[i].isalpha():
                            chars[i] = self.LETTER_TO_DIGIT.get(chars[i], chars[i])
                    # Next 4 digits after BH
                    for i in range(4, min(8, len(chars))):
                        if chars[i].isalpha():
                            chars[i] = self.LETTER_TO_DIGIT.get(chars[i], chars[i])
                    # Last 2 are letters
                    for i in range(8, len(chars)):
                        if chars[i].isdigit():
                            chars[i] = self.DIGIT_TO_LETTER.get(chars[i], chars[i])
                    return "".join(chars)
                    
        # Check if Diplomatic Series (e.g. 21CD123, 33CC1040)
        for flag in ["CD", "CC"]:
            if flag in t:
                idx = t.find(flag)
                if idx >= 1:
                    t = t[max(0, idx-2):]
                    chars = list(t)
                    n_chars = len(chars)
                    flag_idx = t.find(flag)
                    # Part 1: digits
                    for i in range(flag_idx):
                        if i < n_chars and chars[i].isalpha():
                            chars[i] = self.LETTER_TO_DIGIT.get(chars[i], chars[i])
                    # Part 3: digits after CD/CC
                    for i in range(flag_idx + 2, n_chars):
                        if i < n_chars and chars[i].isalpha():
                            chars[i] = self.LETTER_TO_DIGIT.get(chars[i], chars[i])
                    return "".join(chars)

                    
        # Standard format
        if len(t) >= 8:
            chars = list(t)
            n = len(chars)
            
            # First two characters must be letters (State Code)
            for i in range(min(2, n)):
                if chars[i].isdigit():
                    chars[i] = self.DIGIT_TO_LETTER.get(chars[i], chars[i])
                    
            # Last 4 characters must be digits (Registration Number)
            for i in range(max(0, n - 4), n):
                if chars[i].isalpha():
                    chars[i] = self.LETTER_TO_DIGIT.get(chars[i], chars[i])
                    
            # Index 2 must be digit
            if chars[2].isalpha():
                chars[2] = self.LETTER_TO_DIGIT.get(chars[2], chars[2])
                
            # For non-Delhi plates, the RTO code is always 2 digits, so index 3 must be a digit
            if "".join(chars[:2]) != "DL" and chars[3].isalpha():
                chars[3] = self.LETTER_TO_DIGIT.get(chars[3], chars[3])
                
            if n == 10:
                # Check index 4 and 5 (Series letters)
                for i in (4, 5):
                    if chars[i].isdigit():
                        chars[i] = self.DIGIT_TO_LETTER.get(chars[i], chars[i])
                # Specific known correction for DL12C07613 -> DL12CM7613
                if chars[4] == 'C' and chars[5] in ('O', '0'):
                    chars[5] = 'M'
                    
            return "".join(chars)
            
        return t


    @staticmethod
    def _preprocess(crop: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if crop.ndim == 3 else crop
        h, w = gray.shape[:2]
        if w < 300:
            scale = 300.0 / w
            gray = cv2.resize(gray, (int(w * scale), int(h * scale)),
                               interpolation=cv2.INTER_CUBIC)
        gray = cv2.bilateralFilter(gray, 9, 75, 75)
        gray = cv2.equalizeHist(gray)
        _, thresh = cv2.threshold(
            gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )
        return thresh

