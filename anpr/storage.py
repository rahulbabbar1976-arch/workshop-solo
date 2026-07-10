"""SQLite-backed logging of plate reads."""

import csv
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from typing import List, Optional, Tuple

SCHEMA = """
CREATE TABLE IF NOT EXISTS plate_reads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    source TEXT,
    plate_text TEXT NOT NULL,
    confidence REAL,
    x INTEGER, y INTEGER, w INTEGER, h INTEGER,
    snapshot_path TEXT
);
"""


class PlateLogger:
    def __init__(self, db_path: str = "anpr_log.db"):
        self.db_path = db_path
        with closing(sqlite3.connect(self.db_path)) as conn:
            conn.execute(SCHEMA)
            conn.commit()

    def log(self, plate_text: str, confidence: float,
            box: Tuple[int, int, int, int], source: str = "",
            snapshot_path: Optional[str] = None) -> None:
        x, y, w, h = box
        with closing(sqlite3.connect(self.db_path)) as conn:
            conn.execute(
                "INSERT INTO plate_reads "
                "(timestamp, source, plate_text, confidence, x, y, w, h, snapshot_path) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (datetime.now(timezone.utc).isoformat(), source, plate_text,
                 confidence, x, y, w, h, snapshot_path),
            )
            conn.commit()

    def recent(self, limit: int = 50) -> List[dict]:
        with closing(sqlite3.connect(self.db_path)) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.execute(
                "SELECT * FROM plate_reads ORDER BY id DESC LIMIT ?", (limit,)
            )
            return [dict(r) for r in cur.fetchall()]

    def search(self, plate_text_contains: str, limit: int = 100) -> List[dict]:
        with closing(sqlite3.connect(self.db_path)) as conn:
            conn.row_factory = sqlite3.Row
            cur = conn.execute(
                "SELECT * FROM plate_reads WHERE plate_text LIKE ? "
                "ORDER BY id DESC LIMIT ?",
                (f"%{plate_text_contains.upper()}%", limit),
            )
            return [dict(r) for r in cur.fetchall()]

    def export_csv(self, path: str) -> int:
        rows = self.recent(limit=10_000_000)
        if not rows:
            with open(path, "w", newline="") as f:
                f.write("")
            return 0
        with open(path, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        return len(rows)
