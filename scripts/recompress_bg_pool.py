"""背景图池二次压缩。

背景图在页面里被 #bg-layer 的 filter: brightness(0.3) + 卡片 blur 大幅压暗、
模糊，肉眼几乎看不清原始细节，因此完全不需要高分辨率/高质量。本脚本对仓库中
已有的 WebP 背景图做原地「降分辨率 + 降质」，显著减小体积。

原图已纳入 git，若对效果不满意可用 `git checkout -- assets/bg-pool` 还原。

⚠️ 这是一次性脚本，请勿接入 CI/构建流程：它是原地有损压缩，重复运行会让
   背景图反复二次降质、画质持续劣化。只在需要（新增/替换背景图）时手动运行。

用法:
  python scripts/recompress_bg_pool.py --dry-run     # 只报告预计收益，不改文件
  python scripts/recompress_bg_pool.py --limit 5     # 每个目录只处理前 N 张（验证用）
  python scripts/recompress_bg_pool.py               # 实际全量压缩
"""
from __future__ import annotations

import argparse
import os
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BG_ROOT = ROOT / "assets" / "bg-pool"

# (子目录, 目标最大宽度, WebP 质量)
TARGETS = [
    ("pc", 1440, 60),
    ("mobile", 720, 55),
]

# 至少要省下这个比例才替换，避免把本就很小的图越压越糟。
MIN_SAVING_RATIO = 0.92


def recompress(path: Path, max_width: int, quality: int, dry_run: bool) -> tuple[int, int, bool]:
    before = path.stat().st_size
    with Image.open(path) as image:
        image = image.convert("RGB")
        if image.width > max_width:
            new_height = round(image.height * max_width / image.width)
            image = image.resize((max_width, new_height), Image.Resampling.LANCZOS)

        fd, temp_name = tempfile.mkstemp(prefix=f".{path.stem}-", suffix=".webp", dir=str(path.parent))
        os.close(fd)
        temp_path = Path(temp_name)
        try:
            image.save(temp_path, "WEBP", quality=quality, method=6)
            after = temp_path.stat().st_size
            if after >= before * MIN_SAVING_RATIO:
                return before, before, False
            if not dry_run:
                os.replace(temp_path, path)
                temp_path = None  # 已被移动
            return before, after, True
        finally:
            if temp_path is not None:
                temp_path.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Recompress background pool WebP images in place.")
    parser.add_argument("--dry-run", action="store_true", help="只报告预计收益，不修改文件。")
    parser.add_argument("--limit", type=int, default=0, help="每个目录只处理前 N 张（0 表示全部）。")
    args = parser.parse_args()

    grand_before = grand_after = 0
    for sub, max_width, quality in TARGETS:
        directory = BG_ROOT / sub
        files = sorted(directory.glob("*.webp"))
        if args.limit:
            files = files[: args.limit]

        total_before = total_after = changed = 0
        for path in files:
            before, after, did_change = recompress(path, max_width, quality, args.dry_run)
            total_before += before
            total_after += after
            changed += 1 if did_change else 0

        grand_before += total_before
        grand_after += total_after
        verb = "would change" if args.dry_run else "changed"
        print(
            f"[{sub}] files={len(files)} {verb}={changed} "
            f"{total_before / 1024 / 1024:.1f}MB -> {total_after / 1024 / 1024:.1f}MB"
        )

    if grand_before:
        saved = grand_before - grand_after
        print(
            f"[total] {grand_before / 1024 / 1024:.1f}MB -> {grand_after / 1024 / 1024:.1f}MB "
            f"saved {saved / 1024 / 1024:.1f}MB ({saved / grand_before * 100:.0f}%)"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
