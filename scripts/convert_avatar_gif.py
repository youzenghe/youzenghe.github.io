"""
将GIF头像转换为WebP动图
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image

# 配置
SOURCE_GIF = Path(r"C:\Users\ASUS\Downloads\4-1-15-98-crop.gif")
TARGET_DIR = Path(__file__).resolve().parents[1] / "assets"
TARGET_WEBP = TARGET_DIR / "avatar.webp"
BACKUP_GIF = TARGET_DIR / "avatar.gif"

# WebP质量设置
WEBP_QUALITY = 80
WEBP_METHOD = 6  # 0-6，6最慢但压缩最好


def convert_gif_to_webp(source: Path, target: Path, quality: int = 80) -> tuple[int, int]:
    """
    将GIF转换为WebP动图
    返回: (原始大小, 转换后大小)
    """
    before_size = source.stat().st_size

    print(f"正在转换: {source.name}")
    print(f"原始大小: {before_size / 1024:.2f} KB")

    try:
        with Image.open(source) as img:
            # 保存为WebP动图
            img.save(
                target,
                "WEBP",
                save_all=True,  # 保存所有帧
                quality=quality,
                method=WEBP_METHOD,
                lossless=False,
            )

        after_size = target.stat().st_size
        compression_ratio = (1 - after_size / before_size) * 100

        print(f"转换后大小: {after_size / 1024:.2f} KB")
        print(f"压缩率: {compression_ratio:.1f}%")

        return before_size, after_size

    except Exception as error:
        print(f"转换失败: {error}")
        return before_size, before_size


def main() -> None:
    print("=" * 60)
    print("GIF头像转换工具")
    print("=" * 60)
    print()

    if not SOURCE_GIF.exists():
        print(f"错误: 源文件不存在: {SOURCE_GIF}")
        return

    # 备份原GIF到assets目录
    print("1. 备份原始GIF...")
    import shutil
    shutil.copy2(SOURCE_GIF, BACKUP_GIF)
    print(f"   已备份到: {BACKUP_GIF}")
    print()

    # 转换为WebP
    print("2. 转换为WebP动图...")
    before, after = convert_gif_to_webp(SOURCE_GIF, TARGET_WEBP, WEBP_QUALITY)
    print()

    if after < before:
        print("=" * 60)
        print("转换完成！")
        print("=" * 60)
        print(f"输出文件: {TARGET_WEBP}")
        print(f"节省空间: {(before - after) / 1024:.2f} KB")
        print()
        print("下一步:")
        print("1. 检查 assets/avatar.webp 动画效果")
        print("2. 如果满意，妹妹会帮你更新所有引用")
    else:
        print("警告: 转换后文件更大，建议使用原GIF")


if __name__ == "__main__":
    main()
