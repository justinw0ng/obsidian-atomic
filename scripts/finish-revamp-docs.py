#!/usr/bin/env python3
"""Compose README heroes and user-guide GIFs from redesign-mock screenshots."""
from __future__ import annotations

import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

REPO = Path(__file__).resolve().parents[1]
IMAGES = REPO / "docs/images"


def load_compose():
    path = REPO / "scripts/compose-device-hero.py"
    spec = importlib.util.spec_from_file_location("compose_device_hero", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def crop_window(shot: dict) -> Image.Image:
    image = Image.open(shot["file"]).convert("RGB")
    css_width = float(shot.get("cssWidth") or image.width)
    scale = image.width / css_width if css_width else 1
    bottom_css = shot.get("cropBottom")
    if not bottom_css:
        return image
    bottom = min(image.height, max(8, round(float(bottom_css) * scale)))
    return image.crop((0, 0, image.width, bottom))


def fit_width(image: Image.Image, width: int) -> Image.Image:
    if image.width == width:
        return image
    height = max(1, round(image.height * (width / image.width)))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def same_canvas(frames: list[Image.Image], width: int) -> list[Image.Image]:
    fitted = [fit_width(frame, width) for frame in frames]
    height = max(frame.height for frame in fitted)
    canvas_frames: list[Image.Image] = []
    for frame in fitted:
        if frame.height == height:
            canvas_frames.append(frame)
            continue
        canvas = Image.new("RGB", (width, height), frame.getpixel((0, frame.height - 1)))
        canvas.paste(frame, (0, 0))
        canvas_frames.append(canvas)
    return canvas_frames


def save_gif(frames: list[Image.Image], destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        frames[0].save(
            destination,
            save_all=True,
            append_images=frames[1:],
            duration=420,
            loop=0,
            optimize=True,
        )
        return
    tmp = Path(tempfile.mkdtemp(prefix="atomic-revamp-gif-"))
    try:
        for index, frame in enumerate(frames):
            frame.save(tmp / f"frame-{index:03d}.png")
        palette = tmp / "palette.png"
        pattern = str(tmp / "frame-%03d.png")
        subprocess.run(
            [ffmpeg, "-y", "-framerate", "2", "-i", pattern, "-vf", "palettegen=max_colors=128", str(palette)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        subprocess.run(
            [
                ffmpeg,
                "-y",
                "-framerate",
                "2",
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


def blend_pair(a: Image.Image, b: Image.Image) -> list[Image.Image]:
    mid = Image.blend(a.convert("RGB"), b.convert("RGB"), 0.45)
    return [a, mid, b, b, mid, a]


def compose_hero(compose, shots: dict, desktop: str, phone: str, headline: str, out: Path) -> Image.Image:
    image = compose.compose_preframed(
        Image.open(shots[desktop]["file"]),
        Image.open(shots[phone]["file"]),
        compose.HeroCopy(headline=headline),
    )
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out, "PNG", optimize=True)
    print(f"wrote {out} {image.size} {out.stat().st_size}")
    return image


def write_clip(shots: dict, names: list[str], out: Path, width: int = 1280) -> None:
    frames = same_canvas([crop_window(shots[name]) for name in names], width)
    if len(frames) == 1:
        frames = [frames[0], frames[0]]
    elif len(frames) == 2:
        frames = blend_pair(frames[0], frames[1])
    save_gif(frames, out)
    print(f"wrote {out} {frames[0].size} {out.stat().st_size}")


def main() -> None:
    manifest_path = Path(sys.argv[1])
    shots = json.loads(manifest_path.read_text())["shots"]
    compose = load_compose()
    daily = compose_hero(
        compose,
        shots,
        "daily-desktop",
        "daily-phone",
        "Your habits. One daily note.",
        IMAGES / "atomic-daily-hero.png",
    )
    daily_hover = compose_hero(
        compose,
        shots,
        "daily-desktop-hover",
        "daily-phone",
        "Your habits. One daily note.",
        Path("/tmp/atomic-revamp-shots/daily-hover-banner.png"),
    )
    save_gif(blend_pair(daily, daily_hover), IMAGES / "atomic-daily-hero.gif")
    print(f"wrote daily gif {(IMAGES / 'atomic-daily-hero.gif').stat().st_size}")

    compose_hero(
        compose,
        shots,
        "dashboard-desktop",
        "dashboard-phone",
        "Your year. One dashboard.",
        IMAGES / "atomic-dashboard-hero.png",
    )
    cues = compose_hero(
        compose,
        shots,
        "cues-desktop",
        "cues-phone",
        "Your cues. One index card.",
        IMAGES / "atomic-cue-hero.png",
    )
    cues_hover = compose_hero(
        compose,
        shots,
        "cues-desktop-hover",
        "cues-phone",
        "Your cues. One index card.",
        Path("/tmp/atomic-revamp-shots/cues-hover-banner.png"),
    )
    cues_open = compose_hero(
        compose,
        shots,
        "cues-desktop-open",
        "cues-phone-open",
        "Your cues. One index card.",
        Path("/tmp/atomic-revamp-shots/cues-open-banner.png"),
    )
    save_gif([cues, cues, cues_hover, cues_hover, cues_open, cues_open, cues_open, cues], IMAGES / "atomic-cue-hero.gif")
    print(f"wrote cue gif {(IMAGES / 'atomic-cue-hero.gif').stat().st_size}")

    clips = {
        "atomic-actions.gif": ["actions-rest", "actions-hover"],
        "atomic-heatmap.gif": ["heat-rest", "heat-hover"],
        "atomic-today.gif": ["today-rest", "today-hover"],
        "atomic-session-timer.gif": ["timer-idle", "timer-running", "timer-logged"],
        "atomic-reading-timer.gif": ["timer-idle", "timer-running", "timer-logged"],
        "atomic-gym-log.gif": ["gym-rest", "gym-added"],
        "atomic-cue-log.gif": ["cues-desktop", "cues-desktop-hover"],
        "atomic-cues-hover.gif": ["cues-desktop", "cues-desktop-hover"],
        "atomic-cue-popup.gif": ["cues-desktop-hover", "cues-desktop-open"],
        "atomic-book-shelf.gif": ["shelf-desktop", "shelf-desktop-hover"],
        "atomic-dashboard.gif": ["dash-rest", "dash-hover"],
    }
    for name, frames in clips.items():
        write_clip(shots, frames, IMAGES / name)


if __name__ == "__main__":
    main()
