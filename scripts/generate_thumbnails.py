from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True

ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "assets"
THUMB_ROOT = ASSET_ROOT / "thumbs"

PATTERNS = [
    "posts/*",
    "projects/*",
    "uploads/*",
    "game1.webp",
]

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
MAX_WIDTH = 640
QUALITY = 72


def iter_images():
    for pattern in PATTERNS:
        for path in ASSET_ROOT.glob(pattern):
            if not path.is_file() or path.suffix.lower() not in IMAGE_SUFFIXES:
                continue
            yield path


def make_thumbnail(src: Path) -> tuple[Path, int, int]:
    rel = src.relative_to(ASSET_ROOT)
    dst = (THUMB_ROOT / rel).with_suffix(".webp")
    dst.parent.mkdir(parents=True, exist_ok=True)

    with Image.open(src) as image:
        has_alpha = "A" in image.getbands()
        image = image.convert("RGBA" if has_alpha else "RGB")
        if image.width > MAX_WIDTH:
            new_height = round(image.height * MAX_WIDTH / image.width)
            image = image.resize((MAX_WIDTH, new_height), Image.Resampling.LANCZOS)
        image.save(dst, format="WEBP", quality=QUALITY, method=6)

    return dst, src.stat().st_size, dst.stat().st_size


def main() -> None:
    results = [make_thumbnail(path) for path in iter_images()]
    for dst, before, after in results:
        print(f"{dst.relative_to(ROOT)} | {before} -> {after}")


if __name__ == "__main__":
    main()
