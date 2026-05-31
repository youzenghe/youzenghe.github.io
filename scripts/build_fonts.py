"""从站点实际用到的字符子集思源黑，生成自托管 woff2。

中文网络字体很大（全量 7MB+），且依赖的公共 CDN 在国内不稳定，会导致字体
加载失败、退回系统字体（如微软雅黑），与设计稿不一致。这里扫描站点所有文本里
出现过的字符，把思源黑（Noto Sans SC）子集成小体积 woff2（每字重约 200KB），
放在 assets/fonts/ 自托管，与站点同域、国内加载快且稳定。

源字体放在 assets/fonts/__src/（以 __ 开头，构建脚本 build_dist 会跳过、不上线）。
每次运行都会重新扫描 content/pages/js 里的字符，所以新增文章用到的字会自动包含
进来，不会缺字。

用法：python scripts/build_fonts.py
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "assets" / "fonts" / "__src"
OUT_DIR = ROOT / "assets" / "fonts"

# 收集站点字符的文件范围
TEXT_GLOBS = [
    "content/**/*.md",
    "content/*.json",
    "*.html",
    "pages/*.html",
    "js/*.js",
    "js/pages/*.js",
]

# 常用中文标点，避免标点缺字
PUNCT = "，。、；：？！“”‘’（）《》【】—…·～「」￥％°"


def collect_chars() -> str:
    chars: set[str] = set()
    for pattern in TEXT_GLOBS:
        for path in ROOT.glob(pattern):
            try:
                chars |= set(path.read_text(encoding="utf-8"))
            except Exception:
                pass
    chars |= {chr(c) for c in range(0x20, 0x7F)}  # 基本 ASCII（拉丁/数字/符号）
    chars |= set(PUNCT)
    return "".join(sorted(chars))


def subset(src: Path, dst: Path, text: str) -> None:
    from fontTools.subset import Options, Subsetter
    from fontTools.ttLib import TTFont

    options = Options()
    options.flavor = "woff2"
    options.desubroutinize = True
    options.layout_features = ["*"]
    options.name_IDs = ["*"]

    font = TTFont(str(src))
    subsetter = Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    dst.parent.mkdir(parents=True, exist_ok=True)
    font.save(str(dst))


def main() -> int:
    pairs = [
        (SRC_DIR / "noto-sans-sc-400.ttf", OUT_DIR / "noto-sans-sc-400.woff2"),
        (SRC_DIR / "noto-sans-sc-700.ttf", OUT_DIR / "noto-sans-sc-700.woff2"),
    ]

    if not all(src.exists() for src, _ in pairs):
        print("[build_fonts] 源字体缺失（assets/fonts/__src/），跳过子集，保留已有 woff2")
        return 0

    text = collect_chars()
    cjk = sum(1 for c in text if "一" <= c <= "鿿")
    print(f"[build_fonts] 收集字符 {len(text)} 个（其中汉字 {cjk}）")

    for src, dst in pairs:
        subset(src, dst, text)
        print(f"[build_fonts] {dst.relative_to(ROOT)}  {dst.stat().st_size / 1024:.0f}KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
