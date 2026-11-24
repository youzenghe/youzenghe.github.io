import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { compile } from "svelte/compiler";

const require = createRequire(import.meta.url);
const astroRequire = createRequire(require.resolve("astro/package.json"));
const { transform } = astroRequire("@astrojs/compiler-rs");
const stylus = require("stylus");
const read = (path) =>
	readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

for (const path of [
	"src/components/common/FloatingButton.astro",
	"src/components/control/FloatingControls.astro",
	"src/components/control/BackToHome.astro",
	"src/components/control/BackToTop.astro",
]) {
	test(`${path} compiles with the installed Astro compiler`, () => {
		const result = transform(read(path), { filename: path });
		assert.deepEqual(result.diagnostics, []);
	});
}

for (const generate of ["client", "server"]) {
	test(`MusicFabButton compiles for ${generate} without warnings`, () => {
		const path = "src/components/control/MusicFabButton.svelte";
		const result = compile(read(path), { filename: path, generate });
		assert.deepEqual(result.warnings, []);
	});
}

test("FloatingButton Stylus compiles with the shared dimensions and visible focus", () => {
	const source = read("src/components/common/FloatingButton.astro");
	const style = source.match(/<style lang="stylus">([\s\S]*?)<\/style>/)[1];
	const css = stylus.render(style);
	assert.match(css, /width: var\(--fab-button-size, 3rem\)/);
	assert.match(css, /height: var\(--fab-button-size, 3rem\)/);
	assert.match(css, /\.floating-btn:focus-visible\s*\{/);
	assert.match(css, /\.floating-btn\.hide\s*\{\s*visibility: hidden/);
});

test("one size contract defines the desktop/tablet/mobile boundary values", () => {
	const css = read("src/components/control/floating-control-sizes.css");
	assert.match(css, /:root\s*\{\s*--fab-button-size: 3rem;/);
	assert.match(
		css,
		/@media \(width <= 768px\)\s*\{\s*:root\s*\{\s*--fab-button-size: 2\.75rem;/,
	);
	assert.match(
		css,
		/@media \(width <= 480px\)\s*\{\s*:root\s*\{\s*--fab-button-size: 2\.5rem;/,
	);
});
