#!/usr/bin/env python3
"""Crop a viewport rectangle out of a window screenshot."""
from __future__ import annotations

import argparse
from pathlib import Path

try:
    from PIL import Image
except ModuleNotFoundError:
    raise SystemExit("ERROR: Pillow is required")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--x", type=float, required=True)
    parser.add_argument("--y", type=float, required=True)
    parser.add_argument("--width", type=float, required=True)
    parser.add_argument("--height", type=float, required=True)
    parser.add_argument("--viewport-width", type=float, required=True)
    parser.add_argument("--viewport-height", type=float, required=True)
    args = parser.parse_args()

    image = Image.open(args.src).convert("RGB")
    scale_x = image.width / args.viewport_width if args.viewport_width else 1
    scale_y = image.height / args.viewport_height if args.viewport_height else 1
    left = max(0, round(args.x * scale_x))
    top = max(0, round(args.y * scale_y))
    right = min(image.width, round((args.x + args.width) * scale_x))
    bottom = min(image.height, round((args.y + args.height) * scale_y))
    if right - left < 8 or bottom - top < 8:
        raise SystemExit(f"crop too small: {(left, top, right, bottom)} from {image.size}")
    cropped = image.crop((left, top, right, bottom))
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(out, "PNG")
    print(f"wrote {out} {cropped.size}")


if __name__ == "__main__":
    main()
