import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { escapeXmlText, getFeedAuthor } from "../src/utils/feed-author.ts";

test("feed attribution prefers the explicit article author and safely falls back", () => {
	assert.equal(getFeedAuthor({ author: "超级小识" }, "律回"), "超级小识");
	assert.equal(getFeedAuthor({ author: "" }, "律回"), "律回");
	assert.equal(getFeedAuthor({}, "律回"), "律回");
	assert.equal(escapeXmlText('A&B <C> "D"'), "A&amp;B &lt;C&gt; &quot;D&quot;");
});

test("Atom author emission uses the explicit-author helper and XML escaping", () => {
	const source = fs.readFileSync(
		new URL("../src/pages/atom.xml.ts", import.meta.url),
		"utf8",
	);
	assert.match(
		source,
		/escapeXmlText\(getFeedAuthor\(post\.data, profileConfig\.name\)\)/,
	);
	assert.doesNotMatch(source, /<name>\$\{profileConfig\.name\}<\/name>/);
});
