#!/usr/bin/env python3
"""Trim near-white letterbox rows from a hero screenshot."""
from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ModuleNotFoundError:
    print("ERROR: Pillow is required", file=sys.stderr)
    raise SystemExit(1)


def row_empty(image: Image.Image, y: int) -> bool:
    width, _ = image.size
    pixels = image.load()
    light = 0
    sampled = 0
    for x in range(0, width, 3):
        red, green, blue = pixels[x, y]
        sampled += 1
        if red > 248 and green > 248 and blue > 248:
            light += 1
    return sampled > 0 and light / sampled > 0.98


def trim_shot(path: Path) -> None:
    image = Image.open(path).convert("RGB")
    width, height = image.size
    top = 0
    for y in range(height):
        if not row_empty(image, y):
            top = max(0, y - 12)
            break
    bottom = height
    for y in range(height - 1, -1, -1):
        if not row_empty(image, y):
            bottom = min(height, y + 16)
            break
    if bottom - top < 200:
        return
    image.crop((0, top, width, bottom)).save(path)


def main() -> None:
    if len(sys.argv) != 2:
        print("usage: trim-hero-shot.py <png>", file=sys.stderr)
        raise SystemExit(2)
    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"missing screenshot: {path}", file=sys.stderr)
        raise SystemExit(1)
    trim_shot(path)


if __name__ == "__main__":
    main()
