import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const slugs = [
	"shen-ben-wu-xiang",
	"qiaoweng-galgame",
	"software-copyrights",
	"robot-ai-contest",
	"software-adoption",
	"last-contest",
];

test("the six casual posts have no lesson sections or takeaway blockquotes", () => {
	for (const slug of slugs) {
		const source = readFileSync(
			new URL(`../src/content/posts/${slug}/index.md`, import.meta.url),
			"utf8",
		);
		const body = source.replace(/^---\n[\s\S]*?\n---\n/, "");
		assert.ok(body.trim(), slug);
		assert.doesNotMatch(body, /^>\s/m, slug);
		assert.doesNotMatch(
			body,
			/^#{1,6}\s.*(?:总结|感想|解读|意味着什么|收获|启示)/m,
			slug,
		);
	}
});
