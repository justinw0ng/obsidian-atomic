#!/usr/bin/env python3
"""Assemble a looping GIF from PNG frames for the Atomic user guide.

Frames can be a directory of *.png files or an explicit list. Images are
resized to a shared width, quantized to a compact palette, and written as
GIF89a. This is the docs capture helper used by
scripts/capture-user-guide-screenshots.mjs — not the README hero animator.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ModuleNotFoundError:
    print(
        "ERROR: Pillow is required. Install it with: python3 -m pip install Pillow",
        file=sys.stderr,
    )
    raise SystemExit(1)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--frames",
        action="append",
        default=[],
        help="Directory of PNG frames, or a single PNG. Repeat for an explicit list.",
    )
    parser.add_argument("--out", required=True, help="Destination .gif path")
    parser.add_argument("--max-width", type=int, default=1280)
    parser.add_argument("--duration-ms", type=int, default=180)
    parser.add_argument(
        "--hold-first",
        type=int,
        default=2,
        help="Repeat the first frame this many extra times.",
    )
    parser.add_argument(
        "--hold-last",
        type=int,
        default=3,
        help="Repeat the last frame this many extra times.",
    )
    parser.add_argument("--colors", type=int, default=128)
    return parser.parse_args()


def collect_frames(inputs: list[str]) -> list[Path]:
    frames: list[Path] = []
    for raw in inputs:
        path = Path(raw)
        if path.is_dir():
            frames.extend(sorted(path.glob("*.png")))
            continue
        if path.is_file():
            frames.append(path)
            continue
        raise SystemExit(f"Missing frame path: {path}")
    if len(frames) < 1:
        raise SystemExit("Need at least one PNG frame")
    return frames


def fit_width(image: Image.Image, max_width: int) -> Image.Image:
    rgb = image.convert("RGB")
    if rgb.width <= max_width:
        return rgb
    height = max(1, round(rgb.height * (max_width / rgb.width)))
    return rgb.resize((max_width, height), Image.Resampling.LANCZOS)


def quantize(image: Image.Image, colors: int) -> Image.Image:
    return image.quantize(colors=max(2, min(colors, 256)), method=Image.Quantize.MEDIANCUT)


def expand_holds(frames: list[Image.Image], hold_first: int, hold_last: int) -> list[Image.Image]:
    if not frames:
        return frames
    extra_first = max(0, hold_first)
    extra_last = max(0, hold_last)
    return [frames[0]] * extra_first + frames + [frames[-1]] * extra_last


def assemble(
    frame_paths: list[Path],
    out: Path,
    max_width: int,
    duration_ms: int,
    hold_first: int,
    hold_last: int,
    colors: int,
) -> None:
    fitted = [fit_width(Image.open(path), max_width) for path in frame_paths]
    width = min(image.width for image in fitted)
    height = min(image.height for image in fitted)
    cropped = [image.crop((0, 0, width, height)) for image in fitted]
    palette = quantize(cropped[0], colors)
    indexed = [image.quantize(palette=palette, dither=Image.Dither.NONE) for image in cropped]
    sequence = expand_holds(indexed, hold_first, hold_last)
    out.parent.mkdir(parents=True, exist_ok=True)
    sequence[0].save(
        out,
        save_all=True,
        append_images=sequence[1:],
        duration=max(40, duration_ms),
        loop=0,
        optimize=True,
        disposal=2,
    )


def main() -> None:
    args = parse_args()
    frames = collect_frames(args.frames)
    out = Path(args.out)
    assemble(
        frames,
        out,
        args.max_width,
        args.duration_ms,
        args.hold_first,
        args.hold_last,
        args.colors,
    )
    size = out.stat().st_size
    print(f"Wrote {out} ({len(frames)} source frames, {size} bytes)")


if __name__ == "__main__":
    main()
