import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { GithubCardComponent } from "../src/plugins/rehype-component-github-card.mjs";

function nodes(tree) {
	return [tree, ...(tree.children ?? []).flatMap(nodes)];
}
function text(tree) {
	return nodes(tree)
		.filter((node) => node.type === "text")
		.map((node) => node.value)
		.join(" ");
}
function byClass(tree, className) {
	return nodes(tree).find((node) =>
		node.properties?.className?.includes(className),
	);
}

test("recorded repository cards are complete static trees without scripts or avatar requests", () => {
	const card = GithubCardComponent({ repo: "LyraVoid/Mizuki" }, []);
	assert.equal(card.tagName, "a");
	assert.equal(card.properties.href, "https://github.com/LyraVoid/Mizuki");
	assert.ok(card.properties.rel.includes("noopener"));
	assert.equal(
		nodes(card).some(
			(node) => node.tagName === "script" || node.tagName === "img",
		),
		false,
	);
	assert.ok(!JSON.stringify(card).includes("fetch("));
	assert.ok(!JSON.stringify(card).includes("avatars.githubusercontent.com"));
	assert.ok(!card.properties.className.includes("fetch-waiting"));
	assert.match(text(card), /2026-11-22/);
	assert.equal(text(byClass(card, "gc-stars")), "1.9K");
	assert.equal(text(byClass(card, "gc-forks")), "536");
	assert.equal(text(byClass(card, "gc-license")), "Apache-2.0");
});

test("repository matching is case-insensitive and preserves recorded zero counts", () => {
	const card = GithubCardComponent({ repo: "AICOREIN/ASTRO-BLOG" }, []);
	assert.equal(text(byClass(card, "gc-stars")), "2");
	assert.equal(text(byClass(card, "gc-forks")), "0");
	assert.match(text(card), /基于 Astro Mizuki/);
});

test("unknown repositories do not fabricate zero statistics", () => {
	const card = GithubCardComponent({ repo: "someone/project" }, []);
	assert.equal(card.properties.href, "https://github.com/someone/project");
	for (const name of ["gc-stars", "gc-forks", "gc-license", "gc-language"]) {
		assert.equal(byClass(card, name), undefined);
	}
	assert.doesNotMatch(text(card), /未记录|Unrecorded|unrecorded/);
	assert.equal(byClass(card,"gc-infobar"), undefined);
	assert.equal(byClass(card,"gc-snapshot"), undefined);
	assert.equal(byClass(card,"gc-description"), undefined);
	assert.equal(
		nodes(card).some((node) => node.tagName === "script"),
		false,
	);
});

test("malformed repository identifiers cannot create links or scripts", () => {
	for (const repo of [
		"https://github.com/a/b",
		"owner/repo/extra",
		"../repo",
		"owner/a?b",
		"owner/a#b",
		"x/'onclick=evil",
		null,
		123,
	]) {
		const card = GithubCardComponent({ repo }, []);
		assert.notEqual(card.tagName, "a");
		assert.equal(
			nodes(card).some((node) => node.tagName === "script"),
			false,
		);
	}
});

test("snapshot entries record dates and source identity instead of current-time claims", () => {
	const snapshots = JSON.parse(
		fs.readFileSync(
			new URL("../src/data/repository-snapshots.json", import.meta.url),
			"utf8",
		),
	);
	assert.equal(snapshots.schemaVersion, 1);
	for (const entry of Object.values(snapshots.repositories)) {
		assert.match(entry.observedAt, /^2026-11-22T/);
		assert.match(entry.source.sha256, /^[a-f0-9]{64}$/);
		assert.match(entry.source.url, /^https:\/\/api\.github\.com\/repos\//);
		assert.equal("avatar_url" in entry, false);
	}
});

test("production builds refresh rendered markdown when repository metadata changes", () => {
	const scripts=JSON.parse(fs.readFileSync(new URL("../package.json",import.meta.url),"utf8")).scripts;
	for (const name of ["build","build:local"]) assert.match(scripts[name],/astro build --force/);
});
