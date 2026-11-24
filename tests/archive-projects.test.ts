import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import {
	mergeArchiveEntries,
	mergeArchiveCategories,
} from "../src/utils/archive-project-data.ts";

const root = new URL("../", import.meta.url);
const read = (path: string) => fs.readFileSync(new URL(path, root), "utf8");
const projects = [
	["bot", "2025-01-05", "youzenghe/bot"],
	["classicsage", "2026-06-07", "youzenghe/ClassicSage"],
	["poetrynest", "2026-06-08", "youzenghe/PoetryNest"],
];
test("only the requested three dated project records are stored outside the article collection", () => {
	assert.deepEqual(
		fs.readdirSync(new URL("src/content/archived-projects/", root)).sort(),
		projects.map(([id]) => id + ".md").sort(),
	);
	for (const [id, date, repo] of projects) {
		const content = read(`src/content/archived-projects/${id}.md`);
		assert.match(content, new RegExp(`published: ${date}`));
		assert.match(content, /category: "项目"/);
		assert.ok(content.includes(`::github{repo="${repo}"}`));
		assert.doesNotMatch(content, /image:|\!\[/);
	}
	assert.equal(fs.readdirSync(new URL("src/content/posts/", root)).length, 7);
});
test("bot describes the supplied local voice/API/personality facts with a dated note", () => {
	const text = read("src/content/archived-projects/bot.md");
	for (const pattern of [
		/语音对话/,
		/本地.*GPT-SoVITS/,
		/DeepSeek.*API/,
		/自定义人格/,
		/2026年11月24日补/,
		/烂大街/,
	])
		assert.match(text, pattern);
	assert.doesNotMatch(text, /实时识别|端到端|已部署/);
});
test("other project bodies contain only their repository cards", () => {
	for (const id of ["classicsage", "poetrynest"]) {
		const body = read(`src/content/archived-projects/${id}.md`)
			.split(/^---\s*$/m)[2]
			.trim();
		assert.match(
			body,
			/^::github\{repo="youzenghe\/(?:ClassicSage|PoetryNest)"\}$/,
		);
	}
});
test("archive rows are sorted by exact publication dates without mutating inputs", () => {
	const article = {
		id: "article",
		url: "/posts/article/",
		data: {
			title: "Article",
			published: new Date("2026-08-03"),
			tags: [],
			category: "面经",
		},
	};
	const project = {
		id: "archived-projects/bot",
		url: "/archive/projects/bot/",
		data: {
			title: "bot",
			published: new Date("2025-01-05"),
			tags: [],
			category: "项目",
		},
	};
	const inputs = [project, article];
	const result = mergeArchiveEntries([article], [project]);
	assert.deepEqual(
		result.map((row) => row.id),
		["article", "archived-projects/bot"],
	);
	assert.deepEqual(inputs, [project, article]);
	assert.equal(result[1].url, "/archive/projects/bot/");
});
test("archive project category merges existing counts without changing article inputs", () => {
	const articleCategories = [
		{ name: "面经", count: 1, url: "/archive/?category=面经" },
	];
	const projects = [
		{ data: { category: "项目" } },
		{ data: { category: "项目" } },
		{ data: { category: "项目" } },
	];
	const result = mergeArchiveCategories(
		articleCategories,
		projects,
		(name) => "/archive/?category=" + name,
	);
	assert.equal(result.find((row) => row.name === "项目")?.count, 3);
	assert.equal(articleCategories.length, 1);
});
test("project records join only the archive pipeline, not homepage article queries", () => {
	assert.match(read("src/pages/archive.astro"), /getArchiveEntries/);
	assert.doesNotMatch(
		read("src/pages/blog/[...page].astro"),
		/archivedProjects|getArchiveEntries/,
	);
	assert.doesNotMatch(
		read("src/pages/rss.xml.ts"),
		/archivedProjects|getArchiveEntries/,
	);
	assert.doesNotMatch(
		read("src/pages/api/calendar-data.json.ts"),
		/archivedProjects|getArchiveEntries/,
	);
	assert.match(read("src/pages/archive/projects/[slug].astro"), /<Markdown/);
});
test("mixed archive totals are described as records rather than extra articles", () => {
	assert.match(
		read("src/components/features/archive/ArchivePanel.svelte"),
		/I18nKey\.archiveRecordCount/,
	);
	assert.match(
		read("src/i18n/languages/zh_CN.ts"),
		/\[Key\.archiveRecordCount\]: "条记录"/,
	);
});
