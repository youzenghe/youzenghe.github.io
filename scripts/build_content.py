from __future__ import annotations

import json
import re
from html import escape
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CONTENT_DIR = ROOT / "content"
POSTS_DIR = CONTENT_DIR / "posts"
DATA_JS = ROOT / "js" / "data.js"
IMAGE_MARKDOWN_RE = re.compile(r'!\[(?P<alt>[^\]]*)\]\((?P<src>\S+?)(?:\s+"(?P<title>[^"]+)")?\)')


def is_animated_asset(src: str) -> bool:
    if not src or re.match(r"^https?://", src, re.I):
        return False
    normalized = src.replace("\\", "/").lstrip("/")
    while normalized.startswith("../"):
        normalized = normalized[3:]
    path = ROOT / normalized
    if not path.is_file():
        return False
    try:
        with Image.open(path) as image:
            return getattr(image, "n_frames", 1) > 1
    except Exception:
        return False


def parse_scalar(value: str):
    value = value.strip()
    if value == "":
        return ""
    if value[0:1] in {'"', "'"} and value[-1:] == value[0]:
        return value[1:-1]
    if value.startswith("[") and value.endswith("]"):
        return json.loads(value.replace("'", '"'))
    if value.lower() in {"true", "false"}:
        return value.lower() == "true"
    if re.fullmatch(r"-?\d+", value):
        return int(value)
    return value


def parse_front_matter(text: str) -> tuple[dict, str]:
    if not text.startswith("---\n"):
        return {}, text

    _, raw_meta, body = text.split("---", 2)
    meta: dict[str, object] = {}
    current_key = ""
    current_item: dict[str, object] | None = None

    for raw_line in raw_meta.splitlines():
        line = raw_line.rstrip()
        if not line.strip():
            continue
        if line.startswith("  - ") and current_key:
            value = line[4:]
            if ":" in value:
                item_key, item_value = value.split(":", 1)
                current_item = {item_key.strip(): parse_scalar(item_value.strip())}
                meta.setdefault(current_key, []).append(current_item)
            else:
                current_item = None
                meta.setdefault(current_key, []).append(parse_scalar(value))
            continue
        if line.startswith("    ") and current_item is not None:
            nested = line.strip()
            if ":" in nested:
                item_key, item_value = nested.split(":", 1)
                current_item[item_key.strip()] = parse_scalar(item_value.strip())
            continue
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()
        current_key = key
        if value:
            meta[key] = parse_scalar(value)
        else:
            meta[key] = []
        current_item = None

    return meta, body.strip()


def flush_paragraph(lines: list[str], out: list[str]) -> None:
    if not lines:
        return
    text = " ".join(line.strip() for line in lines if line.strip())
    if text:
        out.append(f"<p>{render_inline_markdown(text)}</p>")
    lines.clear()


def render_markdown_image(match: re.Match[str], block: bool = True) -> str:
    alt = escape(match.group("alt") or "")
    src = escape(match.group("src") or "")
    title = escape(match.group("title") or "")
    caption = title or alt
    if not block:
        return f'<img class="md-inline-image" src="{src}" alt="{alt}" loading="lazy" decoding="async">'
    caption_html = f"<figcaption>{caption}</figcaption>" if caption else ""
    return (
        '<figure class="md-image">'
        f'<img src="{src}" alt="{alt}" loading="lazy" decoding="async">'
        f"{caption_html}"
        "</figure>"
    )


def render_inline_markdown(text: str) -> str:
    out: list[str] = []
    last = 0
    for match in IMAGE_MARKDOWN_RE.finditer(text):
        out.append(escape(text[last:match.start()]))
        out.append(render_markdown_image(match, block=False))
        last = match.end()
    out.append(escape(text[last:]))
    return "".join(out)


def markdown_to_html(markdown: str) -> str:
    out: list[str] = []
    paragraph: list[str] = []
    code_lines: list[str] = []
    code_lang = ""
    code_file = ""
    in_code = False

    for raw_line in markdown.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if stripped.startswith("```"):
            if in_code:
                language_attr = f' class="language-{escape(code_lang)}"' if code_lang else ""
                file_attr = f' data-file="{escape(code_file)}"' if code_file else ""
                lang_attr = f' data-lang="{escape(code_lang)}"' if code_lang else ""
                caption = code_file or code_lang or "代码"
                out.append(
                    f'<figure class="code-block"{lang_attr}{file_attr}>'
                    f'<figcaption><span>{escape(caption)}</span><button type="button" class="copy-code-btn">复制</button></figcaption>'
                    f"<pre><code{language_attr}>{escape(chr(10).join(code_lines))}</code></pre>"
                    "</figure>"
                )
                code_lines.clear()
                code_lang = ""
                code_file = ""
                in_code = False
                continue

            flush_paragraph(paragraph, out)
            info = stripped[3:].strip()
            parts = info.split(maxsplit=1)
            code_lang = parts[0] if parts else ""
            code_file = parts[1] if len(parts) > 1 else ""
            in_code = True
            continue

        if in_code:
            code_lines.append(line)
            continue

        if not stripped:
            flush_paragraph(paragraph, out)
            continue
        image_match = IMAGE_MARKDOWN_RE.fullmatch(stripped)
        if image_match:
            flush_paragraph(paragraph, out)
            out.append(render_markdown_image(image_match))
            continue
        if stripped.startswith("## "):
            flush_paragraph(paragraph, out)
            out.append(f"<h2>{escape(stripped[3:].strip())}</h2>")
            continue
        if stripped.startswith("### "):
            flush_paragraph(paragraph, out)
            out.append(f"<h3>{escape(stripped[4:].strip())}</h3>")
            continue
        if stripped.startswith("> "):
            flush_paragraph(paragraph, out)
            out.append(f"<blockquote>{escape(stripped[2:].strip())}</blockquote>")
            continue
        paragraph.append(stripped)

    if in_code:
        language_attr = f' class="language-{escape(code_lang)}"' if code_lang else ""
        out.append(f"<pre><code{language_attr}>{escape(chr(10).join(code_lines))}</code></pre>")
    flush_paragraph(paragraph, out)
    return "\n      ".join(out)


def normalize_bool(value, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    return str(value).strip().lower() in {"true", "yes", "1", "on"}


def normalize_image_item(item) -> dict:
    if isinstance(item, dict):
        src = str(item.get("image") or item.get("src") or item.get("url") or "")
        return {
            "src": src,
            "alt": str(item.get("alt") or ""),
            "caption": str(item.get("caption") or ""),
            "isCover": normalize_bool(item.get("isCover"), False),
        }
    return {
        "src": str(item),
        "alt": "",
        "caption": "",
        "isCover": False,
    }


def normalize_images(items) -> list[dict]:
    if not isinstance(items, list):
        return []
    return [image for image in (normalize_image_item(item) for item in items) if image["src"]]


def load_posts() -> list[dict]:
    posts = []
    for path in sorted(POSTS_DIR.glob("*.md")):
        meta, body = parse_front_matter(path.read_text(encoding="utf-8"))
        status = str(meta.get("status", "published"))
        if status == "draft":
            continue
        images = normalize_images(meta.get("images", []))
        post = {
            "id": int(meta["id"]),
            "title": str(meta["title"]),
            "cat": str(meta["cat"]),
            "catColor": str(meta.get("catColor", "#52e0e0")),
            "date": str(meta["date"]),
            "updatedAt": str(meta.get("updatedAt", meta["date"])),
            "status": status,
            "featured": normalize_bool(meta.get("featured"), False),
            "pinned": normalize_bool(meta.get("pinned"), False),
            "readTime": int(meta.get("readTime", 3)),
            "emoji": str(meta.get("emoji", "📝")),
            "cover": str(meta.get("cover", "")),
            "coverAnimated": is_animated_asset(str(meta.get("cover", ""))),
            "images": images,
            "series": str(meta.get("series", meta.get("cat", ""))),
            "excerpt": str(meta.get("excerpt", "")),
            "tags": list(meta.get("tags", [])),
            "relatedPosts": [int(item) for item in meta.get("relatedPosts", []) if str(item).strip()],
            "seo": {
                "title": str(meta.get("metaTitle", "")),
                "description": str(meta.get("metaDescription", "")),
                "image": str(meta.get("ogImage", "")),
                "canonical": str(meta.get("canonical", "")),
            },
            "content": markdown_to_html(body),
        }
        posts.append(post)
    return sorted(posts, key=lambda item: (item["pinned"], item["date"], item["id"]), reverse=True)


def read_json(name: str):
    path = CONTENT_DIR / name
    return json.loads(path.read_text(encoding="utf-8"))


def load_projects() -> list[dict]:
    projects = []
    for project in read_json("projects.json")["projects"]:
        item = dict(project)
        item["status"] = str(item.get("status", "已完成"))
        item["role"] = str(item.get("role", ""))
        item["links"] = item.get("links", [])
        item["highlights"] = item.get("highlights", [])
        item["challenges"] = item.get("challenges", [])
        item["result"] = str(item.get("result", ""))
        item["images"] = normalize_images(item.get("images", []))
        item.setdefault("detail", "")
        if not item["images"] and item.get("img"):
            item["images"] = [normalize_image_item(item["img"])]
        if item["detail"]:
            item["detail"] = markdown_to_html(str(item["detail"]))
        projects.append(item)
    return projects


def write_data_js(
    posts: list[dict],
    projects: list[dict],
    games: list[dict],
    friend_links: list[dict],
    changelog: list[dict],
) -> None:
    payload = (
        "const POSTS = "
        + json.dumps(posts, ensure_ascii=False, indent=2)
        + ";\n\nconst PROJECTS = "
        + json.dumps(projects, ensure_ascii=False, indent=2)
        + ";\n\nconst GAMES = "
        + json.dumps(games, ensure_ascii=False, indent=2)
        + ";\n\nconst FRIEND_LINKS = "
        + json.dumps(friend_links, ensure_ascii=False, indent=2)
        + ";\n\nconst CHANGELOG = "
        + json.dumps(changelog, ensure_ascii=False, indent=2)
        + ";\n\nconst SITE_DATA = Object.freeze({\n"
        + "  posts: POSTS,\n"
        + "  projects: PROJECTS,\n"
        + "  games: GAMES,\n"
        + "  friendLinks: FRIEND_LINKS,\n"
        + "  changelog: CHANGELOG,\n"
        + "});\n\nwindow.SITE_DATA = SITE_DATA;\n"
    )
    DATA_JS.write_text(payload, encoding="utf-8")


def main() -> None:
    write_data_js(
        load_posts(),
        load_projects(),
        read_json("games.json")["games"],
        read_json("friend-links.json")["friendLinks"],
        read_json("changelog.json")["changelog"],
    )


if __name__ == "__main__":
    main()
