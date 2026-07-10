#!/usr/bin/env python3
"""
ANPR CLI - Automatic Number Plate Recognition
==============================================

Detects and reads vehicle license plates in images, video files, or a live
webcam feed. Supports two detectors (classic OpenCV, or a YOLO model for
higher accuracy) and can log every plate it reads to a local SQLite database.

Usage:
  python cli.py --image car.jpg
  python cli.py --image car.jpg --output annotated.jpg
  python cli.py --video clip.mp4 --output annotated.mp4
  python cli.py --webcam
  python cli.py --webcam --camera-index 1 --no-display

  # Use a YOLO plate-detection model instead of the classic detector
  python cli.py --image car.jpg --detector yolo --yolo-weights plate_yolo.pt

  # Logging
  python cli.py --video clip.mp4 --db anpr_log.db
  python cli.py --show-log                 # print recent DB entries
  python cli.py --export-csv out.csv       # dump DB to CSV
"""

import argparse
import time
from typing import Optional

import cv2

from anpr.pipeline import ANPRPipeline
from anpr.storage import PlateLogger


def run_on_image(pipeline: ANPRPipeline, path: str, output: Optional[str],
                  display: bool, source_label: str) -> None:
    frame = cv2.imread(path)
    if frame is None:
        raise FileNotFoundError(f"Could not read image: {path}")

    annotated, results = pipeline.process_frame(frame, source=source_label)

    if results:
        for r in results:
            print(f"Plate: {r.text}  type={r.plate_type}  confidence={r.confidence:.2f}  box={r.box}")
    else:
        print("No plates detected.")

    if output:
        cv2.imwrite(output, annotated)
        print(f"Saved annotated image to {output}")

    if display:
        cv2.imshow("ANPR - press any key to close", annotated)
        cv2.waitKey(0)
        cv2.destroyAllWindows()


def run_on_video(pipeline: ANPRPipeline, path: str, output: Optional[str],
                  display: bool, detect_every_n: int, source_label: str) -> None:
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise FileNotFoundError(f"Could not open video: {path}")

    writer = None
    if output:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        writer = cv2.VideoWriter(output, fourcc, fps, (w, h))

    seen_plates = {}
    frame_idx = 0
    last_annotated = None

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        if frame_idx % detect_every_n == 0:
            annotated, results = pipeline.process_frame(frame, source=source_label)
            last_annotated = annotated
            for r in results:
                if r.text not in seen_plates or r.confidence > seen_plates[r.text]:
                    seen_plates[r.text] = r.confidence
                    print(f"[frame {frame_idx}] Plate: {r.text} ({r.plate_type}) "
                          f"confidence={r.confidence:.2f}")

        else:
            annotated = last_annotated if last_annotated is not None else frame

        if writer:
            writer.write(annotated)
        if display:
            cv2.imshow("ANPR - press q to quit", annotated)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

        frame_idx += 1

    cap.release()
    if writer:
        writer.release()
        print(f"Saved annotated video to {output}")
    if display:
        cv2.destroyAllWindows()

    _print_summary(seen_plates)


def run_on_webcam(pipeline: ANPRPipeline, camera_index: int,
                   detect_every_n: int, source_label: str) -> None:
    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        raise RuntimeError(f"Could not open camera index {camera_index}")

    seen_plates = {}
    frame_idx = 0
    last_annotated = None
    print("Press 'q' to quit.")

    while True:
        ok, frame = cap.read()
        if not ok:
            print("Failed to grab frame from camera.")
            break

        if frame_idx % detect_every_n == 0:
            annotated, results = pipeline.process_frame(frame, source=source_label)
            last_annotated = annotated
            for r in results:
                if r.text not in seen_plates or r.confidence > seen_plates[r.text]:
                    seen_plates[r.text] = r.confidence
                    print(f"Plate: {r.text}  confidence={r.confidence:.2f}")
        else:
            annotated = last_annotated if last_annotated is not None else frame

        cv2.imshow("ANPR (webcam) - press q to quit", annotated)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

        frame_idx += 1

    cap.release()
    cv2.destroyAllWindows()
    _print_summary(seen_plates)


def _print_summary(seen_plates: dict) -> None:
    print("\nAll unique plates seen:")
    for text, conf in sorted(seen_plates.items(), key=lambda kv: -kv[1]):
        print(f"  {text}  (best confidence {conf:.2f})")


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Detect and read vehicle license plates from images, "
                    "video files, or a live webcam feed."
    )
    src = p.add_mutually_exclusive_group(required=False)
    src.add_argument("--image", help="Path to an image file")
    src.add_argument("--video", help="Path to a video file")
    src.add_argument("--webcam", action="store_true", help="Use a live camera feed")

    p.add_argument("--camera-index", type=int, default=0,
                    help="Camera index for --webcam (default: 0)")
    p.add_argument("--output", help="Path to save annotated image/video")
    p.add_argument("--no-display", action="store_true",
                    help="Don't open a preview window (useful on headless servers)")
    p.add_argument("--languages", nargs="+", default=["en"],
                    help="EasyOCR language codes, e.g. --languages en fr")
    p.add_argument("--gpu", action="store_true", help="Use GPU for OCR if available")
    p.add_argument("--detect-every", type=int, default=3,
                    help="For video/webcam: run OCR every Nth frame (default: 3)")

    p.add_argument("--detector", choices=["classic", "yolo"], default="classic",
                    help="Plate detector backend (default: classic)")
    p.add_argument("--yolo-weights", help="Path to YOLO .pt weights (required if "
                                           "--detector yolo)")
    p.add_argument("--yolo-conf", type=float, default=0.25,
                    help="YOLO confidence threshold (default: 0.25)")
    p.add_argument("--yolo-device", default="cpu",
                    help="Device for YOLO inference, e.g. cpu, cuda:0 (default: cpu)")

    p.add_argument("--db", default="anpr_log.db",
                    help="SQLite DB path for logging plate reads "
                         "(default: anpr_log.db)")
    p.add_argument("--no-log", action="store_true",
                    help="Disable database logging for this run")
    p.add_argument("--source-label", default="",
                    help="Label stored with each log entry, e.g. camera name")

    p.add_argument("--show-log", action="store_true",
                    help="Print recent entries from the DB and exit (no processing)")
    p.add_argument("--log-limit", type=int, default=50,
                    help="Number of entries to show with --show-log (default: 50)")
    p.add_argument("--export-csv", help="Export the DB to a CSV file and exit")

    return p


def main() -> None:
    args = build_arg_parser().parse_args()

    # DB-only utility modes -------------------------------------------------
    if args.show_log:
        logger = PlateLogger(args.db)
        rows = logger.recent(args.log_limit)
        if not rows:
            print("No entries in the log yet.")
        for row in rows:
            print(f"[{row['timestamp']}] {row['plate_text']} "
                  f"conf={row['confidence']:.2f} source={row['source']}")
        return

    if args.export_csv:
        logger = PlateLogger(args.db)
        n = logger.export_csv(args.export_csv)
        print(f"Exported {n} rows to {args.export_csv}")
        return

    if not (args.image or args.video or args.webcam):
        raise SystemExit("Provide one of --image, --video, --webcam "
                          "(or use --show-log / --export-csv).")

    display = not args.no_display
    logger = None if args.no_log else PlateLogger(args.db)

    print("Loading models (first run downloads the EasyOCR model, ~65MB, "
          "and the YOLO model if using --detector yolo)...")
    pipeline = ANPRPipeline(
        detector_kind=args.detector,
        yolo_weights=args.yolo_weights,
        yolo_conf=args.yolo_conf,
        yolo_device=args.yolo_device,
        languages=args.languages,
        gpu=args.gpu,
        logger=logger,
    )

    start = time.time()
    if args.image:
        run_on_image(pipeline, args.image, args.output, display, args.source_label)
    elif args.video:
        run_on_video(pipeline, args.video, args.output, display,
                     args.detect_every, args.source_label)
    elif args.webcam:
        run_on_webcam(pipeline, args.camera_index, args.detect_every,
                      args.source_label)

    print(f"\nDone in {time.time() - start:.1f}s")
    if logger:
        print(f"Reads logged to {args.db} "
              f"(view with --show-log, export with --export-csv)")


if __name__ == "__main__":
    main()
