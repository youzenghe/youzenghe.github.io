"""
将GIF头像转换为圆形favicon
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

# 配置
SOURCE_GIF = Path(__file__).resolve().parents[1] / "assets" / "avatar.gif"
TARGET_DIR = Path(__file__).resolve().parents[1] / "assets"
TARGET_PNG = TARGET_DIR / "favicon.png"
TARGET_ICO = TARGET_DIR / "favicon.ico"

# Favicon尺寸
FAVICON_SIZE = 64  # 64x64像素


def create_circular_mask(size):
    """创建圆形遮罩"""
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    return mask


def convert_to_circular_favicon(source: Path, target_png: Path, target_ico: Path) -> None:
    """
    将GIF转换为圆形favicon
    """
    print(f"正在转换: {source.name}")
    print(f"目标尺寸: {FAVICON_SIZE}x{FAVICON_SIZE}")
    print()

    try:
        with Image.open(source) as img:
            # 获取第一帧
            img.seek(0)

            # 转换为RGBA模式
            if img.mode != 'RGBA':
                img = img.convert('RGBA')

            # 调整大小为正方形
            img = ImageOps.fit(img, (FAVICON_SIZE, FAVICON_SIZE), Image.Resampling.LANCZOS)

            # 创建圆形遮罩
            mask = create_circular_mask(FAVICON_SIZE)

            # 创建透明背景
            output = Image.new('RGBA', (FAVICON_SIZE, FAVICON_SIZE), (0, 0, 0, 0))
            output.paste(img, (0, 0))
            output.putalpha(mask)

            # 保存为PNG
            output.save(target_png, 'PNG', optimize=True)
            png_size = target_png.stat().st_size
            print(f"已生成PNG: {target_png.name} ({png_size / 1024:.2f} KB)")

            # 保存为ICO（多尺寸）
            # ICO格式支持16x16, 32x32, 48x48等多种尺寸
            sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
            ico_images = []

            for size in sizes:
                resized = output.resize(size, Image.Resampling.LANCZOS)
                ico_images.append(resized)

            ico_images[0].save(
                target_ico,
                format='ICO',
                sizes=[(img.width, img.height) for img in ico_images],
                append_images=ico_images[1:]
            )
            ico_size = target_ico.stat().st_size
            print(f"已生成ICO: {target_ico.name} ({ico_size / 1024:.2f} KB)")
            print()

            print("=" * 60)
            print("转换完成！")
            print("=" * 60)
            print(f"PNG favicon: {target_png}")
            print(f"ICO favicon: {target_ico}")
            print()
            print("下一步:")
            print("1. 检查生成的favicon是否为圆形")
            print("2. 妹妹会帮你更新HTML文件中的引用")

    except Exception as error:
        print(f"转换失败: {error}")


def main() -> None:
    print("=" * 60)
    print("Favicon转换工具")
    print("=" * 60)
    print()

    if not SOURCE_GIF.exists():
        print(f"错误: 源文件不存在: {SOURCE_GIF}")
        return

    convert_to_circular_favicon(SOURCE_GIF, TARGET_PNG, TARGET_ICO)


if __name__ == "__main__":
    main()
