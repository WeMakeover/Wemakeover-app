from PIL import Image, ImageSequence
from pathlib import Path

src = Path(r"d:\Wemakeover-app\wemakeover-rn\assets\booking\status-success.gif")
out = Path(r"d:\Wemakeover-app\wemakeover-rn\assets\booking\status-success-transparent.gif")

im = Image.open(src)
frames = []
durations = []
THRESH = 35

for frame in ImageSequence.Iterator(im):
    rgba = frame.convert("RGBA")
    pixels = list(rgba.getdata())
    cleaned = []
    for r, g, b, a in pixels:
        if r <= THRESH and g <= THRESH and b <= THRESH:
            cleaned.append((0, 0, 0, 0))
        else:
            cleaned.append((r, g, b, 255))
    out_frame = Image.new("RGBA", rgba.size)
    out_frame.putdata(cleaned)

    # Build palette GIF frame with transparency index 0
    alpha = out_frame.getchannel("A")
    rgb = out_frame.convert("RGB")
    pal = rgb.convert("P", palette=Image.ADAPTIVE, colors=255)

    # Remap near-transparent pixels to index 0
    transparent = Image.new("P", pal.size)
    transparent.putpalette([0, 0, 0] + list(pal.getpalette() or [])[:765])
    # Create mask where alpha is low
    mask = alpha.point(lambda v: 255 if v < 128 else 0)
    # Paste current pal onto transparent canvas, then set transparent pixels to 0
    data = list(pal.getdata())
    mask_data = list(mask.getdata())
    for i, m in enumerate(mask_data):
        if m:
            data[i] = 0
    pal.putdata(data)
    pal.info["transparency"] = 0

    frames.append(pal)
    durations.append(max(frame.info.get("duration", 40), 20))

frames[0].save(
    out,
    save_all=True,
    append_images=frames[1:],
    duration=durations,
    loop=0,
    disposal=2,
    transparency=0,
)
print("saved", out, "frames", len(frames), "bytes", out.stat().st_size)
