from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlparse

from build_content import CONTENT_DIR, POSTS_DIR, ROOT, normalize_images, parse_front_matter


IMAGE_FIELDS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}
IMAGE_MARKDOWN_RE = re.compile(r'!\[(?P<alt>[^\]]*)\]\((?P<src>\S+?)(?:\s+"(?P<title>[^"]+)")?\)')


def fail(message: str, errors: list[str]) -> None:
    errors.append(message)


def local_asset_exists(path: str) -> bool:
    if not path or re.match(r"^https?://", path):
        return True
    normalized = path.replace("../", "").lstrip("/")
    return (ROOT / normalized).exists()


def validate_markdown_images(text: str, label: str, errors: list[str]) -> None:
    for match in IMAGE_MARKDOWN_RE.finditer(text):
        src = match.group("src") or ""
        if src and not local_asset_exists(src):
            fail(f"{label}: markdown image does not exist: {src}", errors)


def valid_url(url: str) -> bool:
    if not url:
        return False
    parsed = urlparse(url)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def validate_posts(errors: list[str]) -> set[int]:
    ids: set[int] = set()
    slugs: set[str] = set()
    for path in sorted(POSTS_DIR.glob("*.md")):
        raw_text = path.read_text(encoding="utf-8")
        meta, body = parse_front_matter(raw_text)
        label = path.relative_to(ROOT)
        required = ["id", "title", "cat", "date", "excerpt"]
        for key in required:
            if key not in meta or str(meta[key]).strip() == "":
                fail(f"{label}: missing required field {key}", errors)

        if "id" not in meta:
            continue
        post_id = int(meta["id"])
        if post_id in ids:
            fail(f"{label}: duplicate post id {post_id}", errors)
        ids.add(post_id)

        # 验证 slug 唯一性
        slug = str(meta.get("slug", ""))
        if slug:
            if slug in slugs:
                fail(f"{label}: duplicate post slug '{slug}'", errors)
            slugs.add(slug)

        status = str(meta.get("status", "published"))
        if status not in {"published", "draft"}:
            fail(f"{label}: status must be published or draft", errors)

        for field in ["cover", "ogImage"]:
            value = str(meta.get(field, ""))
            if value and not local_asset_exists(value):
                fail(f"{label}: {field} does not exist: {value}", errors)

        for image in normalize_images(meta.get("images", [])):
            if not local_asset_exists(image["src"]):
                fail(f"{label}: image does not exist: {image['src']}", errors)

        validate_markdown_images(body, str(label), errors)

    for path in sorted(POSTS_DIR.glob("*.md")):
        meta, _ = parse_front_matter(path.read_text(encoding="utf-8"))
        for related_id in meta.get("relatedPosts", []):
            if int(related_id) not in ids:
                fail(f"{path.relative_to(ROOT)}: related post id not found: {related_id}", errors)

    return ids


def validate_projects(errors: list[str]) -> None:
    data = json.loads((CONTENT_DIR / "projects.json").read_text(encoding="utf-8"))
    ids: set[int] = set()
    for project in data.get("projects", []):
        label = f"project:{project.get('title', project.get('id', 'unknown'))}"
        project_id = int(project["id"])
        if project_id in ids:
            fail(f"{label}: duplicate project id {project_id}", errors)
        ids.add(project_id)

        image = str(project.get("img", ""))
        if image and not local_asset_exists(image):
            fail(f"{label}: img does not exist: {image}", errors)

        for item in normalize_images(project.get("images", [])):
            if not local_asset_exists(item["src"]):
                fail(f"{label}: image does not exist: {item['src']}", errors)

        for link in project.get("links", []):
            if not valid_url(str(link.get("url", ""))):
                fail(f"{label}: invalid link url: {link.get('url', '')}", errors)


def validate_json_file(name: str, errors: list[str]) -> None:
    path = CONTENT_DIR / name
    try:
        json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(f"{path.relative_to(ROOT)}: invalid JSON: {exc}", errors)


def main() -> None:
    errors: list[str] = []
    validate_json_file("projects.json", errors)
    validate_json_file("games.json", errors)
    validate_json_file("acg.json", errors)
    validate_json_file("moments.json", errors)
    validate_json_file("friend-links.json", errors)
    validate_json_file("changelog.json", errors)
    validate_posts(errors)
    validate_projects(errors)

    if errors:
        print("content validation failed:")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)

    print("content_validation_ok")


if __name__ == "__main__":
    main()
