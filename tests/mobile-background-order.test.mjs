import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("device-width viewport is parsed before synchronous background choice", () => {
	const layout = read("src/layouts/Layout.astro");
	const head = layout.slice(layout.indexOf("<head>"));
	const viewport = head.indexOf('name="viewport"');
	const seed = head.indexOf("<InitialBackground");
	assert.ok(viewport >= 0 && viewport < seed, "Mobile viewport must exist before the random background seed runs");
	assert.match(head.slice(viewport, viewport + 100), /width=device-width/);
	const tags = read("src/layouts/partials/HeadTags.astro");
	assert.doesNotMatch(tags, /name="viewport"/);
});
