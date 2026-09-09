#!/usr/bin/env python3
"""Composite desktop + mobile screenshots into a README hero banner."""
from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ModuleNotFoundError:
    print(
        "ERROR: Pillow is required. Install it with: python3 -m pip install Pillow",
        file=sys.stderr,
    )
    raise SystemExit(1)

WIDTH, HEIGHT = 1600, 900
BACKGROUND = "#F5F2EC"
TEXT = "#17191D"
MUTED = "#747980"
BORDER = "#D9DCE2"
DESKTOP_CARD = (80, 180, 1340, 890)
DESKTOP_INSET = 12
PHONE_FRAME = (1220, 240, 1520, 860)
PHONE_INSET = 12
REPO = Path(__file__).resolve().parents[1]
JERSEY_FONT = REPO / "docs/fonts/Jersey20-Regular.ttf"
DEJAVU_DIR = Path("/usr/share/fonts/truetype/dejavu")


@dataclass(frozen=True)
class HeroCopy:
    kicker: str = "ATOMIC TRACKER"
    headline: str = "Your habits. One daily note."
    label: str = "Atomic Tracker"


def font(size: int, bold: bool = False, jersey: bool = False) -> ImageFont.FreeTypeFont:
    if jersey:
        if not JERSEY_FONT.is_file():
            raise FileNotFoundError(f"missing Jersey 20 font: {JERSEY_FONT}")
        return ImageFont.truetype(str(JERSEY_FONT), size)
    filename = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(str(DEJAVU_DIR / filename), size)


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size[0] - 1, size[1] - 1), radius, fill=255
    )
    return mask


def crop_window_chrome(src: Image.Image) -> Image.Image:
    """Drop the dimmer OS title bar and the left ribbon gutter."""
    image = src.convert("RGB")
    width, height = image.size
    pixels = image.load()

    def luma(x: int, y: int) -> float:
        red, green, blue = pixels[x, y]
        return 0.299 * red + 0.587 * green + 0.114 * blue

    top = 0
    for y in range(height):
        if luma(width // 2, y) >= 254:
            top = y
            break

    left = 0
    mid_y = min(height - 1, max(top + 80, height // 2))
    saw_gutter = False
    for x in range(width):
        value = luma(x, mid_y)
        if not saw_gutter and value < 250:
            saw_gutter = True
            continue
        if saw_gutter and value >= 254:
            left = x
            break

    if top == 0 and left == 0:
        return image
    return image.crop((left, top, width, height))


def contain(src: Image.Image, size: tuple[int, int], background: str) -> Image.Image:
    image = src.convert("RGB")
    image.thumbnail(size, Image.Resampling.LANCZOS)
    result = Image.new("RGB", size, background)
    x = (size[0] - image.width) // 2
    y = (size[1] - image.height) // 2
    result.paste(image, (x, y))
    return result


def cover_top(src: Image.Image, size: tuple[int, int]) -> Image.Image:
    image = src.convert("RGB")
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    left = max(0, (resized.width - target_w) // 2)
    return resized.crop((left, 0, left + target_w, target_h))


def trim_phone_safe_area(src: Image.Image) -> Image.Image:
    """Drop a typical iOS status bar and home-indicator inset from a screenshot."""
    image = src.convert("RGB")
    width, height = image.size
    if height < 400 or width / height > 0.72:
        return image
    top = max(10, round(height * 0.045))
    bottom = max(10, round(height * 0.028))
    if top + bottom >= height:
        return image
    return image.crop((0, top, width, height - bottom))


def fit_frame(src: Image.Image, size: tuple[int, int], mode: str, background: str) -> Image.Image:
    if mode == "cover-top":
        return cover_top(src, size)
    if mode == "contain":
        return contain(src, size, background)
    raise ValueError(f"unknown fit mode: {mode}")


def compose(
    desktop: Image.Image,
    mobile: Image.Image,
    copy: HeroCopy | None = None,
    crop_chrome: bool = False,
    desktop_fit: str = "contain",
    phone_fit: str = "contain",
    crop_mobile_chrome: bool | None = None,
    trim_phone_chrome: bool = False,
) -> Image.Image:
    text = copy or HeroCopy()
    crop_mobile = crop_chrome if crop_mobile_chrome is None else crop_mobile_chrome
    if crop_chrome:
        desktop = crop_window_chrome(desktop)
    if crop_mobile:
        mobile = crop_window_chrome(mobile)
    if trim_phone_chrome:
        mobile = trim_phone_safe_area(mobile)

    canvas = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(canvas)

    draw.text((80, 36), text.kicker, fill=TEXT, font=font(24, jersey=True))
    draw.text(
        (80, 68),
        text.headline,
        fill=TEXT,
        font=font(56, jersey=True),
    )
    right_label = text.label
    right_box = draw.textbbox((0, 0), right_label, font=font(15))
    right_width = right_box[2] - right_box[0]
    draw.text(
        (1520 - right_width, 56),
        right_label,
        fill=MUTED,
        font=font(15),
    )

    shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (72, 172, 1348, 898),
        radius=20,
        fill=(23, 29, 38, 34),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow).convert("RGB")
    draw = ImageDraw.Draw(canvas)

    draw.rounded_rectangle(
        DESKTOP_CARD,
        radius=16,
        fill=BORDER,
    )
    desktop_box = (
        DESKTOP_CARD[2] - DESKTOP_CARD[0] - DESKTOP_INSET * 2,
        DESKTOP_CARD[3] - DESKTOP_CARD[1] - DESKTOP_INSET * 2,
    )
    desktop_image = fit_frame(desktop, desktop_box, desktop_fit, "#FFFFFF")
    desktop_mask = rounded_mask(desktop_box, 10)
    canvas.paste(
        desktop_image,
        (DESKTOP_CARD[0] + DESKTOP_INSET, DESKTOP_CARD[1] + DESKTOP_INSET),
        desktop_mask,
    )

    phone_shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    phone_shadow_draw = ImageDraw.Draw(phone_shadow)
    phone_shadow_draw.rounded_rectangle(
        (1210, 230, 1530, 870),
        radius=50,
        fill=(23, 29, 38, 68),
    )
    phone_shadow = phone_shadow.filter(ImageFilter.GaussianBlur(22))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), phone_shadow).convert("RGB")
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(PHONE_FRAME, radius=44, fill="#17191D")

    phone_box = (
        PHONE_FRAME[2] - PHONE_FRAME[0] - PHONE_INSET * 2,
        PHONE_FRAME[3] - PHONE_FRAME[1] - PHONE_INSET * 2,
    )
    phone_image = fit_frame(mobile, phone_box, phone_fit, "#FFFFFF")
    phone_mask = rounded_mask(phone_box, 34)
    canvas.paste(
        phone_image,
        (PHONE_FRAME[0] + PHONE_INSET, PHONE_FRAME[1] + PHONE_INSET),
        phone_mask,
    )
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--desktop", required=True)
    parser.add_argument("--mobile", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--kicker", default=HeroCopy.kicker)
    parser.add_argument("--headline", default=HeroCopy.headline)
    parser.add_argument("--label", default=HeroCopy.label)
    parser.add_argument(
        "--crop-chrome",
        action="store_true",
        help="Crop OS title bar and left ribbon before composing",
    )
    parser.add_argument(
        "--desktop-fit",
        choices=("contain", "cover-top"),
        default="contain",
        help="How the desktop shot fills its card (daily hero uses contain)",
    )
    parser.add_argument(
        "--phone-fit",
        choices=("contain", "cover-top"),
        default="contain",
        help="How the mobile shot fills the device frame (daily hero uses contain)",
    )
    parser.add_argument(
        "--skip-mobile-chrome",
        action="store_true",
        help="Do not crop OS title bar / ribbon from the mobile shot",
    )
    parser.add_argument(
        "--trim-phone-chrome",
        action="store_true",
        help="Trim iOS status bar / home indicator from a phone screenshot",
    )
    args = parser.parse_args()

    for value in (args.desktop, args.mobile):
        if not Path(value).is_file():
            parser.error(f"missing screenshot: {value}")

    out = compose(
        Image.open(args.desktop),
        Image.open(args.mobile),
        HeroCopy(kicker=args.kicker, headline=args.headline, label=args.label),
        crop_chrome=args.crop_chrome,
        desktop_fit=args.desktop_fit,
        phone_fit=args.phone_fit,
        crop_mobile_chrome=False if args.skip_mobile_chrome else None,
        trim_phone_chrome=args.trim_phone_chrome,
    )
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    out.save(args.out, "PNG", optimize=True)
    print(f"wrote {args.out} {out.size} {out.mode}")


if __name__ == "__main__":
    main()
