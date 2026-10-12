from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

root = Path(__file__).resolve().parents[1]
out = root / "frontend" / "public" / "brand"
out.mkdir(parents=True, exist_ok=True)
public = root / "frontend" / "public"

TERRACOTTA = (200, 85, 61, 255)
OLIVE = (62, 74, 50, 255)
SAND = (246, 239, 230, 255)
CREAM = (246, 239, 230, 255)
DARK = (30, 34, 28, 255)


def draw_mark(draw, color, scale=1.0, ox=0, oy=0):
    x, y, w, h = int(5 * scale) + ox, int(12 * scale) + oy, int(38 * scale), int(6 * scale)
    draw.rounded_rectangle([x, y, x + w, y + h], radius=max(2, int(3 * scale)), fill=color)
    x, y, w, h = int(10 * scale) + ox, int(20 * scale) + oy, int(6 * scale), int(20 * scale)
    draw.rounded_rectangle([x, y, x + w, y + h], radius=max(2, int(2.5 * scale)), fill=color)
    x, y, w, h = int(32 * scale) + ox, int(20 * scale) + oy, int(6 * scale), int(20 * scale)
    draw.rounded_rectangle([x, y, x + w, y + h], radius=max(2, int(2.5 * scale)), fill=color)
    pts = [
        (int(18 * scale) + ox, int(20 * scale) + oy),
        (int(24 * scale) + ox, int(33 * scale) + oy),
        (int(30 * scale) + ox, int(20 * scale) + oy),
    ]
    draw.line(pts, fill=color, width=max(3, int(5.5 * scale)), joint="curve")


def trim(img: Image.Image, pad: int = 12) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(img.width, right + pad)
    bottom = min(img.height, bottom + pad)
    return img.crop((left, top, right, bottom))


def save_mark(name, fg, bg=None, size=512):
    img = Image.new("RGBA", (size, size), bg if bg else (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_mark(draw, fg, scale=size / 48)
    if bg is None:
        img = trim(img, pad=24)
    img.save(out / name)
    print("wrote", name, img.size)


save_mark("mesaro-mark.png", TERRACOTTA, SAND, 512)
save_mark("mesaro-mono.png", OLIVE, None, 512)
save_mark("mesaro-on-dark.png", CREAM, DARK, 512)

for s in (32, 180):
    img = Image.new("RGBA", (s, s), SAND)
    draw = ImageDraw.Draw(img)
    draw_mark(draw, TERRACOTTA, scale=s / 48)
    if s == 32:
        img.save(public / "favicon.ico", format="ICO", sizes=[(32, 32)])
    if s == 180:
        img.save(public / "apple-touch-icon.png")


def make_wordmark(fg_mark, fg_text, bg, name):
    # Draw on a temporary canvas, then crop tightly so centering works in UI/email.
    canvas = Image.new("RGBA", (720, 180), bg if bg else (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw_mark(draw, fg_mark, scale=2.6, ox=16, oy=28)
    try:
        font = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", 92)
    except OSError:
        try:
            font = ImageFont.truetype(r"C:\Windows\Fonts\arialbd.ttf", 92)
        except OSError:
            font = ImageFont.load_default()
    draw.text((170, 42), "Mesaro", font=font, fill=fg_text)
    cropped = trim(canvas, pad=16)
    cropped.save(out / name)
    print("wrote", name, cropped.size)


make_wordmark(TERRACOTTA, OLIVE, (0, 0, 0, 0), "mesaro-wordmark.png")
make_wordmark(CREAM, CREAM, DARK, "mesaro-wordmark-on-dark.png")
make_wordmark(OLIVE, OLIVE, (0, 0, 0, 0), "mesaro-mono-wordmark.png")
print("done")
