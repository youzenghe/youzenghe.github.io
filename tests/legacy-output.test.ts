import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("legacy HTML URLs are file endpoints, not directory-format pages", () => {
	const source = readFileSync(
		new URL("../src/pages/pages/[legacy].html.ts", import.meta.url),
		"utf8",
	);
	assert.match(source, /APIRoute/);
	assert.match(source, /text\/html/);
	assert.match(source, /resolveLegacyDestination/);
});
