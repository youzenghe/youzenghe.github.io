import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeArticleTitleMatches } from "../src/utils/article-title-search.ts";

const posts = [
	{ slug: "face", title: "神本无相——豆包说，它识别不出我的脸" },
	{ slug: "java", title: "牧原Java面经" },
];
test("literal title keywords still match when a full-text tokenizer misses them", () => {
	assert.equal(
		mergeArticleTitleMatches("豆包", posts, [], (path) => path)[0].url,
		"/posts/face/",
	);
	assert.equal(
		mergeArticleTitleMatches(" java ", posts, [], (path) => path)[0].url,
		"/posts/java/",
	);
	assert.deepEqual(
		mergeArticleTitleMatches("", posts, [], (path) => path),
		[],
	);
});
test("title results deduplicate full-text hits without losing body-only matches", () => {
	const hits = [
		{
			url: "/posts/face/",
			meta: { title: posts[0].title },
			excerpt: "Full-text excerpt",
		},
		{
			url: "/posts/java/",
			meta: { title: posts[1].title },
			excerpt: "Body match",
		},
	];
	const merged = mergeArticleTitleMatches("豆包", posts, hits, (path) => path);
	assert.equal(merged.length, 2);
	assert.equal(merged[0].excerpt, "Full-text excerpt");
	assert.equal(merged[1].url, "/posts/java/");
});
test("locally generated excerpts escape HTML rather than injecting article metadata", () => {
	const merged = mergeArticleTitleMatches(
		"<img",
		[{ slug: "unsafe", title: '<img src=x onerror="alert(1)">' }],
		[],
		(path) => path,
	);
	assert.doesNotMatch(merged[0].excerpt, /</);
	assert.match(merged[0].excerpt, /&lt;img/);
});
