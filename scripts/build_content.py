from __future__ import annotations

import json
import re
from html import escape
from pathlib import Path
from urllib.parse import unquote

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CONTENT_DIR = ROOT / "content"
POSTS_DIR = CONTENT_DIR / "posts"
DATA_JS = ROOT / "js" / "data.js"
DATA_CORE_JS = ROOT / "js" / "data-core.js"
DATA_POSTS_JS = ROOT / "js" / "data-posts.js"
DATA_PROJECTS_JS = ROOT / "js" / "data-projects.js"
DATA_LEARNING_JS = ROOT / "js" / "data-learning.js"
IMAGE_MARKDOWN_RE = re.compile(r'!\[(?P<alt>[^\]]*)\]\((?P<src>\S+?)(?:\s+"(?P<title>[^"]+)")?\)')
LINK_MARKDOWN_RE = re.compile(r'(?<!!)\[(?P<label>[^\]]+)\]\((?P<href>[^)\s]+)\)')
MOTION_POST_COVERS = {
    "001": "../assets/motion/posts/post-ai-contest.webp",
    "002": "../assets/uploads/流萤1.webp",
    "003": "../assets/motion/posts/post-algorithm.webp",
    "004": "../assets/motion/posts/post-internship.webp",
    "005": "../assets/motion/posts/post-adoption.webp",
    "006": "../assets/motion/posts/post-face.webp",
    "007": "../assets/motion/posts/post-galgame.webp",
}
MOTION_PROJECT_IMAGES = {
    1: "../assets/motion/projects/project-legalmind.webp",
    2: "../assets/motion/projects/project-moment-henan.webp",
    3: "../assets/motion/projects/project-fuguang.webp",
    4: "../assets/motion/projects/project-law-contract.webp",
    5: "../assets/motion/projects/project-green-credit.webp",
    6: "../assets/motion/projects/project-quanyi.webp",
    7: "../assets/motion/projects/project-literary-map.webp",
    8: "../assets/motion/projects/project-poem.webp",
}


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
    text = text.lstrip("\ufeff").replace("\r\n", "\n")
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
        out.append(render_inline_text(text[last:match.start()]))
        out.append(render_markdown_image(match, block=False))
        last = match.end()
    out.append(render_inline_text(text[last:]))
    return "".join(out)


def render_inline_text(text: str) -> str:
    rendered = escape(text)

    def render_link(match: re.Match[str]) -> str:
        label = match.group("label")
        href = match.group("href")
        safe_href = escape(href, quote=True)
        return f'<a href="{safe_href}">{label}</a>'

    rendered = LINK_MARKDOWN_RE.sub(render_link, rendered)
    rendered = re.sub(r"`([^`]+)`", r"<code>\1</code>", rendered)
    rendered = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", rendered)
    rendered = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", rendered)
    return rendered


def flush_list(list_type: str, items: list[str], out: list[str]) -> str:
    if not items:
        return ""
    rendered_items = "".join(f"<li>{render_inline_markdown(item)}</li>" for item in items)
    out.append(f"<{list_type}>{rendered_items}</{list_type}>")
    items.clear()
    return ""


def is_table_separator(row: str) -> bool:
    cells = [cell.strip() for cell in row.strip().strip("|").split("|")]
    return bool(cells) and all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells)


def split_table_row(row: str) -> list[str]:
    return [cell.strip() for cell in row.strip().strip("|").split("|")]


def flush_table(rows: list[str], out: list[str]) -> None:
    if not rows:
        return
    if len(rows) < 2 or not is_table_separator(rows[1]):
        for row in rows:
            out.append(f"<p>{render_inline_markdown(row)}</p>")
        rows.clear()
        return

    headers = split_table_row(rows[0])
    body_rows = [split_table_row(row) for row in rows[2:]]
    head = "".join(f"<th>{render_inline_markdown(cell)}</th>" for cell in headers)
    body = "".join(
        "<tr>" + "".join(f"<td>{render_inline_markdown(cell)}</td>" for cell in row) + "</tr>"
        for row in body_rows
    )
    out.append(f'<div class="md-table"><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>')
    rows.clear()


def markdown_to_html(markdown: str) -> str:
    out: list[str] = []
    paragraph: list[str] = []
    list_items: list[str] = []
    table_rows: list[str] = []
    code_lines: list[str] = []
    code_lang = ""
    code_file = ""
    list_type = ""
    in_code = False

    def flush_open_blocks() -> None:
        nonlocal list_type
        flush_paragraph(paragraph, out)
        list_type = flush_list(list_type, list_items, out)
        flush_table(table_rows, out)

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

            flush_open_blocks()
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
            flush_open_blocks()
            continue
        image_match = IMAGE_MARKDOWN_RE.fullmatch(stripped)
        if image_match:
            flush_open_blocks()
            out.append(render_markdown_image(image_match))
            continue
        if re.fullmatch(r"-{3,}|\*{3,}|_{3,}", stripped):
            flush_open_blocks()
            out.append("<hr>")
            continue
        heading_match = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if heading_match:
            flush_open_blocks()
            level = len(heading_match.group(1))
            out.append(f"<h{level}>{render_inline_markdown(heading_match.group(2).strip())}</h{level}>")
            continue
        if stripped.startswith("> "):
            flush_open_blocks()
            out.append(f"<blockquote>{render_inline_markdown(stripped[2:].strip())}</blockquote>")
            continue
        list_match = re.match(r"^([-*+])\s+(.+)$", stripped)
        ordered_match = re.match(r"^\d+\.\s+(.+)$", stripped)
        if list_match or ordered_match:
            flush_paragraph(paragraph, out)
            flush_table(table_rows, out)
            next_type = "ol" if ordered_match else "ul"
            if list_type and list_type != next_type:
                list_type = flush_list(list_type, list_items, out)
            list_type = next_type
            list_items.append((ordered_match or list_match).group(1 if ordered_match else 2))
            continue
        if stripped.startswith("|") and stripped.endswith("|"):
            flush_paragraph(paragraph, out)
            list_type = flush_list(list_type, list_items, out)
            table_rows.append(stripped)
            continue
        flush_table(table_rows, out)
        list_type = flush_list(list_type, list_items, out)
        paragraph.append(stripped)

    if in_code:
        language_attr = f' class="language-{escape(code_lang)}"' if code_lang else ""
        out.append(f"<pre><code{language_attr}>{escape(chr(10).join(code_lines))}</code></pre>")
    flush_open_blocks()
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
            "animated": is_animated_asset(src),
        }
    return {
        "src": str(item),
        "alt": "",
        "caption": "",
        "isCover": False,
        "animated": is_animated_asset(str(item)),
    }


def normalize_images(items) -> list[dict]:
    if not isinstance(items, list):
        return []
    return [image for image in (normalize_image_item(item) for item in items) if image["src"]]


def select_motion_cover(post_id: int, original_cover: str) -> str:
    return MOTION_POST_COVERS.get(str(post_id).zfill(3), original_cover)


def load_posts() -> list[dict]:
    posts = []
    for path in sorted(POSTS_DIR.glob("*.md")):
        meta, body = parse_front_matter(path.read_text(encoding="utf-8"))
        status = str(meta.get("status", "published"))
        if status == "draft":
            continue
        images = normalize_images(meta.get("images", []))
        post_id = int(meta["id"])
        original_cover = str(meta.get("cover", ""))
        motion_cover = select_motion_cover(post_id, original_cover)
        post = {
            "id": post_id,
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
            "cover": motion_cover,
            "originalCover": original_cover,
            "coverAnimated": is_animated_asset(motion_cover),
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


def local_content_path(value: str) -> Path | None:
    if not value or re.match(r"^https?://", value, re.I):
        return None
    normalized = unquote(value).replace("\\", "/").lstrip("/")
    while normalized.startswith("../"):
        normalized = normalized[3:]
    return ROOT / normalized


def render_learning_content(item: dict) -> str:
    content_file = str(item.get("contentFile", ""))
    path = local_content_path(content_file)
    if path and path.is_file():
        _, body = parse_front_matter(path.read_text(encoding="utf-8"))
        return markdown_to_html(body)

    inline_content = str(item.get("content", ""))
    return markdown_to_html(inline_content) if inline_content else ""


def load_projects() -> list[dict]:
    projects = []
    for project in read_json("projects.json")["projects"]:
        item = dict(project)
        original_img = str(item.get("img", ""))
        motion_img = MOTION_PROJECT_IMAGES.get(int(item["id"]), original_img)
        detail = str(item.get("detail", ""))
        if detail:
            detail = markdown_to_html(detail)
        projects.append({
            "id": int(item["id"]),
            "title": str(item.get("title", "")),
            "desc": str(item.get("desc", "")),
            "cat": str(item.get("cat", "")),
            "tech": list(item.get("tech", [])),
            "date": str(item.get("date", "")),
            "award": str(item.get("award", "none")),
            "awardText": str(item.get("awardText", "")),
            "emoji": str(item.get("emoji", "🧩")),
            "img": motion_img,
            "status": str(item.get("status", "已完成")),
            "role": str(item.get("role", "")),
            "links": item.get("links", []),
            "highlights": item.get("highlights", []),
            "challenges": item.get("challenges", []),
            "result": str(item.get("result", "")),
            "images": normalize_images(item.get("images", [])),
            "detail": detail,
            "originalImg": original_img,
            "imgAnimated": is_animated_asset(motion_img),
        })
    return projects


def load_learning_plans() -> list[dict]:
    path = CONTENT_DIR / "learning-plans.json"
    if not path.exists():
        return []

    plans = read_json("learning-plans.json").get("plans", [])
    normalized = []
    for item in plans:
        normalized.append({
            "id": int(item["id"]),
            "title": str(item.get("title", "")),
            "cat": str(item.get("cat", "学习计划")),
            "catColor": str(item.get("catColor", "#52e0e0")),
            "subcategory": str(item.get("subcategory", "")),
            "date": str(item.get("date", "")),
            "updatedAt": str(item.get("updatedAt", item.get("date", ""))),
            "status": str(item.get("status", "学习计划")),
            "readTime": int(item.get("readTime", 3)),
            "emoji": str(item.get("emoji", "📚")),
            "cover": str(item.get("cover", "")),
            "coverAnimated": normalize_bool(item.get("coverAnimated"), False),
            "contentFile": str(item.get("contentFile", "")),
            "excerpt": str(item.get("excerpt", "")),
            "tags": list(item.get("tags", [])),
            "highlights": list(item.get("highlights", [])),
            "source": str(item.get("source", "")),
            "content": render_learning_content(item),
        })
    return sorted(normalized, key=lambda item: (item["date"], item["id"]), reverse=True)


def write_data_js(
    posts: list[dict],
    projects: list[dict],
    learning_plans: list[dict],
    games: list[dict],
    acg: dict,
    moments: list[dict],
    friend_links: list[dict],
    changelog: list[dict],
) -> None:
    core_posts = [
        {key: value for key, value in post.items() if key not in {"content", "images", "relatedPosts", "seo", "originalCover"}}
        for post in posts
    ]
    post_details = {
        str(post["id"]): {
            "content": post.get("content", ""),
            "images": post.get("images", []),
            "relatedPosts": post.get("relatedPosts", []),
            "seo": post.get("seo", {}),
            "originalCover": post.get("originalCover", ""),
        }
        for post in posts
    }
    core_projects = [
        {
            key: value
            for key, value in project.items()
            if key not in {"detail", "role", "links", "highlights", "challenges", "result", "images", "originalImg"}
        }
        for project in projects
    ]
    project_details = {
        str(project["id"]): {
            "detail": project.get("detail", ""),
            "role": project.get("role", ""),
            "links": project.get("links", []),
            "highlights": project.get("highlights", []),
            "challenges": project.get("challenges", []),
            "result": project.get("result", ""),
            "images": project.get("images", []),
            "originalImg": project.get("originalImg", ""),
        }
        for project in projects
    }
    core_learning_plans = [
        {key: value for key, value in plan.items() if key not in {"content", "contentFile"}}
        for plan in learning_plans
    ]
    learning_details = {
        str(plan["id"]): {
            "content": plan.get("content", ""),
            "contentFile": plan.get("contentFile", ""),
        }
        for plan in learning_plans
    }
    core_payload = (
        "const POSTS = "
        + json.dumps(core_posts, ensure_ascii=False, indent=2)
        + ";\n\nconst PROJECTS = "
        + json.dumps(core_projects, ensure_ascii=False, indent=2)
        + ";\n\nconst LEARNING_PLANS = "
        + json.dumps(core_learning_plans, ensure_ascii=False, indent=2)
        + ";\n\nconst GAMES = "
        + json.dumps(games, ensure_ascii=False, indent=2)
        + ";\n\nconst ACG = "
        + json.dumps(acg, ensure_ascii=False, indent=2)
        + ";\n\nconst MOMENTS = "
        + json.dumps(moments, ensure_ascii=False, indent=2)
        + ";\n\nconst FRIEND_LINKS = "
        + json.dumps(friend_links, ensure_ascii=False, indent=2)
        + ";\n\nconst CHANGELOG = "
        + json.dumps(changelog, ensure_ascii=False, indent=2)
        + ";\n\nconst SITE_DATA = Object.freeze({\n"
        + "  posts: POSTS,\n"
        + "  projects: PROJECTS,\n"
        + "  learningPlans: LEARNING_PLANS,\n"
        + "  games: GAMES,\n"
        + "  acg: ACG,\n"
        + "  moments: MOMENTS,\n"
        + "  friendLinks: FRIEND_LINKS,\n"
        + "  changelog: CHANGELOG,\n"
        + "});\n\nwindow.SITE_DATA = SITE_DATA;\n"
    )
    DATA_CORE_JS.write_text(core_payload, encoding="utf-8")
    DATA_POSTS_JS.write_text(
        "const POST_DETAILS = "
        + json.dumps(post_details, ensure_ascii=False, indent=2)
        + ";\n\nwindow.SITE_DATA = Object.freeze({ ...(window.SITE_DATA || {}), postDetails: POST_DETAILS });\n",
        encoding="utf-8",
    )
    DATA_PROJECTS_JS.write_text(
        "const PROJECT_DETAILS = "
        + json.dumps(project_details, ensure_ascii=False, indent=2)
        + ";\n\nwindow.SITE_DATA = Object.freeze({ ...(window.SITE_DATA || {}), projectDetails: PROJECT_DETAILS });\n",
        encoding="utf-8",
    )
    DATA_LEARNING_JS.write_text(
        "const LEARNING_DETAILS = "
        + json.dumps(learning_details, ensure_ascii=False, indent=2)
        + ";\n\nwindow.SITE_DATA = Object.freeze({ ...(window.SITE_DATA || {}), learningDetails: LEARNING_DETAILS });\n",
        encoding="utf-8",
    )

    payload = (
        "const POSTS = "
        + json.dumps(posts, ensure_ascii=False, indent=2)
        + ";\n\nconst PROJECTS = "
        + json.dumps(projects, ensure_ascii=False, indent=2)
        + ";\n\nconst LEARNING_PLANS = "
        + json.dumps(learning_plans, ensure_ascii=False, indent=2)
        + ";\n\nconst GAMES = "
        + json.dumps(games, ensure_ascii=False, indent=2)
        + ";\n\nconst ACG = "
        + json.dumps(acg, ensure_ascii=False, indent=2)
        + ";\n\nconst MOMENTS = "
        + json.dumps(moments, ensure_ascii=False, indent=2)
        + ";\n\nconst FRIEND_LINKS = "
        + json.dumps(friend_links, ensure_ascii=False, indent=2)
        + ";\n\nconst CHANGELOG = "
        + json.dumps(changelog, ensure_ascii=False, indent=2)
        + ";\n\nconst SITE_DATA = Object.freeze({\n"
        + "  posts: POSTS,\n"
        + "  projects: PROJECTS,\n"
        + "  learningPlans: LEARNING_PLANS,\n"
        + "  games: GAMES,\n"
        + "  acg: ACG,\n"
        + "  moments: MOMENTS,\n"
        + "  friendLinks: FRIEND_LINKS,\n"
        + "  changelog: CHANGELOG,\n"
        + "});\n\nwindow.SITE_DATA = SITE_DATA;\n"
    )
    DATA_JS.write_text(payload, encoding="utf-8")


def main() -> None:
    write_data_js(
        load_posts(),
        load_projects(),
        load_learning_plans(),
        read_json("games.json")["games"],
        read_json("acg.json"),
        read_json("moments.json")["moments"],
        read_json("friend-links.json")["friendLinks"],
        read_json("changelog.json")["changelog"],
    )


if __name__ == "__main__":
    main()
