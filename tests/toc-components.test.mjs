import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { compile } from "svelte/compiler";

const require = createRequire(import.meta.url);
const astroRequire = createRequire(require.resolve("astro/package.json"));
const { transform } = astroRequire("@astrojs/compiler-rs");
const read = (path) =>
	readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

for (const path of [
	"src/components/features/toc/FloatingTOC.astro",
	"src/components/features/toc/SidebarTOC.astro",
]) {
	test(`${path} compiles without Astro diagnostics`, () => {
		assert.deepEqual(transform(read(path), { filename: path }).diagnostics, []);
	});
}

for (const generate of ["client", "server"]) {
	test(`MobileTOC compiles for ${generate} without Svelte warnings`, () => {
		const path = "src/components/features/toc/MobileTOC.svelte";
		assert.deepEqual(
			compile(read(path), { filename: path, generate }).warnings,
			[],
		);
	});
}
