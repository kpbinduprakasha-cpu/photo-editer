from pathlib import Path
from PIL import Image, ImageDraw

sample_dir = Path(__file__).parent / "sample_photos"
sample_dir.mkdir(parents=True, exist_ok=True)

# 1. Sunset Landscape (1920x1080)
img1 = Image.new("RGB", (1920, 1080), (240, 120, 40))
draw1 = ImageDraw.Draw(img1)
draw1.rectangle([0, 700, 1920, 1080], fill=(20, 40, 80))
draw1.ellipse([800, 450, 1120, 770], fill=(255, 220, 100))
img1.save(sample_dir / "photo1_sunset.jpg", quality=95)

# 2. City Skyline (1080x1920 portrait)
img2 = Image.new("RGB", (1080, 1920), (15, 20, 40))
draw2 = ImageDraw.Draw(img2)
draw2.rectangle([100, 800, 350, 1920], fill=(30, 40, 70))
draw2.rectangle([400, 600, 700, 1920], fill=(45, 60, 95))
draw2.rectangle([750, 900, 1000, 1920], fill=(25, 35, 60))
img2.save(sample_dir / "photo2_city.jpg", quality=95)

# 3. Candid Nature (1080x1080 square)
img3 = Image.new("RGB", (1080, 1080), (35, 120, 65))
draw3 = ImageDraw.Draw(img3)
draw3.ellipse([300, 300, 780, 780], fill=(60, 180, 100))
img3.save(sample_dir / "photo3_nature.jpg", quality=95)

print("Generated sample photos at:", sample_dir)
