#!/usr/bin/env python3
"""Build the project-card thumbnails in static/images/thumbs/ from each
project's own screenshots.

"cover" crops the source to the card's 1200x630 shape (anchored by `ay`,
0 = top, 0.5 = centre). "fit" keeps the whole screenshot and pads it with
the screenshot's own corner colour, for portrait or oddly shaped shots.

Run from the repo root: python3 scripts/gen_thumbs.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "static" / "images"
OUT = IMG / "thumbs"
W, H = 960, 504  # 1200:630, 2x a ~480px card

THUMBS = {
    "duely":                  ("duely/upcoming.webp", "cover", 0.0),
    "ontario-drive-test-map": ("odtm/side-by-side.webp", "cover", 0.5),
    "salah":                  ("salah/today.webp", "fit", None),
    "rpi-packet-analyzer":    ("rpi-packet-analyzer/dashboard-v2.webp", "cover", 0.0),
    "esp32-tamagotchi":       ("esp32-tamagotchi/page.webp", "fit", None),
    "carleton-course-map":    ("coursemap/coursemap-screenshot-1.png", "cover", 0.0),
    "linux-kernel-patch":     ("after.png", "cover", 0.0),
    "nintendo-ds":            ("ds.jpg", "cover", 0.45),
    "c-simulation":           ("c2401pt2.png", "fit", None),
}


def cover(im, ay):
    scale = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    x = (im.width - W) // 2
    y = round((im.height - H) * ay)
    return im.crop((x, y, x + W, y + H))


def fit(im, pad=0.06):
    # sample just inside the bottom edge: corners can be transparent/rounded
    bg = im.getpixel((im.width // 2, im.height - 4))
    box_w, box_h = W * (1 - 2 * pad), H * (1 - 2 * pad)
    scale = min(box_w / im.width, box_h / im.height)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGB", (W, H), bg)
    canvas.paste(im, ((W - im.width) // 2, (H - im.height) // 2))
    return canvas


def main():
    OUT.mkdir(exist_ok=True)
    for slug, (src, mode, ay) in THUMBS.items():
        im = Image.open(IMG / src).convert("RGB")
        out = cover(im, ay) if mode == "cover" else fit(im)
        dest = OUT / f"{slug}.webp"
        out.save(dest, "WEBP", quality=82, method=6)
        print(f"{dest.relative_to(ROOT)}  {dest.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
