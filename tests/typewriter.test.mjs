import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const source = fs.readFileSync(
	new URL(
		"../src/components/atoms/typewriter-text/TypewriterText.astro",
		import.meta.url,
	),
	"utf8",
);

test("typewriter content is readable before script execution and stable for assistive tools", () => {
	assert.match(source, /class="sr-only"/);
	assert.match(source, /aria-hidden="true"/);
	assert.match(source, /prefers-reduced-motion/);
});

test("typewriter lifecycle cancels instances before Swup content replacement", () => {
	assert.match(source, /hooks\.on\("content:replace", disposeInstances\)/);
	assert.match(source, /instance\.destroy\(\)/);
	assert.match(source, /instances\.clear\(\)/);
	assert.doesNotMatch(source, /swup:contentReplaced/);
});
