"""Generate CleanClip app icons programmatically using Pillow."""
from PIL import Image, ImageDraw, ImageFont
import math

SIZE = 1024
HALF = SIZE // 2

def draw_rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    draw.rectangle([x0+radius, y0, x1-radius, y1], fill=fill)
    draw.rectangle([x0, y0+radius, x1, y1-radius], fill=fill)
    draw.pieslice([x0, y0, x0+2*radius, y0+2*radius], 180, 270, fill=fill)
    draw.pieslice([x1-2*radius, y0, x1, y0+2*radius], 270, 360, fill=fill)
    draw.pieslice([x0, y1-2*radius, x0+2*radius, y1], 90, 180, fill=fill)
    draw.pieslice([x1-2*radius, y1-2*radius, x1, y1], 0, 90, fill=fill)

def create_icon(size=SIZE):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Blue gradient background
    for y in range(size):
        r = int(10 + (0 - 10) * y / size)
        g = int(132 + (122 - 132) * y / size)
        b = int(255 + (255 - 255) * y / size)
        draw.line([(0, y), (size, y)], fill=(r, g, b))

    # Clipboard body (white rounded rect)
    pad = int(size * 0.18)
    clip_top = int(size * 0.22)
    draw_rounded_rect(draw, (pad, clip_top, size - pad, size - pad), int(size * 0.06), fill=(255, 255, 255))

    # Clipboard clip (top tab)
    tab_w = int(size * 0.22)
    tab_h = int(size * 0.08)
    tab_x = HALF - tab_w
    tab_y = clip_top - int(tab_h * 0.5)
    draw_rounded_rect(draw, (tab_x, tab_y, tab_x + tab_w * 2, tab_y + tab_h), int(size * 0.025), fill=(255, 255, 255))

    # Lines on clipboard (blue-gray)
    line_color = (200, 215, 235)
    line_pad = int(size * 0.26)
    line_right = size - int(size * 0.26)
    for i in range(3):
        ly = int(size * 0.38) + i * int(size * 0.1)
        lw = line_right - int(size * 0.08 * i) if i < 2 else int(size * 0.32)
        draw_rounded_rect(draw, (line_pad, ly, line_pad + lw - line_pad, ly + int(size * 0.025)), 4, fill=line_color)

    # Shield icon (bottom right)
    shield_cx = int(size * 0.72)
    shield_cy = int(size * 0.68)
    shield_size = int(size * 0.18)

    # Shield shape using polygon
    points = []
    # Top arc
    for angle in range(180, 361):
        rad = math.radians(angle)
        x = shield_cx + int(shield_size * 0.5 * math.cos(rad))
        y = shield_cy - int(shield_size * 0.35) + int(shield_size * 0.35 * math.sin(rad))
        points.append((x, y))
    # Bottom point
    points.append((shield_cx, shield_cy + int(shield_size * 0.55)))

    # Draw shield background circle
    sc = int(shield_size * 0.65)
    draw.ellipse([shield_cx - sc, shield_cy - sc, shield_cx + sc, shield_cy + sc], fill=(0, 100, 220))

    # Checkmark on shield
    check_size = int(shield_size * 0.3)
    cx, cy = shield_cx, shield_cy
    draw.line([(cx - check_size, cy), (cx - int(check_size*0.3), cy + check_size)], fill=(255, 255, 255), width=int(size * 0.025))
    draw.line([(cx - int(check_size*0.3), cy + check_size), (cx + check_size, cy - int(check_size*0.5))], fill=(255, 255, 255), width=int(size * 0.025))

    return img

# Generate all icon sizes
icon = create_icon(1024)
icon.save('/home/ec2-user/hirashimallc/35_pj-expo/cleanclip18084/assets/icon.png')
print("Generated icon.png (1024x1024)")

# Adaptive icon (foreground only - transparent background)
adaptive = create_icon(1024)
adaptive.save('/home/ec2-user/hirashimallc/35_pj-expo/cleanclip18084/assets/adaptive-icon.png')
print("Generated adaptive-icon.png")

# Splash icon (smaller, centered)
splash = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
small_icon = create_icon(400)
splash.paste(small_icon, (56, 56), small_icon)
splash.save('/home/ec2-user/hirashimallc/35_pj-expo/cleanclip18084/assets/splash-icon.png')
print("Generated splash-icon.png")

# Favicon
favicon = create_icon(64)
favicon.save('/home/ec2-user/hirashimallc/35_pj-expo/cleanclip18084/assets/favicon.png')
print("Generated favicon.png")

print("All icons generated successfully!")
