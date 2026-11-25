"""Lager app-ikonene for Fasit (PNG) med Pillow. Kjøres: python make_icons.py <utmappe>"""
import sys, os
from PIL import Image, ImageDraw, ImageFilter, ImageChops

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
S = 2048  # tegner stort og skalerer ned for glatte kanter


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def radial(size, center, radius, color, alpha):
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    cx, cy = center
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=int(255 * alpha))
    mask = mask.filter(ImageFilter.GaussianBlur(radius * 0.45))
    layer.paste(color + (255,), (0, 0), mask)
    return layer


def base(bg, glow_a, glow_b, grid):
    img = Image.new("RGBA", (S, S), bg + (255,))
    img = Image.alpha_composite(img, radial(S, (int(S * 0.05), int(S * -0.05)), int(S * 0.75), glow_a, 0.28))
    img = Image.alpha_composite(img, radial(S, (int(S * 1.05), int(S * 0.05)), int(S * 0.65), glow_b, 0.22))
    g = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    gd = ImageDraw.Draw(g)
    step = S // 16
    for i in range(0, S + 1, step):
        gd.line([(i, 0), (i, S)], fill=grid, width=4)
        gd.line([(0, i), (S, i)], fill=grid, width=4)
    return Image.alpha_composite(img, g)


def gradient_fill(mask, c1, c2):
    grad = Image.new("RGBA", (S, S))
    gd = ImageDraw.Draw(grad)
    for y in range(S):
        gd.line([(0, y), (S, y)], fill=lerp(c1, c2, y / S) + (255,))
    # diagonal: bland inn horisontalt også
    grad2 = Image.new("RGBA", (S, S))
    gd2 = ImageDraw.Draw(grad2)
    for x in range(S):
        gd2.line([(x, 0), (x, S)], fill=lerp(c1, c2, x / S) + (255,))
    grad = Image.blend(grad, grad2, 0.5)
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    return out


def mark(scale, accent, accent2, dot):
    """En tykk «V» med lysende kant og en gul «din tur»-prikk. scale = andel av ikonet merket fyller."""
    m = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(m)
    w = S * scale
    x0 = (S - w) / 2
    stroke = w * 0.19
    # En «F» med runde ender: loddrett strek, lang toppstrek og kortere midtstrek.
    xl = S / 2 - w * 0.3
    yt, yb, ym = S / 2 - w * 0.38, S / 2 + w * 0.38, S / 2 - w * 0.02
    segs = [((xl, yt), (xl, yb)), ((xl, yt), (xl + w * 0.56, yt)), ((xl, ym), (xl + w * 0.34, ym))]
    r = stroke / 2
    for a, b in segs:
        d.line([a, b], fill=255, width=int(stroke))
        for (cx, cy) in (a, b):
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    glow = gradient_fill(m.filter(ImageFilter.GaussianBlur(S * 0.03)), accent, accent2)
    glow.putalpha(ImageChops.multiply(glow.getchannel("A"), Image.new("L", (S, S), 150)))
    body = gradient_fill(m, accent, accent2)
    layer = Image.alpha_composite(glow, body)
    # gul «fasit»-prikk på linje med midtstreken
    dr = stroke * 0.5
    dcx, dcy = xl + w * 0.6, ym
    dm = Image.new("L", (S, S), 0)
    ImageDraw.Draw(dm).ellipse([dcx - dr, dcy - dr, dcx + dr, dcy + dr], fill=255)
    dglow = Image.new("RGBA", (S, S), dot + (0,))
    dglow.putalpha(dm.filter(ImageFilter.GaussianBlur(dr * 0.9)))
    dbody = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    dbody.paste(dot + (255,), (0, 0), dm)
    layer = Image.alpha_composite(layer, dglow)
    layer = Image.alpha_composite(layer, dbody)
    return layer


KEN = dict(bg=(7, 10, 18), glow_a=(139, 123, 255), glow_b=(77, 225, 255), grid=(120, 150, 255, 22),
           accent=(77, 225, 255), accent2=(139, 123, 255), dot=(255, 200, 87))


def icon(scale):
    t = KEN
    img = base(t["bg"], t["glow_a"], t["glow_b"], t["grid"])
    return Image.alpha_composite(img, mark(scale, t["accent"], t["accent2"], t["dot"]))


def save(img, name, px):
    img.convert("RGB").resize((px, px), Image.LANCZOS).save(os.path.join(OUT, name), optimize=True)


normal = icon(0.56)      # vanlig ikon
maskable = icon(0.46)    # Android klipper kantene, så merket må holde seg innenfor midten
save(normal, "icon-192.png", 192)
save(normal, "icon-512.png", 512)
save(maskable, "maskable-192.png", 192)
save(maskable, "maskable-512.png", 512)
save(normal, "apple-touch-icon.png", 180)
save(normal, "favicon-32.png", 32)
print("ok")
