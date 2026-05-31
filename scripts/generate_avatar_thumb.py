"""生成页面用的小尺寸动态头像。

assets/avatar.webp 是 800x800、多帧动画，体积约 480KB，但页面里头像
只显示 100~120px。这里把它缩成 160px 的动画 WebP（保留动画），用于
首页 about-strip 和关于页头像；社交分享用的 og:image 仍引用原始高清图。
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "avatar.webp"
DST = ROOT / "assets" / "avatar-sm.webp"

SIZE = 160      # 显示约 120px，2x 已足够清晰
QUALITY = 72


def main() -> None:
    with Image.open(SRC) as im:
        frames = []
        for frame in ImageSequence.Iterator(im):
            fr = frame.convert("RGBA")
            if fr.width > SIZE:
                new_height = round(fr.height * SIZE / fr.width)
                fr = fr.resize((SIZE, new_height), Image.Resampling.LANCZOS)
            frames.append(fr)
        duration = im.info.get("duration", 100)
        loop = im.info.get("loop", 0)

    frames[0].save(
        DST,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=duration,
        loop=loop,
        quality=QUALITY,
        method=6,
    )

    before = SRC.stat().st_size
    after = DST.stat().st_size
    saved = (1 - after / before) * 100
    print(f"{SRC.name} {before} -> {DST.name} {after} ({saved:.1f}% saved, {len(frames)} frames)")


if __name__ == "__main__":
    main()
