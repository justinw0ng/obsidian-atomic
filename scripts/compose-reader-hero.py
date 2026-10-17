#!/usr/bin/env python3
"""Compose the reader hero from live Obsidian shots.

Frames are habit tracking, the Open Book flight, the settled reader, Ask,
and the book canvas. Desktop and phone use the same chrome as the daily hero.
The settled reader frame carries the size bar; the phone frame carries the
reading sheet. There is no separate size-step frame.

Run after scripts/capture-reader-hero.mjs.
"""
from __future__ import annotations

import argparse
import importlib.util
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[1]
IMAGES = REPO / "docs/images"
HEADLINE = "Your habits. Read the book."
SCENES = ("habits", "flight", "reader", "ask", "canvas")
GUIDE = (
    ("flight-desktop.png", "atomic-reader.gif"),
    ("ask-desktop.png", "atomic-reader-ask.gif"),
    ("canvas-desktop.png", "atomic-reader-canvas.gif"),
    ("theater-desktop.png", "atomic-reader-theater.gif"),
)


def load_compose():
    path = REPO / "scripts/compose-device-hero.py"
    spec = importlib.util.spec_from_file_location("compose_device_hero", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def save_gif(frames: list[Image.Image], destination: Path, framerate: str) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        frames[0].save(
            destination,
            save_all=True,
            append_images=frames[1:] or [frames[0]],
            duration=1200,
            loop=0,
            optimize=True,
        )
        return
    tmp = Path(tempfile.mkdtemp(prefix="atomic-reader-hero-"))
    try:
        for index, frame in enumerate(frames):
            frame.convert("RGB").save(tmp / f"frame-{index:03d}.png")
        palette = tmp / "palette.png"
        pattern = str(tmp / "frame-%03d.png")
        subprocess.run(
            [
                ffmpeg,
                "-y",
                "-framerate",
                framerate,
                "-i",
                pattern,
                "-vf",
                "palettegen=max_colors=128",
                str(palette),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        subprocess.run(
            [
                ffmpeg,
                "-y",
                "-framerate",
                framerate,
                "-i",
                pattern,
                "-i",
                str(palette),
                "-lavfi",
                "paletteuse=dither=bayer:bayer_scale=3",
                "-loop",
                "0",
                str(destination),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def guide_gif(still: Image.Image, destination: Path) -> None:
    fitted = still.convert("RGB")
    if fitted.width > 1280:
        height = max(1, round(fitted.height * (1280 / fitted.width)))
        fitted = fitted.resize((1280, height), Image.Resampling.LANCZOS)
    save_gif([fitted, fitted], destination, "1")


def require(path: Path) -> Image.Image:
    if not path.is_file():
        raise SystemExit(f"missing live shot {path}")
    return Image.open(path).convert("RGB")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shots", required=True, help="Directory from capture-reader-hero.mjs")
    args = parser.parse_args()
    shots = Path(args.shots)
    framed = shots / "framed"
    compose = load_compose()
    copy = compose.HeroCopy(headline=HEADLINE)

    banners: list[Image.Image] = []
    for scene in SCENES:
        desk = require(framed / f"{scene}-desktop.png")
        phone = require(framed / f"{scene}-phone.png")
        banner = compose.compose_preframed(desk, phone, copy).convert("RGB")
        if banner.size != (compose.WIDTH, compose.HEIGHT):
            raise SystemExit(f"{scene} banner is {banner.size}")
        banners.append(banner)

    png_out = IMAGES / "atomic-reader-hero.png"
    gif_out = IMAGES / "atomic-reader-hero.gif"
    reader = banners[SCENES.index("reader")]
    reader.save(png_out, "PNG", optimize=True)
    save_gif(banners, gif_out, "5/8")
    print(f"wrote {png_out} {reader.size} {png_out.stat().st_size}")
    print(f"wrote {gif_out} {gif_out.stat().st_size}")

    for filename, gif_name in GUIDE:
        destination = IMAGES / gif_name
        guide_gif(require(shots / filename), destination)
        print(f"wrote {destination} {destination.stat().st_size}")


if __name__ == "__main__":
    main()
