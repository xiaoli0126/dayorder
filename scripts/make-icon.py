"""Generate the DayOrder app icon (build/icon.ico + build/icon.png).

Run with: python scripts/make-icon.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

SIZE = 1024
BG_TOP = (47, 125, 110)
BG_BOTTOM = (32, 92, 81)
INK = (250, 248, 245)

root = Path(__file__).resolve().parent.parent
build = root / "build"
build.mkdir(exist_ok=True)

canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

# Vertical gradient background inside a rounded square
gradient = Image.new("RGB", (1, SIZE))
gradient_draw = ImageDraw.Draw(gradient)
for y in range(SIZE):
    t = y / (SIZE - 1)
    color = tuple(round(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t) for i in range(3))
    gradient_draw.point((0, y), fill=color)
gradient = gradient.resize((SIZE, SIZE))

mask = Image.new("L", (SIZE, SIZE), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=232, fill=255)
canvas.paste(gradient, (0, 0), mask)

draw = ImageDraw.Draw(canvas)

# Three timeline bars, bottom aligned
bar_width = 104
gap = 68
heights = [352, 512, 256]
total_width = bar_width * 3 + gap * 2
x = (SIZE - total_width) // 2
bottom = 760
for height in heights:
    draw.rounded_rectangle(
        (x, bottom - height, x + bar_width, bottom),
        radius=bar_width // 2,
        fill=INK,
    )
    x += bar_width + gap

# A thin baseline under the bars, like a time axis
draw.rounded_rectangle((196, 812, SIZE - 196, 844), radius=16, fill=(250, 248, 245, 90))

canvas.save(build / "icon.png")

sizes = [256, 128, 64, 48, 32, 16]
frames = [canvas.resize((size, size), Image.LANCZOS) for size in sizes]
frames[0].save(build / "icon.ico", format="ICO", sizes=[(s, s) for s in sizes])

print("wrote", build / "icon.ico", build / "icon.png")
