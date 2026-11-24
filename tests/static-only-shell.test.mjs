import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const read = (path) =>
	fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the shell contains no analytics, remote cover engine or API preconnect", () => {
	assert.doesNotMatch(
		read("src/layouts/Layout.astro"),
		/umami|_0x2fe6|PUBLIC_ENABLE_ANALYTICS/,
	);
	assert.doesNotMatch(
		read("src/layouts/partials/HeadTags.astro"),
		/api\.iconify|preconnect/,
	);
	assert.doesNotMatch(read("astro.config.mjs"), /oddmisc/);
	assert.match(read("src/layouts/Layout.astro"), /connect-src 'self'/);
	assert.match(read("src/layouts/Layout.astro"), /media-src 'self' blob:/);
});

test("background and poster pipelines use only local media", () => {
	assert.doesNotMatch(read("src/config/backgroundWallpaper.ts"), /https?:\/\//);
	assert.doesNotMatch(read("src/utils/grid-layout-utils.ts"), /fetch\(/);
	assert.doesNotMatch(
		read("src/components/misc/FullscreenWallpaper.astro"),
		/fetch\(/,
	);
	assert.doesNotMatch(
		read("src/components/misc/utils/poster-renderer.ts"),
		/images\.weserv/,
	);
});
