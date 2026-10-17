from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
for f in sorted((ROOT / "export").glob("*.png")):
    im0 = Image.open(f).convert("RGBA")
    im = Image.new("RGBA", im0.size, (235, 234, 230, 255))
    im.alpha_composite(im0)
    im = im.convert("RGB")
    bg = Image.new("RGB", im.size, im.getpixel((im.width - 1, im.height - 1)))
    box = ImageChops.difference(im, bg).getbbox()
    if not box:
        continue
    l, t, r, b = box
    pad = 48
    im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad))).save(f)
