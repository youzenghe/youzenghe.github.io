import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (file: string) =>
	readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("crawler policy indexes only active canonical content", async () => {
	const { isIndexablePage, buildRobots } = await import(
		"../src/utils/crawler-policy.mjs"
	);
	for (const path of [
		"/",
		"/blog/",
		"/blog/2/",
		"/blog/10/",
		"/archive/",
		"/about/",
		"/albums/",
		"/games/",
		"/friends/",
		"/posts/example/",
		"/archive/projects/bot/",
	]) {
		assert.equal(isIndexablePage(`https://yzh1019.top${path}`), true, path);
	}
	for (const path of [
		"/anime/",
		"/projects/",
		"/skills/",
		"/diary/",
		"/atom/",
		"/rss/",
		"/pages/post.html",
		"/services/index.html",
		"/games/chat.html",
		"/404.html",
		"/api/allPostMeta.json",
		"/blog/?tag=Java",
	]) {
		assert.equal(isIndexablePage(`https://yzh1019.top${path}`), false, path);
	}
	const robots = buildRobots("https://yzh1019.top/");
	assert.doesNotMatch(robots, /^Disallow: \/$/m);
	assert.doesNotMatch(robots, /^Disallow: \/pages\/$/m);
	assert.match(robots, /^Allow: \/$/m);
	assert.match(
		robots,
		/^Sitemap: https:\/\/yzh1019\.top\/sitemap-index\.xml$/m,
	);
});

test("legacy article ids map only to retained content", async () => {
	const { resolveLegacyDestination } = await import(
		"../src/utils/legacy-navigation.mjs"
	);
	assert.equal(
		resolveLegacyDestination("post", "?id=6"),
		"/posts/shen-ben-wu-xiang/",
	);
	assert.equal(
		resolveLegacyDestination("post", "?id=1"),
		"/posts/robot-ai-contest/",
	);
	assert.equal(
		resolveLegacyDestination("learning", "?id=24"),
		"/posts/muyuan-java-interview/",
	);
	assert.equal(
		resolveLegacyDestination("post", "?id=7&from=old", "#first"),
		"/posts/qiaoweng-galgame/?from=old#first",
	);
	for (const query of [
		"?id=3",
		"?id=4",
		"?id=99",
		"?id=__proto__",
		"?id=6&id=7",
		"?id=https://bad.test",
	]) {
		assert.equal(resolveLegacyDestination("post", query), "/404.html", query);
	}
	assert.equal(resolveLegacyDestination("project", "?id=7"), "/404.html");
	assert.equal(resolveLegacyDestination("learning", ""), "/archive/");
	assert.equal(
		resolveLegacyDestination("games", "?from=old"),
		"/games/?from=old",
	);
});

test("old sitemap address returns a real XML index", () => {
	const source = read("src/pages/sitemap.xml.ts");
	assert.match(source, /sitemapindex/);
	assert.match(source, /sitemap-0\.xml/);
	assert.match(source, /application\/xml/);
});

test("Pages deploy uses checked artifacts and main branch without branch pushes", () => {
	const deploy = read(".github/workflows/deploy.yml");
	assert.match(deploy, /branches: \[main\]/);
	assert.match(deploy, /contents: read/);
	assert.match(deploy, /pages: write/);
	assert.match(deploy, /id-token: write/);
	assert.match(deploy, /actions\/upload-pages-artifact@v3/);
	assert.match(deploy, /actions\/deploy-pages@v4/);
	assert.match(deploy, /pnpm test/);
	assert.match(deploy, /pnpm check:links/);
	assert.doesNotMatch(
		deploy,
		/JamesIves|contents: write|branch: pages|secrets\.(?!GITHUB_TOKEN)/,
	);
	const validation = read(".github/workflows/lint.yml");
	assert.match(validation, /pull_request:/);
	assert.match(validation, /branches: \[main\]/);
	assert.doesNotMatch(validation, /master|deploy-pages|contents: write/);
});
