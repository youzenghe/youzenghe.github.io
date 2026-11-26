import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import type { Element } from "hast";
import { profileConfig } from "../src/config/profileConfig.ts";
import { GithubCardComponent } from "../src/plugins/rehype-component-github-card.mjs";

const read = (path: string) =>
	fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const about = read("src/content/spec/about.md");
const footer = read("src/components/organisms/footer/Footer.astro");
const ownerRepo = "youzenghe/youzenghe.github.io";
type CardNode = Element | Element["children"][number];

const nodes = (node: CardNode): CardNode[] => [
	node,
	...("children" in node ? node.children.flatMap(nodes) : []),
];

test("about-site preserves the owner's casual origin, projects and download instructions", () => {
	for (const pattern of [
		/Spaceship/i,
		/打折.*便宜域名/,
		/63\s*块\s*8.*3\s*年.*😋/,
		/AI.*辅助.*建站/,
		/AI\s*味.*太重/,
		/去不彻底/,
		/大佬.*网站/,
		/学学这个.*学学那个/,
		/几乎不分享任何技术性/,
		/GitHub.*项目.*不确定.*帮到大家/,
		/Python.*Java.*忘完/,
		/游戏.*直接点.*跳转到网盘/,
		/大家可以直接下/,
		/网盘后缀.*括号.*解压密码/,
	]) {
		assert.match(about, pattern);
	}
	assert.doesNotMatch(
		about,
		/halo|Wayback Machine|2025 年|站点规划|计算机、音乐创作|serverless|aicorein|简明教程|Pull Request|保留.*卡片|不要.*API/i,
	);
});

test("site information keeps theme attribution and links only the theme and owner's repository", () => {
	assert.match(about, /## 站点信息/);
	assert.match(about, /本站基于 Mizuki 主题修改。它是一款非常优秀的主题。/);
	assert.match(about, /\[Mizuki\]\(https:\/\/github\.com\/LyraVoid\/Mizuki\)/);
	assert.match(
		about,
		/此外，本站几乎所有内容都在 \[GitHub\]\(https:\/\/github\.com\/youzenghe\/youzenghe\.github\.io\) 开源/,
	);
	assert.deepEqual(
		[...about.matchAll(/::github\{repo="([^"]+)"(?: compact="true")?\}/g)].map((match) => match[1]),
		["LyraVoid/Mizuki", ownerRepo],
	);
	assert.equal(about.trim().split("\n").at(-1), "欢迎前来提出建议、指出错误。");
});

test("the owner's repository card links correctly without fabricated metadata or network code", () => {
	assert.ok(about.includes(`::github{repo="${ownerRepo}"}`));
	const card = GithubCardComponent({ repo: ownerRepo }, []);
	const all = nodes(card);
	assert.equal(card.properties.href, `https://github.com/${ownerRepo}`);
	for (const name of ["gc-stars", "gc-forks", "gc-license", "gc-language"]) {
		const field = all.find(
			(node) =>
				node.type === "element" &&
				Array.isArray(node.properties.className) &&
				node.properties.className.includes(name),
		);
		assert.equal(field, undefined, name);
	}
	assert.doesNotMatch(JSON.stringify(card), /Unrecorded|unrecorded/);
	assert.equal(
		all.some((node) => node.type === "element" && ["script", "img"].includes(node.tagName)),
		false,
	);
	assert.doesNotMatch(JSON.stringify(card), /fetch\(|api\.github\.com|Snapshot ·/);
});

test("footer contains only current-year owner copyright, with no custom or attribution rows", () => {
	assert.equal(profileConfig.name, "AAA乔瓮批发宝哥");
	assert.match(footer, /const currentYear = new Date\(\)\.getFullYear\(\);/);
	assert.doesNotMatch(
		footer,
		/footerConfig|customFooterHtml|FooterConfig\.html|set:html|node:fs|node:path|\burl\(|RSS|Atom|Sitemap|Powered by|Version|astro\.build|LyraVoid\/Mizuki|<a\b/,
	);
	const markup = footer.replace(/^---\n[\s\S]*?\n---\n/, "");
	const text = markup
		.replace(/<!--[\s\S]*?-->/g, "")
		.replace(/<[^>]+>/g, "")
		.replace("&copy;", "©")
		.replace("{currentYear}", String(new Date().getFullYear()))
		.replace("{profileConfig.name}", profileConfig.name)
		.replace(/\s+/g, " ")
		.trim();
	assert.equal(text, `© ${new Date().getFullYear()} AAA乔瓮批发宝哥. All Rights Reserved.`);
});

test("copyright-only footer compiles with the installed Astro compiler", () => {
	const require = createRequire(import.meta.url);
	const astroRequire = createRequire(require.resolve("astro/package.json"));
	const { transform } = astroRequire("@astrojs/compiler-rs");
	const result = transform(footer, {
		filename: "src/components/organisms/footer/Footer.astro",
	});
	assert.deepEqual(result.diagnostics, []);
});

test("copyright-only presentation leaves license files and feed/sitemap generators available", () => {
	assert.ok(read("LICENSE").trim());
	assert.ok(read("LICENSE.MIT").trim());
	for (const file of ["src/pages/rss.xml.ts", "src/pages/atom.xml.ts"]) {
		assert.match(read(file), /export/);
	}
	assert.match(read("astro.config.mjs"), /import sitemap from "@astrojs\/sitemap"/);
	assert.match(read("astro.config.mjs"), /sitemap\(\{ filter: isIndexablePage \}\)/);
});
