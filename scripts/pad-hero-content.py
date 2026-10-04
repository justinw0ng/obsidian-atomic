#!/usr/bin/env python3
"""Pad a hero content shot so cover-top does not crop the sides.

Wide, short gym wells need extra height. Content stays at the top. Left
and right stay equal.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ModuleNotFoundError:
    print("ERROR: Pillow is required", file=sys.stderr)
    raise SystemExit(1)


def pad_to_aspect(image: Image.Image, aspect: float, background: str) -> Image.Image:
    if aspect <= 0:
        raise ValueError(f"aspect must be positive, got {aspect}")
    rgb = image.convert("RGB")
    current = rgb.width / max(1, rgb.height)
    if current <= aspect + 0.01:
        return rgb
    height = max(rgb.height, round(rgb.width / aspect))
    canvas = Image.new("RGB", (rgb.width, height), background)
    canvas.paste(rgb, (0, 0))
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--aspect-width", type=float, required=True)
    parser.add_argument("--aspect-height", type=float, required=True)
    parser.add_argument("--background", default="#FFFFFF")
    args = parser.parse_args()
    src = Path(args.src)
    if not src.is_file():
        parser.error(f"missing screenshot: {src}")
    if args.aspect_width <= 0 or args.aspect_height <= 0:
        parser.error("aspect width and height must be positive")
    out = pad_to_aspect(
        Image.open(src),
        args.aspect_width / args.aspect_height,
        args.background,
    )
    dest = Path(args.out)
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, "PNG", optimize=True)
    print(f"wrote {dest} {out.size}")


if __name__ == "__main__":
    main()
