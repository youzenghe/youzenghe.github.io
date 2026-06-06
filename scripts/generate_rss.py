from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from email.utils import format_datetime
from pathlib import Path

from build_content import load_learning_plans, load_posts, load_projects


ROOT = Path(__file__).resolve().parents[1]
SITE_URL = "https://yzh1019.top"
RSS_PATH = ROOT / "rss.xml"
TZ = timezone(timedelta(hours=8))


def parse_date(value: str) -> datetime:
    text = str(value or "").strip()
    for fmt in ("%Y-%m-%d", "%Y.%m.%d", "%Y.%m"):
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=TZ)
        except ValueError:
            continue
    match = re.search(r"(\d{4})[.-](\d{1,2})", text)
    if match:
        year, month = (int(part) for part in match.groups())
        return datetime(year, month, 1, tzinfo=TZ)
    return datetime.now(TZ)


def rfc822(value: datetime) -> str:
    return format_datetime(value)


def add_text(parent: ET.Element, tag: str, text: str) -> ET.Element:
    child = ET.SubElement(parent, tag)
    child.text = text
    return child


def make_post_item(post: dict) -> dict:
    link = f"{SITE_URL}/pages/post.html?id={post['id']}"
    date = parse_date(post.get("updatedAt") or post.get("date"))
    return {
        "title": str(post.get("title", "")),
        "link": link,
        "guid": link,
        "date": date,
        "category": str(post.get("cat", "文章")),
        "description": str(post.get("excerpt") or "来自次元日记的文章更新。"),
    }


def make_project_item(project: dict) -> dict:
    link = f"{SITE_URL}/pages/project.html?id={project['id']}"
    date = parse_date(project.get("date"))
    tech = "、".join(str(item) for item in project.get("tech", []) if str(item).strip())
    suffix = f" 技术栈：{tech}。" if tech else ""
    return {
        "title": f"项目：{project.get('title', '')}",
        "link": link,
        "guid": link,
        "date": date,
        "category": str(project.get("cat", "项目")),
        "description": f"{project.get('desc', '')}{suffix}",
    }


def make_learning_plan_item(plan: dict) -> dict:
    link = f"{SITE_URL}/pages/learning.html?id={plan['id']}"
    date = parse_date(plan.get("updatedAt") or plan.get("date"))
    tags = "、".join(str(item) for item in plan.get("tags", [])[:4] if str(item).strip())
    suffix = f" 标签：{tags}。" if tags else ""
    return {
        "title": f"学习计划：{plan.get('title', '')}",
        "link": link,
        "guid": link,
        "date": date,
        "category": f"学习计划 / {plan.get('cat', '学习计划')}",
        "description": f"{plan.get('excerpt', '')}{suffix}",
    }


def main() -> None:
    ET.register_namespace("atom", "http://www.w3.org/2005/Atom")
    rss = ET.Element("rss", {"version": "2.0"})
    channel = ET.SubElement(rss, "channel")

    items = [make_post_item(post) for post in load_posts()]
    items.extend(make_project_item(project) for project in load_projects())
    items.extend(make_learning_plan_item(plan) for plan in load_learning_plans())
    items.sort(key=lambda item: item["date"], reverse=True)
    last_build = items[0]["date"] if items else datetime.now(TZ)

    add_text(channel, "title", "次元日记 · 超级小识")
    add_text(channel, "link", f"{SITE_URL}/pages/blog.html")
    atom_link = ET.SubElement(channel, "{http://www.w3.org/2005/Atom}link")
    atom_link.set("href", f"{SITE_URL}/rss.xml")
    atom_link.set("rel", "self")
    atom_link.set("type", "application/rss+xml")
    add_text(channel, "description", "记录 Java 后端、AI 应用、项目复盘与 ACG 兴趣的个人技术博客。")
    add_text(channel, "language", "zh-CN")
    add_text(channel, "lastBuildDate", rfc822(last_build))

    for data in items:
        item = ET.SubElement(channel, "item")
        add_text(item, "title", data["title"])
        add_text(item, "link", data["link"])
        add_text(item, "guid", data["guid"])
        add_text(item, "pubDate", rfc822(data["date"]))
        add_text(item, "category", data["category"])
        add_text(item, "description", data["description"])

    tree = ET.ElementTree(rss)
    ET.indent(tree, space="  ")
    tree.write(RSS_PATH, encoding="utf-8", xml_declaration=True)


if __name__ == "__main__":
    main()
