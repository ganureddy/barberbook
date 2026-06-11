"""Rasterize the BarberBook brand mark to the three PNG sizes Expo needs.

Avoids any SVG toolchain dependency (no rsvg-convert / cairosvg). Uses
Pillow only, which ships with the Frappe venv. Output is 32-bit RGBA so
the colors don't posterize on-device the way the previous 8-bit colormap
exports did.

Run once whenever the brand changes:

    cd ~/frappe-bench/apps/barberbook/barberbook/frontend/mobile/assets
    ../../../../../env/bin/python brand/render_logo.py

Artifacts written:

  icon.png            1024x1024  Solid-bg square icon (iOS / store listings)
  adaptive-icon.png   1024x1024  Transparent-bg foreground (Android adaptive)
  splash-icon.png     1024x1024  Transparent-bg wordmark (Expo splash centered)
  favicon.png           48x48    Tiny rounded chip (web / EAS dashboard)

Brand reference (matches src/design/tokens.ts):
  red    #D4322C
  cream  #F5F1E8
  navy   #1E3A8A
  gold   #C9A24C
  ink    #0E0E10
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ─── brand constants ──────────────────────────────────────────────────────

RED = (212, 50, 44, 255)
RED_DEEP = (168, 33, 27, 255)
CREAM = (245, 241, 232, 255)
NAVY = (30, 58, 138, 255)
GOLD = (201, 162, 76, 255)
INK = (14, 14, 16, 255)
INK_SOFT = (27, 26, 24, 255)
TRANSPARENT = (0, 0, 0, 0)

CANVAS = 1024


# ─── primitives ────────────────────────────────────────────────────────────

def _rounded_square(size: int, radius: int, fill: tuple[int, int, int, int]) -> Image.Image:
    """Solid rounded-square tile, antialiased."""
    img = Image.new("RGBA", (size, size), TRANSPARENT)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=fill)
    return img


def _vertical_gradient(size: int, top: tuple[int, int, int, int], bottom: tuple[int, int, int, int]) -> Image.Image:
    """Vertical gradient block. Used for the deep-ink bg sheen."""
    grad = Image.new("RGBA", (size, size))
    for y in range(size):
        t = y / max(1, size - 1)
        r = round(top[0] * (1 - t) + bottom[0] * t)
        g = round(top[1] * (1 - t) + bottom[1] * t)
        b = round(top[2] * (1 - t) + bottom[2] * t)
        a = round(top[3] * (1 - t) + bottom[3] * t)
        ImageDraw.Draw(grad).line(((0, y), (size, y)), fill=(r, g, b, a))
    return grad


def _barber_pole(width: int, height: int) -> Image.Image:
    """The diagonal red / cream / navy barber-pole stripe block.

    Painted into a tall, narrow canvas which the caller rotates and pastes.
    The stripe band order is canonical: cream → red → cream → navy, which
    matches the tokens.ts palette and the design canvas.
    """
    img = Image.new("RGBA", (width, height), TRANSPARENT)
    d = ImageDraw.Draw(img)

    band_h = max(8, height // 28)
    bands = [CREAM, RED, CREAM, NAVY]
    y = 0
    i = 0
    while y < height:
        d.rectangle((0, y, width, y + band_h), fill=bands[i % 4])
        y += band_h
        i += 1

    # Caps on top and bottom so the pole reads as 3D, not just stripes.
    cap_h = int(height * 0.04)
    d.rectangle((0, 0, width, cap_h), fill=INK)
    d.rectangle((0, height - cap_h, width, height), fill=INK)
    return img


def _draw_bb_monogram(canvas: Image.Image, *, color: tuple[int, int, int, int], y_center: int, height_px: int) -> None:
    """Stamp the 'BB' wordmark across the canvas using a system font. We
    pick the boldest available DejaVu (which always ships in Linux) for a
    condensed, high-contrast feel close to Anton."""
    font: ImageFont.FreeTypeFont | None = None
    for face in (
        "/usr/share/fonts/truetype/dejavu/DejaVu-Sans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    ):
        try:
            font = ImageFont.truetype(face, height_px)
            break
        except (OSError, IOError):
            continue
    if font is None:
        font = ImageFont.load_default(size=height_px)

    text = "BB"
    d = ImageDraw.Draw(canvas)
    bbox = d.textbbox((0, 0), text, font=font, stroke_width=int(height_px * 0.04))
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (canvas.size[0] - tw) // 2 - bbox[0]
    y = y_center - th // 2 - bbox[1]
    # Subtle drop-shadow so the wordmark sits on top of the pole crisply.
    shadow = Image.new("RGBA", canvas.size, TRANSPARENT)
    sd = ImageDraw.Draw(shadow)
    sd.text((x + 6, y + 6), text, font=font, fill=(0, 0, 0, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=8))
    canvas.alpha_composite(shadow)
    d.text((x, y), text, font=font, fill=color, stroke_width=int(height_px * 0.04), stroke_fill=color)


# ─── compositions ──────────────────────────────────────────────────────────

def render_icon() -> Image.Image:
    """Solid icon for iOS + store: ink-gradient bg, pole at 22°, 'BB' mark."""
    bg = _vertical_gradient(CANVAS, INK_SOFT, INK)
    base = _rounded_square(CANVAS, radius=220, fill=(255, 255, 255, 255))
    bg_masked = Image.new("RGBA", (CANVAS, CANVAS), TRANSPARENT)
    bg_masked.paste(bg, (0, 0), mask=base.split()[3])

    # Tilted barber-pole stripe at the top-right.
    pole_w = int(CANVAS * 0.28)
    pole_h = int(CANVAS * 1.5)
    pole = _barber_pole(pole_w, pole_h).rotate(22, resample=Image.BICUBIC, expand=True)
    px = int(CANVAS * 0.55)
    py = int(-CANVAS * 0.18)
    bg_masked.alpha_composite(pole, (px, py))

    # Re-mask to the rounded square so the pole doesn't overflow corners.
    final = Image.new("RGBA", (CANVAS, CANVAS), TRANSPARENT)
    final.paste(bg_masked, (0, 0), mask=base.split()[3])

    # 'BB' wordmark, cream, centered slightly below the optical middle.
    _draw_bb_monogram(final, color=CREAM, y_center=int(CANVAS * 0.62), height_px=int(CANVAS * 0.40))

    # Gold underline accent.
    d = ImageDraw.Draw(final)
    line_w = int(CANVAS * 0.34)
    line_h = int(CANVAS * 0.013)
    line_y = int(CANVAS * 0.83)
    d.rounded_rectangle(
        ((CANVAS - line_w) // 2, line_y, (CANVAS + line_w) // 2, line_y + line_h),
        radius=line_h // 2,
        fill=GOLD,
    )

    return final


def render_adaptive_foreground() -> Image.Image:
    """Android adaptive icon FOREGROUND. The background is a solid red
    set in app.json (`android.adaptiveIcon.backgroundColor`). We paint
    only the cream wordmark + pole, all confined to the inner 66% safe
    zone so the system shape mask never crops it.
    """
    final = Image.new("RGBA", (CANVAS, CANVAS), TRANSPARENT)
    safe = int(CANVAS * 0.66)
    offset = (CANVAS - safe) // 2

    # Tilted cream barber-pole behind the wordmark.
    pole_w = int(safe * 0.40)
    pole_h = int(safe * 1.40)
    pole = Image.new("RGBA", (pole_w, pole_h), TRANSPARENT)
    pd = ImageDraw.Draw(pole)
    band_h = max(6, pole_h // 16)
    y = 0
    bands = [CREAM, NAVY, CREAM, INK]
    i = 0
    while y < pole_h:
        pd.rectangle((0, y, pole_w, y + band_h), fill=bands[i % 4])
        y += band_h
        i += 1
    pole = pole.rotate(22, resample=Image.BICUBIC, expand=True)
    final.alpha_composite(pole, (offset + safe // 2 + int(safe * 0.18) - pole.size[0] // 2,
                                  offset + safe // 2 - pole.size[1] // 2))

    _draw_bb_monogram(final, color=CREAM, y_center=CANVAS // 2, height_px=int(safe * 0.62))
    return final


def render_splash_icon() -> Image.Image:
    """Splash screen logomark — wordmark on transparent background.
    Expo composites this on top of `splash.backgroundColor` (cream).
    """
    final = Image.new("RGBA", (CANVAS, CANVAS), TRANSPARENT)

    # Centered ink rounded chip, 60% of canvas, holding the BB.
    chip_size = int(CANVAS * 0.62)
    chip = _rounded_square(chip_size, radius=int(chip_size * 0.22), fill=INK)
    final.paste(chip, ((CANVAS - chip_size) // 2, (CANVAS - chip_size) // 2), mask=chip.split()[3])

    # Pole tilted across the chip.
    pole_w = int(chip_size * 0.18)
    pole_h = int(chip_size * 1.05)
    pole = _barber_pole(pole_w, pole_h).rotate(22, resample=Image.BICUBIC, expand=True)
    final.alpha_composite(
        pole,
        (
            (CANVAS - pole.size[0]) // 2 + int(chip_size * 0.16),
            (CANVAS - pole.size[1]) // 2 - int(chip_size * 0.04),
        ),
    )

    _draw_bb_monogram(final, color=CREAM, y_center=CANVAS // 2, height_px=int(chip_size * 0.55))

    # Gold tagline accent under the chip.
    d = ImageDraw.Draw(final)
    line_w = int(CANVAS * 0.18)
    line_h = int(CANVAS * 0.012)
    line_y = (CANVAS + chip_size) // 2 + int(CANVAS * 0.04)
    d.rounded_rectangle(
        ((CANVAS - line_w) // 2, line_y, (CANVAS + line_w) // 2, line_y + line_h),
        radius=line_h // 2,
        fill=GOLD,
    )
    return final


def render_favicon() -> Image.Image:
    """Tiny 48x48 favicon — straight downscale of the icon."""
    return render_icon().resize((48, 48), Image.LANCZOS)


# ─── main ──────────────────────────────────────────────────────────────────

def main() -> None:
    here = Path(__file__).resolve().parent.parent  # frontend/mobile/assets
    out = {
        "icon.png": render_icon(),
        "adaptive-icon.png": render_adaptive_foreground(),
        "splash-icon.png": render_splash_icon(),
        "favicon.png": render_favicon(),
    }
    for name, img in out.items():
        path = here / name
        img.save(path, format="PNG", optimize=True)
        print(f"  wrote {path} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    main()
