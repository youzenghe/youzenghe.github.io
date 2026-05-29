from __future__ import annotations

import json
import re
from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONTENT_DIR = ROOT / "content"
POSTS_DIR = CONTENT_DIR / "posts"
DATA_JS = ROOT / "js" / "data.js"


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

    for raw_line in raw_meta.splitlines():
        line = raw_line.rstrip()
        if not line.strip():
            continue
        if line.startswith("  - ") and current_key:
            meta.setdefault(current_key, []).append(parse_scalar(line[4:]))
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

    return meta, body.strip()


def flush_paragraph(lines: list[str], out: list[str]) -> None:
    if not lines:
        return
    text = " ".join(line.strip() for line in lines if line.strip())
    if text:
        out.append(f"<p>{escape(text)}</p>")
    lines.clear()


def markdown_to_html(markdown: str) -> str:
    out: list[str] = []
    paragraph: list[str] = []

    for raw_line in markdown.splitlines():
        line = raw_line.rstrip()
        stripped = line.strip()
        if not stripped:
            flush_paragraph(paragraph, out)
            continue
        if stripped.startswith("## "):
            flush_paragraph(paragraph, out)
            out.append(f"<h2>{escape(stripped[3:].strip())}</h2>")
            continue
        if stripped.startswith("> "):
            flush_paragraph(paragraph, out)
            out.append(f"<blockquote>{escape(stripped[2:].strip())}</blockquote>")
            continue
        paragraph.append(stripped)

    flush_paragraph(paragraph, out)
    return "\n      ".join(out)


def load_posts() -> list[dict]:
    posts = []
    for path in sorted(POSTS_DIR.glob("*.md")):
        meta, body = parse_front_matter(path.read_text(encoding="utf-8"))
        post = {
            "id": int(meta["id"]),
            "title": str(meta["title"]),
            "cat": str(meta["cat"]),
            "catColor": str(meta.get("catColor", "#f9a8c9")),
            "date": str(meta["date"]),
            "readTime": int(meta.get("readTime", 3)),
            "emoji": str(meta.get("emoji", "📝")),
            "cover": str(meta.get("cover", "")),
            "excerpt": str(meta.get("excerpt", "")),
            "tags": list(meta.get("tags", [])),
            "content": markdown_to_html(body),
        }
        posts.append(post)
    return sorted(posts, key=lambda item: item["id"])


def read_json(name: str):
    path = CONTENT_DIR / name
    return json.loads(path.read_text(encoding="utf-8"))


def write_data_js(posts: list[dict], projects: list[dict], games: list[dict], friend_links: list[dict]) -> None:
    payload = (
        "const POSTS = "
        + json.dumps(posts, ensure_ascii=False, indent=2)
        + ";\n\nconst PROJECTS = "
        + json.dumps(projects, ensure_ascii=False, indent=2)
        + ";\n\nconst GAMES = "
        + json.dumps(games, ensure_ascii=False, indent=2)
        + ";\n\nconst FRIEND_LINKS = "
        + json.dumps(friend_links, ensure_ascii=False, indent=2)
        + ";\n\nconst SITE_DATA = Object.freeze({\n"
        + "  posts: POSTS,\n"
        + "  projects: PROJECTS,\n"
        + "  games: GAMES,\n"
        + "  friendLinks: FRIEND_LINKS,\n"
        + "});\n\nwindow.SITE_DATA = SITE_DATA;\n"
    )
    DATA_JS.write_text(payload, encoding="utf-8")


def main() -> None:
    write_data_js(
        load_posts(),
        read_json("projects.json")["projects"],
        read_json("games.json")["games"],
        read_json("friend-links.json")["friendLinks"],
    )


if __name__ == "__main__":
    main()
