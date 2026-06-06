from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from pathlib import Path

from build_content import parse_front_matter


ROOT = Path(__file__).resolve().parents[1]
CONTENT_DIR = ROOT / "content"
SITE_URL = "https://yzh1019.top"
SITEMAP = ROOT / "sitemap.xml"


def read_json(name: str):
    return json.loads((CONTENT_DIR / name).read_text(encoding="utf-8"))


def add_url(urlset: ET.Element, loc: str) -> None:
    url = ET.SubElement(urlset, "url")
    loc_el = ET.SubElement(url, "loc")
    loc_el.text = loc


def main() -> None:
    ET.register_namespace("", "http://www.sitemaps.org/schemas/sitemap/0.9")
    urlset = ET.Element("{http://www.sitemaps.org/schemas/sitemap/0.9}urlset")

    static_paths = [
        "/",
        "/index.html",
        "/404.html",
        "/rss.xml",
        "/services/",
        "/services/index.html",
        "/pages/blog.html",
        "/pages/posts.html",
        "/pages/learning.html",
        "/pages/archive.html",
        "/pages/tags.html",
        "/pages/categories.html",
        "/pages/projects.html",
        "/pages/acg.html",
        "/pages/moments.html",
        "/pages/links.html",
        "/pages/games.html",
        "/pages/changelog.html",
        "/pages/about.html",
    ]
    for path in static_paths:
        add_url(urlset, f"{SITE_URL}{path}")

    posts = sorted(read_json("posts.json")["posts"] if (CONTENT_DIR / "posts.json").exists() else [], key=lambda item: item["id"])
    if not posts:
        for post_file in sorted((CONTENT_DIR / "posts").glob("*.md")):
            meta, _ = parse_front_matter(post_file.read_text(encoding="utf-8"))
            if str(meta.get("status", "published")) == "draft":
                continue
            posts.append({"id": int(meta["id"])})

    for post in posts:
        add_url(urlset, f"{SITE_URL}/pages/post.html?id={post['id']}")

    for plan in sorted(read_json("learning-plans.json").get("plans", []), key=lambda item: item["id"]):
        add_url(urlset, f"{SITE_URL}/pages/learning.html?id={plan['id']}")

    for project in sorted(read_json("projects.json")["projects"], key=lambda item: item["id"]):
        add_url(urlset, f"{SITE_URL}/pages/project.html?id={project['id']}")

    tree = ET.ElementTree(urlset)
    ET.indent(tree, space="  ")
    tree.write(SITEMAP, encoding="utf-8", xml_declaration=True)


if __name__ == "__main__":
    main()
