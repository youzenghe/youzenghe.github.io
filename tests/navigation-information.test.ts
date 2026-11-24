import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { navBarConfig } from "../src/config/navBarConfig.ts";
import { LinkPresets } from "../src/constants/link-presets.ts";
import { LinkPreset, type NavBarLink } from "../src/types/config.ts";

test("navigation has six primary entries without an information dropdown", () => {
	const links = navBarConfig.links.map((link) =>
		typeof link === "number" ? LinkPresets[link] : link,
	);
	assert.deepEqual(
		links.map((link) => link.name),
		[
			LinkPresets[LinkPreset.Home].name,
			LinkPresets[LinkPreset.Archive].name,
			"游戏",
			LinkPresets[LinkPreset.Albums].name,
			LinkPresets[LinkPreset.Friends].name,
			"关于",
		],
	);
	function check(link: NavBarLink) {
		assert.notEqual(link.name, "信息");
		assert.doesNotMatch(link.url, /^\/(?:rss|atom|sitemap)(?:[./-]|$)/);
		for (const child of link.children ?? []) {
			check(typeof child === "number" ? LinkPresets[child] : child);
		}
	}
	links.forEach(check);
});

test("crawler sitemap and compatible subscription files remain generated", () => {
	const read = (name: string) =>
		readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
	assert.match(read("astro.config.mjs"), /sitemap\(\{ filter: isIndexablePage \}\)/);
	assert.match(read("src/utils/crawler-policy.mjs"), /Sitemap:/);
	for (const name of [
		"src/pages/rss.xml.ts",
		"src/pages/atom.xml.ts",
		"src/pages/rss.astro",
	]) {
		assert.ok(existsSync(new URL(`../${name}`, import.meta.url)), name);
	}
});
