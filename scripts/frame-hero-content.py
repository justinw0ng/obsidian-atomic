#!/usr/bin/env python3
"""Paste a live note screenshot into a hero chrome shell.

The shell keeps the desktop window and phone chrome. Only the magenta content
hole is replaced. Pixels that are not the key color (status chip, bezels)
stay put.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageFilter
except ModuleNotFoundError:
    print(
        "ERROR: Pillow is required. Install it with: python3 -m pip install Pillow",
        file=sys.stderr,
    )
    raise SystemExit(1)

REPO = Path(__file__).resolve().parents[1]
DEFAULT_SHELLS = Path("/tmp/atomic-hero-shells")


def load_compose():
    path = REPO / "scripts/compose-device-hero.py"
    spec = importlib.util.spec_from_file_location("compose_device_hero", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def key_mask(image: Image.Image) -> Image.Image:
    """Magenta hole pixels. Chrome that overlaps the box stays masked out."""
    red, green, blue = image.convert("RGB").split()
    red_hi = red.point(lambda value: 255 if value >= 180 else 0)
    blue_hi = blue.point(lambda value: 255 if value >= 180 else 0)
    green_lo = green.point(lambda value: 255 if value <= 90 else 0)
    mask = ImageChops.multiply(ImageChops.multiply(red_hi, blue_hi), green_lo)
    return mask.filter(ImageFilter.MaxFilter(3))


def clamp_hole(hole: dict, size: tuple[int, int]) -> tuple[int, int, int, int]:
    width, height = size
    x = max(0, int(hole["x"]))
    y = max(0, int(hole["y"]))
    box_w = max(1, int(hole["width"]))
    box_h = max(1, int(hole["height"]))
    if x + box_w > width:
        box_w = width - x
    if y + box_h > height:
        box_h = height - y
    if box_w < 1 or box_h < 1:
        raise ValueError(f"hole {hole} outside {size}")
    return x, y, box_w, box_h


def frame_content(shell: Image.Image, hole: dict, content: Image.Image) -> Image.Image:
    compose = load_compose()
    x, y, box_w, box_h = clamp_hole(hole, shell.size)
    fitted = compose.cover_top(content.convert("RGB"), (box_w, box_h))
    region = shell.convert("RGB").crop((x, y, x + box_w, y + box_h))
    pasted = Image.composite(fitted, region, key_mask(region))
    framed = shell.convert("RGB").copy()
    framed.paste(pasted, (x, y))
    return framed


def load_shell(shells_dir: Path, scene: str, kind: str) -> tuple[Path, dict]:
    manifest_path = shells_dir / "manifest.json"
    if not manifest_path.is_file():
        raise FileNotFoundError(f"missing hero shells: {manifest_path}")
    manifest = json.loads(manifest_path.read_text())
    name = f"{scene}-{'phone' if kind == 'phone' else 'desktop'}"
    entry = manifest.get("shells", {}).get(name)
    if not entry:
        raise KeyError(f"shell {name} not in {manifest_path}")
    file_path = Path(entry["file"])
    if not file_path.is_file():
        raise FileNotFoundError(f"missing shell image: {file_path}")
    return file_path, entry["hole"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scene", required=True, choices=("daily", "dashboard", "cues"))
    parser.add_argument("--kind", required=True, choices=("desktop", "phone"))
    parser.add_argument("--content", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--shells", default=str(DEFAULT_SHELLS))
    args = parser.parse_args()

    content_path = Path(args.content)
    if not content_path.is_file():
        parser.error(f"missing content: {content_path}")
    shell_path, hole = load_shell(Path(args.shells), args.scene, args.kind)
    framed = frame_content(Image.open(shell_path), hole, Image.open(content_path))
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    framed.save(out, "PNG", optimize=True)
    print(f"wrote {out} {framed.size}")


if __name__ == "__main__":
    main()
