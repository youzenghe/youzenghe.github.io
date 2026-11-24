import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

test("published CJK font has a bundled open-font license", () => {
	const root = new URL("../", import.meta.url);
	const config = readFileSync(new URL("astro.config.mjs", root), "utf8");
	assert.match(config, /LXGW WenKai/);
	assert.doesNotMatch(config, /loli\.(?:ttf|woff2)/i);
	assert.ok(existsSync(new URL("src/assets/fonts/LXGWWenKai-Regular.woff2", root)));
	assert.match(readFileSync(new URL("src/assets/fonts/licenses/LXGW-WenKai-OFL.txt", root), "utf8"), /SIL OPEN FONT LICENSE/);
	for (const name of ["loli.ttf", "loli.woff2"]) assert.equal(existsSync(new URL(`src/assets/fonts/${name}`, root)), false);
});
