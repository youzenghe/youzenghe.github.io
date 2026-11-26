import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { test } from "node:test";
import * as constants from "../src/constants/constants.ts";
import { isIndexablePage } from "../src/utils/crawler-policy.mjs";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("blog and gallery have independent finite page sizes", () => {
	assert.equal(constants.PAGE_SIZE, 5);
	assert.equal((constants as Record<string, unknown>).ALBUM_PAGE_SIZE, 10);
	assert.match(read("src/pages/blog/[...page].astro"), /paginate\(allBlogPosts, \{ pageSize: PAGE_SIZE \}\)/);
});

test("gallery uses a static paginated route without losing its masonry or lightbox", () => {
	const path = "src/pages/albums/[...page].astro";
	assert.ok(existsSync(new URL(`../${path}`, import.meta.url)));
	const source = read(path);
	assert.match(source, /getStaticPaths/);
	assert.match(source, /paginate\(photos, \{ pageSize: ALBUM_PAGE_SIZE \}\)/);
	assert.match(source, /photos = page\.data/);
	assert.match(source, /<Pagination[\s\S]*?basePath="\/albums\/"/);
	assert.match(source, /albumId="photos"/);
	assert.match(source, /class="gallery-masonry"/);
	assert.match(source, /photos\.length === 0/);
	assert.match(source, /siteConfig\.featurePages\.albums\s*\? await scanGalleryPhotos\(\)\s*: \[\]/);
});

test("shared pagination supports independent numbered routes and marks boundaries", () => {
	const source = read("src/components/control/Pagination.astro");
	assert.match(source, /basePath\?: string/);
	assert.match(source, /basePath = BLOG_HOME_PATH/);
	assert.match(source, /return basePath/);
	assert.match(source, /return `\$\{basePath\}\$\{p\}\//);
	assert.match(source, /aria-label="分页导航"/);
	assert.match(source, /aria-current="page"/);
	assert.match(source, /aria-disabled=/);
	assert.match(source, /role=\{page\.url\.prev \? undefined : "link"\}/);
	assert.match(source, /role=\{page\.url\.next \? undefined : "link"\}/);
	assert.doesNotMatch(source, /href=\{page\.url\.(?:prev|next) \|\| ""\}/);
});

test("gallery continuation pages remain canonical sitemap entries", () => {
	assert.equal(isIndexablePage("https://yzh1019.top/albums/2/"), true);
	assert.equal(isIndexablePage("https://yzh1019.top/albums/3/"), true);
	assert.equal(isIndexablePage("https://yzh1019.top/albums/1/"), false);
	assert.equal(isIndexablePage("https://yzh1019.top/albums/2/?view=test"), false);
});
