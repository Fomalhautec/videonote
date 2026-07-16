"""Generate VideoNote ICO icon from the SVG design using Pillow."""
from PIL import Image, ImageDraw, ImageFont
import os

SIZE = 512
BG_COLOR = (108, 92, 231)  # #6c5ce7
FG_COLOR = (255, 255, 255)  # white
RADIUS = 80

def make_rounded_rect(size, radius, color):
    """Create a rounded rectangle image."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=color)
    return img

def draw_v(img):
    """Draw a white 'V' centered on the image."""
    draw = ImageDraw.Draw(img)
    font_size = int(img.width * 0.47)  # ~240/512 ratio
    # Try common Windows fonts
    font = None
    for font_name in ["arialbd.ttf", "ariblk.ttf", "segoeuib.ttf", "arial.ttf"]:
        try:
            font = ImageFont.truetype(font_name, font_size)
            break
        except (OSError, IOError):
            continue
    if font is None:
        font = ImageFont.load_default()

    text = "V"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    # Center horizontally, adjust vertical for visual balance
    x = (img.width - tw) / 2 - bbox[0]
    y = (img.height - th) / 2 - bbox[1] + int(img.height * 0.03)
    draw.text((x, y), text, fill=FG_COLOR, font=font)
    return img

# Create master image at 512x512
master = make_rounded_rect(SIZE, RADIUS, BG_COLOR)
master = draw_v(master)

# Save as ICO with multiple sizes
ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
out_path = os.path.join(os.path.dirname(__file__), "icon.ico")
master.save(out_path, format="ICO", sizes=ico_sizes)
print(f"Icon saved to {out_path}")

# Also save a 256 PNG for reference
png_path = os.path.join(os.path.dirname(__file__), "icon.png")
master_resized = master.resize((256, 256), Image.LANCZOS)
master_resized.save(png_path, format="PNG")
print(f"PNG saved to {png_path}")
