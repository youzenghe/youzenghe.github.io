import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const read = (file) =>
	fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("viewport resizing never writes a smaller global text size", () => {
	assert.doesNotMatch(
		read("src/layouts/partials/HeadTags.astro"),
		/documentElement\.style\.fontSize\s*=/,
	);
	assert.match(read("src/layouts/Layout.astro"), /text-\[16px\]/);
	assert.doesNotMatch(read("src/layouts/Layout.astro"), /text-\[14px\]/);
});

test("font acquisition uses local providers and a consistent CJK-first stack", () => {
	assert.doesNotMatch(read("astro.config.mjs"), /fontProviders\.fontsource\(/);
	assert.match(read("astro.config.mjs"), /unicodeRange:/);
	assert.match(
		read("src/styles/main.css"),
		/--font-sans:\s*var\(--font-cjk\),\s*var\(--font-body\)/,
	);
});

test("the shared shell offers a focusable main-content skip destination", () => {
	assert.match(
		read("src/layouts/Layout.astro"),
		/class="skip-link"[^>]*href="#swup-container"/,
	);
	assert.match(
		read("src/layouts/MainGridLayout.astro"),
		/id="swup-container"\s+tabindex="-1"/,
	);
});

test("grid flex tracks permit shrinking and long prose is constrained locally", () => {
	const grid = read("src/utils/grid-layout-utils.ts");
	assert.doesNotMatch(grid, /grid-cols-\[[^\]]*_1fr(?:_|\])/);
	assert.match(grid, /minmax\(0,1fr\)/);
	const styles = read("src/styles/accessibility.css");
	assert.match(styles, /:focus-visible/);
	assert.match(styles, /overflow-wrap:\s*anywhere/);
	assert.match(styles, /prefers-reduced-motion/);
});

test("feed links preserve native navigation without an undefined global handler", () => {
	assert.doesNotMatch(
		read("src/components/organisms/footer/Footer.astro"),
		/onclick=.*navigateToPage/,
	);
});

test("small supporting text and light-theme link tokens retain readable contrast", () => {
	assert.match(read("src/styles/variables.styl"), /--primary: oklch\(0\.52 /);
	assert.match(
		read("src/styles/main.css"),
		/\.text-50\s*\{\s*@apply text-black\/60 dark:text-white\/70/,
	);
	assert.doesNotMatch(
		read("src/components/widgets/profile/Profile.astro"),
		/text-center text-neutral-400/,
	);
});

test("filled accent controls use a separate light/dark foreground token", () => {
	const styles = read("src/styles/accessibility.css");
	assert.match(styles, /--primary-foreground:\s*#17202e/);
	assert.match(styles, /color:\s*var\(--primary-foreground\)/);
});
