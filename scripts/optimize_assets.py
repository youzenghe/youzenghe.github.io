from __future__ import annotations

from io import BytesIO
from pathlib import Path

from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True

ROOT = Path(__file__).resolve().parents[1]

RULES = [
    ("assets/projects/*.png", 1600, 82),
    ("assets/posts/*.jpg", 1200, 82),
    ("assets/game1.png", 1600, 82),
]


def iter_targets():
    for pattern, max_width, quality in RULES:
        for path in ROOT.glob(pattern):
            if path.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
                continue
            yield path, max_width, quality


def convert_to_webp(src: Path, max_width: int, quality: int) -> tuple[Path, int, int]:
    dst = src.with_suffix(".webp")

    with Image.open(src) as image:
        has_alpha = "A" in image.getbands()
        mode = "RGBA" if has_alpha else "RGB"
        image = image.convert(mode)

        if image.width > max_width:
            new_height = round(image.height * max_width / image.width)
            image = image.resize((max_width, new_height), Image.Resampling.LANCZOS)

        temp = BytesIO()
        image.save(temp, format="WEBP", quality=quality, method=6)
        new_bytes = temp.getvalue()

    dst.write_bytes(new_bytes)
    return dst, src.stat().st_size, len(new_bytes)


def main() -> None:
    converted = []
    for src, max_width, quality in iter_targets():
        dst, before, after = convert_to_webp(src, max_width, quality)
        converted.append((src, dst, before, after))

    for src, dst, before, after in converted:
        print(f"{src.relative_to(ROOT)} -> {dst.relative_to(ROOT)} | {before} -> {after}")


if __name__ == "__main__":
    main()
