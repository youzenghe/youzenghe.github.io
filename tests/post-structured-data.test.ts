import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { parse } from "node-html-parser";
import {
	getStructuredAuthor,
	serializeJsonLd,
} from "../src/utils/post-structured-data.ts";

test("explicit article authors do not inherit a different profile's identity URL", () => {
	assert.deepEqual(
		getStructuredAuthor("超级小识", "律回", "https://miku.top/"),
		{ "@type": "Person", name: "超级小识" },
	);
	assert.deepEqual(getStructuredAuthor("", "律回", "https://miku.top/"), {
		"@type": "Person",
		name: "律回",
		url: "https://miku.top/",
	});
	assert.deepEqual(getStructuredAuthor("律回", "律回", "https://miku.top/"), {
		"@type": "Person",
		name: "律回",
		url: "https://miku.top/",
	});
});

test("JSON-LD values cannot terminate the HTML script element", () => {
	const value = {
		author: { name: '</script><img src=x onerror="alert(1)">' },
		title: "<标题> & 引号",
	};
	const serialized = serializeJsonLd(value);
	assert.doesNotMatch(serialized, /</);
	const html = parse(
		`<script type="application/ld+json">${serialized}</script>`,
	);
	assert.equal(html.querySelectorAll("script").length, 1);
	assert.equal(html.querySelectorAll("img").length, 0);
	const script = html.querySelector("script");
	assert.ok(script);
	assert.deepEqual(JSON.parse(script.textContent), value);
});

test("both article route variants use safe serialization and shared author logic", () => {
	for (const route of ["posts/[...slug].astro", "[...permalink].astro"]) {
		const source = fs.readFileSync(
			new URL(`../src/pages/${route}`, import.meta.url),
			"utf8",
		);
		assert.match(
			source,
			/author: getStructuredAuthor\(entry\.data\.author, profileConfig\.name, Astro\.site\)/,
		);
		assert.match(source, /set:html=\{serializeJsonLd\(jsonLd\)\}/);
		assert.doesNotMatch(source, /set:html=\{JSON\.stringify\(jsonLd\)\}/);
	}
});
