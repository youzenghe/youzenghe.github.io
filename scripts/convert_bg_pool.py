"""
背景图片池转换脚本
将桌面壁纸转换为适合网站展示的WebP格式
"""
from __future__ import annotations

import shutil
from pathlib import Path
from PIL import Image, ImageOps

# 配置
SOURCE_DIR = Path(r"C:\Users\ASUS\Desktop\wallpapers")
TARGET_DIR = Path(__file__).resolve().parents[1] / "assets" / "bg-pool"

# 桌面端配置
DESKTOP_SOURCE = SOURCE_DIR / "desktop"
DESKTOP_TARGET = TARGET_DIR / "pc"
DESKTOP_MAX_WIDTH = 1920
DESKTOP_MAX_HEIGHT = 1080
DESKTOP_QUALITY = 85

# 移动端配置
MOBILE_SOURCE = SOURCE_DIR / "mobile"
MOBILE_TARGET = TARGET_DIR / "mobile"
MOBILE_MAX_WIDTH = 1080
MOBILE_MAX_HEIGHT = 1920
MOBILE_QUALITY = 85

# 支持的输入格式
SUPPORTED_FORMATS = {".jpg", ".jpeg", ".png", ".webp"}


def resize_image(image: Image.Image, max_width: int, max_height: int) -> Image.Image:
    """
    调整图片大小，保持宽高比
    """
    width, height = image.size

    # 如果图片已经小于目标尺寸，不放大
    if width <= max_width and height <= max_height:
        return image

    # 计算缩放比例
    width_ratio = max_width / width
    height_ratio = max_height / height
    ratio = min(width_ratio, height_ratio)

    new_width = max(1, round(width * ratio))
    new_height = max(1, round(height * ratio))

    return image.resize((new_width, new_height), Image.Resampling.LANCZOS)


def convert_image(
    source_path: Path,
    target_path: Path,
    max_width: int,
    max_height: int,
    quality: int,
) -> tuple[int, int]:
    """
    转换单张图片为WebP格式
    返回: (原始大小, 转换后大小)
    """
    before_size = source_path.stat().st_size

    try:
        with Image.open(source_path) as img:
            # 自动旋转EXIF方向
            img = ImageOps.exif_transpose(img)

            # 转换为RGB模式（WebP不支持某些模式）
            if img.mode in ("RGBA", "LA"):
                # 保留透明通道
                pass
            elif img.mode != "RGB":
                img = img.convert("RGB")

            # 调整大小
            img = resize_image(img, max_width, max_height)

            # 保存为WebP
            img.save(target_path, "WEBP", quality=quality, method=6)

        after_size = target_path.stat().st_size
        return before_size, after_size

    except Exception as error:
        print(f"  ❌ 转换失败: {error}")
        return before_size, before_size


def process_directory(
    source_dir: Path,
    target_dir: Path,
    max_width: int,
    max_height: int,
    quality: int,
    device_type: str,
) -> None:
    """
    处理整个目录的图片
    """
    if not source_dir.exists():
        print(f"❌ 源目录不存在: {source_dir}")
        return

    # 创建目标目录
    target_dir.mkdir(parents=True, exist_ok=True)

    # 获取所有图片文件
    image_files = [
        f for f in source_dir.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED_FORMATS
    ]

    if not image_files:
        print(f"⚠️  {device_type} 目录中没有找到图片")
        return

    print(f"\n{'='*60}")
    print(f"处理 {device_type} 图片")
    print(f"{'='*60}")
    print(f"源目录: {source_dir}")
    print(f"目标目录: {target_dir}")
    print(f"图片数量: {len(image_files)}")
    print(f"最大尺寸: {max_width}x{max_height}")
    print(f"质量: {quality}")
    print()

    total_before = 0
    total_after = 0
    success_count = 0

    for i, source_path in enumerate(sorted(image_files), 1):
        # 生成目标文件名: bg1.webp, bg2.webp, ...
        target_path = target_dir / f"bg{i}.webp"

        print(f"[{i}/{len(image_files)}] {source_path.name}")
        print(f"  原始大小: {source_path.stat().st_size / 1024 / 1024:.2f} MB")

        before, after = convert_image(
            source_path, target_path, max_width, max_height, quality
        )

        if after < before:
            total_before += before
            total_after += after
            success_count += 1

            compression_ratio = (1 - after / before) * 100
            print(f"  转换后: {after / 1024:.2f} KB (压缩 {compression_ratio:.1f}%)")
            print(f"  → {target_path.name}")
        else:
            print(f"  转换后文件更大，跳过")

    print(f"\n{'='*60}")
    print(f"{device_type} 处理完成")
    print(f"{'='*60}")
    print(f"成功转换: {success_count}/{len(image_files)}")
    print(f"总大小: {total_before / 1024 / 1024:.2f} MB → {total_after / 1024 / 1024:.2f} MB")
    print(f"节省空间: {(total_before - total_after) / 1024 / 1024:.2f} MB")
    print(f"压缩率: {(1 - total_after / total_before) * 100:.1f}%")
    print()


def main() -> None:
    print("背景图片池转换工具")
    print("=" * 60)

    # 检查源目录
    if not SOURCE_DIR.exists():
        print(f"❌ 源目录不存在: {SOURCE_DIR}")
        return

    # 处理桌面端图片
    process_directory(
        DESKTOP_SOURCE,
        DESKTOP_TARGET,
        DESKTOP_MAX_WIDTH,
        DESKTOP_MAX_HEIGHT,
        DESKTOP_QUALITY,
        "桌面端",
    )

    # 处理移动端图片
    process_directory(
        MOBILE_SOURCE,
        MOBILE_TARGET,
        MOBILE_MAX_WIDTH,
        MOBILE_MAX_HEIGHT,
        MOBILE_QUALITY,
        "移动端",
    )

    print("=" * 60)
    print("全部完成！")
    print("=" * 60)
    print(f"输出目录: {TARGET_DIR}")
    print()
    print("下一步:")
    print("1. 检查生成的图片质量")
    print("2. 修改 js/main.js 配置图片池路径")
    print("3. 提交到Git并部署")


if __name__ == "__main__":
    main()
