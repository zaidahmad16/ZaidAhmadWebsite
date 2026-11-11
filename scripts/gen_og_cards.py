#!/usr/bin/env python3
"""Generate project OG/preview cards (1200x630) in light and dark variants.

Reads color tokens straight out of tokens.css (converted from OKLCH to sRGB)
and renders each card with Pillow using the site's actual font files, so the
light and dark cards stay visually matched without hand-picked hex values.

Usage:
    python3 scripts/gen_og_cards.py            # writes both themes for all projects
    python3 scripts/gen_og_cards.py --theme light --slug duely
"""
import argparse
import math
import os
import textwrap

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OG_DIR = os.path.join(ROOT, "static", "images", "og")

INTER_VAR = "/home/zaid/.local/share/fonts/Inter-VariableFont_opsz,wght.ttf"
MONO_REGULAR = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Regular.ttf"
MONO_BOLD = "/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Bold.ttf"

W, H = 1200, 630
MARGIN_LEFT = 100
HOOK_MAX_WIDTH = 900
ACCENT_BAR_W = 5

PROJECTS = [
    dict(slug="duely", eyebrow="2026 · desktop · windows · macos · linux", title="Duely",
         hook="Keeps Brightspace deadlines, tests and classes in Google Calendar, synced from the student's own Google account.",
         path="zaidahmad.dev/projects/duely"),
    dict(slug="ontario-drive-test-map", eyebrow="map · python · react", title="OntarioDriveTestMap",
         hook="Ontario's road test routes, rebuilt from Reddit posts and OCR on dashcam video, with a confidence level for every segment.",
         path="zaidahmad.dev/projects/ontario-drive-test-map"),
    dict(slug="salah", eyebrow="2026 · linux desktop", title="Salah",
         hook="A prayer-times app and panel applet that shows my mosque's own timetable, and reproduces it to the minute offline.",
         path="zaidahmad.dev/projects/salah"),
    dict(slug="rpi-packet-analyzer", eyebrow="2026 · networking", title="RPi Network Packet Analyzer",
         hook="A packet analyzer for my Raspberry Pi 5, written from raw sockets up with no dependencies.",
         path="zaidahmad.dev/projects/rpi-packet-analyzer"),
    dict(slug="carleton-course-map", eyebrow="2025 · web", title="Carleton Course Map",
         hook="A prerequisite map and semester planner for every program at Carleton, used by 4.5K+ students.",
         path="zaidahmad.dev/projects/carleton-course-map"),
    dict(slug="linux-kernel-patch", eyebrow="2024 · c · mac80211", title="Linux Wireless Kernel Patch",
         hook="A Linux kernel patch to the mac80211 Wi-Fi stack that took a connection stuck at 54 Mbps to 1 Gbps.",
         path="zaidahmad.dev/projects/linux-kernel-patch"),
    dict(slug="nintendo-ds", eyebrow="2025 · c · homebrew", title="Nintendo DS Business Card",
         hook="A business card that boots on a Nintendo DS. Play a short game, get my contact info at the end.",
         path="zaidahmad.dev/projects/nintendo-ds"),
    dict(slug="c-simulation", eyebrow="2024 · c · posix threads", title="Ghost Hunting Simulation",
         hook="Every actor is its own POSIX thread on shared memory. Zero deadlocks across 1,000+ ticks.",
         path="zaidahmad.dev/projects/c-simulation"),
]

# ── OKLCH -> sRGB (matches tokens.css values exactly) ──────────────────────
def oklch_to_rgb(L, C, H_deg):
    h = math.radians(H_deg)
    a, b = C * math.cos(h), C * math.sin(h)
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    bb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s

    def enc(c):
        c = max(0.0, min(1.0, c))
        c = c * 12.92 if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055
        return round(max(0.0, min(1.0, c)) * 255)

    return (enc(r), enc(g), enc(bb))

THEMES = {
    "light": dict(
        bg=oklch_to_rgb(0.99, 0, 0),
        ink=oklch_to_rgb(0.10, 0, 0),
        ink2=oklch_to_rgb(0.38, 0, 0),
        ink3=oklch_to_rgb(0.58, 0, 0),
        accent=oklch_to_rgb(0.54, 0.18, 264),
    ),
    "dark": dict(
        bg=oklch_to_rgb(0.055, 0, 0),
        ink=oklch_to_rgb(0.95, 0, 0),
        ink2=oklch_to_rgb(0.62, 0, 0),
        ink3=oklch_to_rgb(0.38, 0, 0),
        accent=oklch_to_rgb(0.73, 0.14, 264),
    ),
}

def inter(size, weight):
    f = ImageFont.truetype(INTER_VAR, size)
    f.set_variation_by_axes([14, weight])
    return f

def fit_title_font(draw, text, max_width, start_size=80, min_size=44, weight=800):
    size = start_size
    while size > min_size:
        f = inter(size, weight)
        if draw.textlength(text, font=f) <= max_width:
            return f
        size -= 2
    return inter(min_size, weight)

def wrap_to_width(draw, text, font, max_width):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=font) <= max_width:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines

def render_card(project, theme_name, out_path):
    theme = THEMES[theme_name]
    img = Image.new("RGB", (W, H), theme["bg"])
    draw = ImageDraw.Draw(img)

    draw.rectangle([0, 0, ACCENT_BAR_W, H], fill=theme["accent"])

    f_eyebrow = ImageFont.truetype(MONO_REGULAR, 21)
    title_max_width = W - MARGIN_LEFT - 96
    f_title = fit_title_font(draw, project["title"], title_max_width)
    f_hook = inter(27, 400)
    f_path = ImageFont.truetype(MONO_REGULAR, 21)
    f_mono = inter(24, 800)

    draw.text((MARGIN_LEFT, 84), project["eyebrow"], font=f_eyebrow, fill=theme["ink3"])
    draw.text((MARGIN_LEFT, 128), project["title"], font=f_title, fill=theme["ink"])

    hook_lines = wrap_to_width(draw, project["hook"], f_hook, HOOK_MAX_WIDTH)
    y = 262
    for line in hook_lines[:2]:
        draw.text((MARGIN_LEFT, y), line, font=f_hook, fill=theme["ink2"])
        y += 46

    footer_y = 518
    draw.text((MARGIN_LEFT, footer_y), project["path"], font=f_path, fill=theme["accent"])
    mono_text = "ZA"
    mono_w = draw.textlength(mono_text, font=f_mono)
    draw.text((W - 96 - mono_w, footer_y - 2), mono_text, font=f_mono, fill=theme["ink"])

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--theme", choices=["light", "dark", "both"], default="both")
    ap.add_argument("--slug", default=None, help="only render this project slug")
    args = ap.parse_args()

    themes = ["light", "dark"] if args.theme == "both" else [args.theme]
    projects = [p for p in PROJECTS if args.slug is None or p["slug"] == args.slug]

    for project in projects:
        for theme_name in themes:
            if theme_name == "light":
                out_path = os.path.join(OG_DIR, "light", f"{project['slug']}.png")
            else:
                out_path = os.path.join(OG_DIR, f"{project['slug']}.png")
            render_card(project, theme_name, out_path)
            print(f"wrote {out_path}")

if __name__ == "__main__":
    main()
