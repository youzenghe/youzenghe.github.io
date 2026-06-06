from __future__ import annotations

import argparse
import os
import tempfile
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
UPLOAD_DIR = ROOT / "assets" / "uploads"
SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_DIMENSION = 1800
JPEG_QUALITY = 82
WEBP_QUALITY = 82
MIN_SAVING_RATIO = 0.96


def iter_images(root: Path):
    if not root.exists():
        return
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            yield path


def resized(image: Image.Image) -> Image.Image:
    width, height = image.size
    longest = max(width, height)
    if longest <= MAX_DIMENSION:
        return image
    scale = MAX_DIMENSION / longest
    size = (max(1, round(width * scale)), max(1, round(height * scale)))
    return image.resize(size, Image.Resampling.LANCZOS)


def save_optimized(image: Image.Image, path: Path, target: Path) -> None:
    suffix = path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        if image.mode not in {"RGB", "L"}:
            image = image.convert("RGB")
        image.save(target, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        return

    if suffix == ".png":
        image.save(target, "PNG", optimize=True, compress_level=9)
        return

    if suffix == ".webp":
        image.save(target, "WEBP", quality=WEBP_QUALITY, method=6)
        return

    raise ValueError(f"Unsupported image extension: {path.suffix}")


def optimize_image(path: Path, dry_run: bool = False) -> tuple[bool, int, int]:
    before = path.stat().st_size
    with Image.open(path) as source:
        # 跳过多帧动图（如动画 WebP/PNG）：这里的保存流程只会写出单帧，
        # 会丢失动画，因此交给专门的转换脚本处理。
        if getattr(source, "n_frames", 1) > 1:
            return False, before, before
        image = ImageOps.exif_transpose(source)
        image = resized(image)

        fd, temp_name = tempfile.mkstemp(prefix=f".{path.stem}-", suffix=path.suffix, dir=path.parent)
        os.close(fd)
        temp_path = Path(temp_name)
        try:
            save_optimized(image, path, temp_path)
            after = temp_path.stat().st_size
            if after >= before * MIN_SAVING_RATIO:
                temp_path.unlink(missing_ok=True)
                return False, before, before

            if dry_run:
                temp_path.unlink(missing_ok=True)
            else:
                os.replace(temp_path, path)
            return True, before, after
        finally:
            temp_path.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Optimize non-GIF images in assets/uploads.")
    parser.add_argument("--dry-run", action="store_true", help="Report possible savings without modifying files.")
    parser.add_argument("--root", type=Path, default=UPLOAD_DIR, help="Image directory to optimize.")
    args = parser.parse_args()

    changed = 0
    saved = 0
    scanned = 0
    for path in iter_images(args.root):
        scanned += 1
        try:
            did_change, before, after = optimize_image(path, dry_run=args.dry_run)
        except Exception as error:
            print(f"optimize_failed {path.relative_to(ROOT)} {error}")
            continue
        if did_change:
            changed += 1
            saved += before - after
            mode = "would_optimize" if args.dry_run else "optimized"
            print(f"{mode} {path.relative_to(ROOT)} {before} -> {after}")

    print(f"image_optimization_done scanned={scanned} changed={changed} saved={saved}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
