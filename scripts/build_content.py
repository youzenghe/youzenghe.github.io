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
            "images": list(meta.get("images", [])),
            "series": str(meta.get("series", meta.get("cat", ""))),
            "excerpt": str(meta.get("excerpt", "")),
            "tags": list(meta.get("tags", [])),
            "content": markdown_to_html(body),
        }
        posts.append(post)
    return sorted(posts, key=lambda item: item["id"])


def read_json(name: str):
    path = CONTENT_DIR / name
    return json.loads(path.read_text(encoding="utf-8"))


def load_projects() -> list[dict]:
    projects = []
    for project in read_json("projects.json")["projects"]:
        item = dict(project)
        item.setdefault("images", [])
        item.setdefault("detail", "")
        if not item["images"] and item.get("img"):
            item["images"] = [item["img"]]
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
