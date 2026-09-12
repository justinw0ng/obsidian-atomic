#!/usr/bin/env python3
"""Animate the cue-card hero: rest → hover lift → centered larger card."""
from __future__ import annotations

import argparse
import importlib.util
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

REPO = Path(__file__).resolve().parents[1]
DEFAULT_GIF = REPO / "docs/images/atomic-cue-hero.gif"
HEADLINE = "Your cues. One index card."
REST_FRAMES = 8
HOVER_FRAMES = 8
FLY_FRAMES = 8
HOLD_FRAMES = 12
FPS = 12


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_compose():
    return load_module("compose_device_hero", REPO / "scripts/compose-device-hero.py")


def load_hero_gif():
    return load_module("animate_hero_gif", REPO / "scripts/animate-hero-gif.py")


def compose_banner(compose, desktop: Path, mobile: Path, headline: str) -> Image.Image:
    return compose.compose(
        Image.open(desktop).convert("RGB"),
        Image.open(mobile).convert("RGB"),
        copy=compose.HeroCopy(headline=headline),
        crop_chrome=False,
        desktop_fit="contain",
        phone_fit="contain",
        mobile_kind="window",
        phone_pad=22,
        scrub_scrollbars=True,
    )


def blend_frames(start: Image.Image, end: Image.Image, count: int) -> list[Image.Image]:
    frames: list[Image.Image] = []
    for index in range(count):
        progress = (index + 1) / count
        frames.append(Image.blend(start, end, progress))
    return frames


def build_frames(
    rest: Path,
    hover: Path,
    lightbox: Path,
    mobile_rest: Path,
    mobile_lightbox: Path,
    headline: str,
) -> list[Image.Image]:
    compose = load_compose()
    rest_banner = compose_banner(compose, rest, mobile_rest, headline)
    hover_banner = compose_banner(compose, hover, mobile_rest, headline)
    lightbox_banner = compose_banner(compose, lightbox, mobile_lightbox, headline)
    return (
        [rest_banner] * REST_FRAMES
        + [hover_banner] * HOVER_FRAMES
        + blend_frames(hover_banner, lightbox_banner, FLY_FRAMES)
        + [lightbox_banner] * HOLD_FRAMES
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rest", type=Path, required=True)
    parser.add_argument("--hover", type=Path, required=True)
    parser.add_argument("--lightbox", type=Path, required=True)
    parser.add_argument("--mobile-rest", type=Path, required=True)
    parser.add_argument("--mobile-lightbox", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=DEFAULT_GIF)
    parser.add_argument("--headline", default=HEADLINE)
    args = parser.parse_args()
    for path in (args.rest, args.hover, args.lightbox, args.mobile_rest, args.mobile_lightbox):
        if not path.is_file():
            parser.error(f"missing still: {path}")

    frames = build_frames(
        args.rest,
        args.hover,
        args.lightbox,
        args.mobile_rest,
        args.mobile_lightbox,
        args.headline,
    )
    load_hero_gif().save_gif(frames, args.out)
    size = args.out.stat().st_size
    print(f"wrote {args.out} frames={len(frames)} bytes={size} size={frames[0].size}")


if __name__ == "__main__":
    main()
