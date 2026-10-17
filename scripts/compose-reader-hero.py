#!/usr/bin/env python3
"""Compose the 1.6.0 reader hero in the 1.5.0 banner chrome.

The plugin does not ship the reader yet. Habit tracking is the existing daily
hero (demo covers from docs/demo-covers). Reader, Ask, and canvas frames are
crops of the approved journey stills that do not contain illustrated classic
covers. Library, chooser, and flight stills are left out for that reason.
"""
from __future__ import annotations

import importlib.util
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[1]
EXPORT = REPO / "design/reader-journey/export"
IMAGES = REPO / "docs/images"
DAILY = IMAGES / "atomic-daily-hero.png"

# 2× crops of the paired desktop (1020×720) and phone shell on the journey board.
DESK = (100, 182, 2140, 1622)
PHONE = (2223, 185, 3041, 1911)
# Light theater window on its own export. Dark theater shows a classic cover.
THEATER = (100, 140, 2140, 1580)

HEADLINE = "Your habits. Read the book."
FRAMES = (
    ("07-reader.png", "reader"),
    ("08-ask.png", "ask"),
    ("09-canvas.png", "canvas"),
)
GUIDE = (
    ("07-reader.png", DESK, "atomic-reader.gif"),
    ("08-ask.png", DESK, "atomic-reader-ask.gif"),
    ("09-canvas.png", DESK, "atomic-reader-canvas.gif"),
    ("06-theater-light.png", THEATER, "atomic-reader-theater.gif"),
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


def crop(path: Path, box: tuple[int, int, int, int]) -> Image.Image:
    image = Image.open(path).convert("RGB")
    return image.crop(box)


def paint_header(image: Image.Image, compose, copy) -> Image.Image:
    """Replace the banner headline. Windows start below this band."""
    painted = image.convert("RGB")
    draw = ImageDraw.Draw(painted)
    draw.rectangle((0, 0, painted.width, 148), fill=compose.BACKGROUND)
    draw.text((80, 36), copy.kicker, fill=compose.TEXT, font=compose.font(24, jersey=True))
    draw.text((80, 68), copy.headline, fill=compose.TEXT, font=compose.font(56, jersey=True))
    label = copy.label
    box = draw.textbbox((0, 0), label, font=compose.font(15))
    draw.text((1520 - (box[2] - box[0]), 56), label, fill=compose.MUTED, font=compose.font(15))
    return painted


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
    """User-guide clips are GIFs. Hold the still so the picture stays put."""
    fitted = still.convert("RGB")
    if fitted.width > 1280:
        height = max(1, round(fitted.height * (1280 / fitted.width)))
        fitted = fitted.resize((1280, height), Image.Resampling.LANCZOS)
    save_gif([fitted, fitted], destination, "1")


def main() -> None:
    compose = load_compose()
    copy = compose.HeroCopy(headline=HEADLINE)
    habits = paint_header(Image.open(DAILY), compose, copy)
    if habits.size != (compose.WIDTH, compose.HEIGHT):
        raise SystemExit(f"daily hero is {habits.size}, expected {(compose.WIDTH, compose.HEIGHT)}")

    banners = [habits]
    for filename, _name in FRAMES:
        desk = crop(EXPORT / filename, DESK)
        phone = crop(EXPORT / filename, PHONE)
        banners.append(compose.compose_preframed(desk, phone, copy).convert("RGB"))

    png_out = IMAGES / "atomic-reader-hero.png"
    gif_out = IMAGES / "atomic-reader-hero.gif"
    # Still is the reader frame (index 1), the same chrome as the looping banner.
    banners[1].save(png_out, "PNG", optimize=True)
    save_gif(banners, gif_out, "5/8")
    print(f"wrote {png_out} {banners[1].size} {png_out.stat().st_size}")
    print(f"wrote {gif_out} {gif_out.stat().st_size}")

    for filename, box, gif_name in GUIDE:
        guide_gif(crop(EXPORT / filename, box), IMAGES / gif_name)
        path = IMAGES / gif_name
        print(f"wrote {path} {path.stat().st_size}")


if __name__ == "__main__":
    main()
