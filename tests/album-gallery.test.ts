import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
	mkdtemp, mkdir, readdir, readFile, rm, symlink, writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { FANCYBOX_SELECTORS } from "../src/scripts/core/swup-config.ts";
import { scanAlbums, scanGalleryPhotos } from "../src/utils/album-scanner.ts";

const galleryDirectory = fileURLToPath(new URL("../public/images/albums/", import.meta.url));
const expectedImages = new Map([
	["0.webp", "dac2ec676d8b431625ecdbaacd85d3a3a178d4fb59106af8d9ef937c221e93ff"],
	["6.webp", "9f82dfa61799f5fc811da3ccff6b1a99b019939d639569d4b4bd93faafe976f5"],
	["11.webp", "e08978f2e878142d834e6eb8a6139411771c176cfdfaaf1c1e21726eb1c8e4a0"],
	["12.webp", "2950e8415b4e78b60c92d5e69b91b03d481c1f99d0e23011c02669af153360c8"],
	["1182983.webp", "50d9a7c8da91ce9d47a268309ee04b4225bd5e0fe010187d06fab0e528ebea6e"],
	["1198959.webp", "0d719419333f3f125e4ce6ec5054d4def6057463e65f10b631ca315866bd1f4a"],
	["1200792.webp", "736dc42cff2c31ec9c0d9c97b44e418a41179701cc62057cd0013a4700aee32b"],
	["1201376.webp", "89e47ba14cd8fc4ad91aef96c82171594beaf96be8c1150af72c4b563b5cd2a7"],
	["1231053.webp", "5815060b028ea2941d1a46f7f453c6ad2eb16737713ddb0b91f7517c4b0f8664"],
	["1257649.webp", "8b5f47ea42a66dcdc2d64831a9cf75278c2770c811a7c05d67a3a4cf534420d7"],
	["1270223.webp", "a937afc98b38cf26a8304829b310174c2761a1fbbb3ef8ca3c6e5a983fa4e5ae"],
	["1279979.webp", "6d93c633bab9dc21418a1aba295954404d70e607872dee280534cb6bce20528c"],
	["1314948.webp", "6520aee3a3284dd621d1e1e8fc30863871b0d86f4bcc4e3904a4cf5c7268f991"],
	["1358186.webp", "c445d35091849f6a6870ebade3e30dca5a82328f44a414547f528ece2715af2b"],
	["1358187.webp", "40e2868549688c142fba6306e1baeab91b613023634cc0510d61d60b02daa372"],
	["1358189.webp", "6b9ded2da6608e8a29bd744a3e55865974aea1827f2209605197c97f43588019"],
	["1358190.webp", "93d048290fa3d99ca40c93a8a4b47cef049a5f7858267ad47d1a25aedda190bc"],
	["1358191.webp", "1cc5e89141f47048580df5ddc9e9bab7cc5d0123aadc33d2c03081e2bd508b43"],
	["1358192.webp", "e94d2326c76f71129a5a02fbfcbd9e555956d00edbbf8e11353c66c9cdaf43ca"],
	["1358193.webp", "dd69f369778435a8345ee22ef75dc81c2cf28c4c2dfffb364085aeec0b0bb51d"],
	["1358196.webp", "2eef23956ff2c62ba72fc95793fde59f6daf41ef72f416286e85e053eb661578"],
	["1358198.webp", "c6fb9c9481e1ce1124c8bdf30381e106f202ab771d0935050fb29f73393e07f3"],
	["bgcbw.webp", "ca4f9f77e6bd9c9c5386a6c111c7cfe51c0b9430daeb9091ca5ae4791e4659e3"],
	["miku.webp", "9d8317ffbba44884555a30b4f07ccc1f9aa7b1d18d733c9cd6cb461eeaafae43"],
	["小南娘.webp", "f7dab6c758d8f86bea9afecbee5070f967b587cf2a83acaf761207e8b23438a3"],
	["白子.webp", "9755e3d056466d4263542577afae7d8f87615be4d60947e4878cd1bf8b2f943e"],
]);

async function photoCardSource() {
	return readFile(new URL("../src/components/features/albums/PhotoCard.astro", import.meta.url), "utf8");
}

test("the gallery owns exactly the 26 replacement images with unchanged bytes", async () => {
	const entries = await readdir(galleryDirectory, { withFileTypes: true });
	assert.ok(entries.every((entry) => entry.isFile()), "legacy album directories must be removed");
	assert.deepEqual(entries.map((entry) => entry.name).sort(), [...expectedImages.keys()].sort());
	for (const [name, digest] of expectedImages) {
		const bytes = await readFile(path.join(galleryDirectory, name));
		assert.equal(createHash("sha256").update(bytes).digest("hex"), digest, name);
	}
});

test("the gallery scans every replacement photo once with intrinsic sizing", async () => {
	const photos = await scanGalleryPhotos();
	assert.equal(photos.length, 26);
	assert.equal(new Set(photos.map((photo) => photo.src)).size, 26);
	assert.equal(new Set(photos.map((photo) => photo.id)).size, 26);
	assert.deepEqual(photos.slice(0, 4).map((photo) => photo.alt), ["0", "6", "11", "12"]);
	for (const photo of photos) {
		const name = decodeURIComponent(photo.src.slice("/images/albums/".length));
		assert.ok(expectedImages.has(name), photo.src);
		const metadata = await sharp(path.join(galleryDirectory, name)).metadata();
		assert.equal(photo.width, metadata.width, name);
		assert.equal(photo.height, metadata.height, name);
		assert.ok(photo.alt);
	}
});

test("flat scanning needs no album metadata, includes covers, and encodes filenames", async () => {
	const directory = await mkdtemp(path.join(tmpdir(), "album-gallery-"));
	try {
		const image = await sharp({ create: { width: 37, height: 21, channels: 3, background: "#39c5bb" } }).webp().toBuffer();
		for (const name of ["10.webp", "2.webp", "cover.webp", "白子_壁纸 #1.WEBP"]) {
			await writeFile(path.join(directory, name), image);
		}
		await writeFile(path.join(directory, "README.md"), "not a photo");
		await mkdir(path.join(directory, "legacy.webp"));
		await writeFile(path.join(directory, "legacy.webp", "old.webp"), image);
		await symlink(path.join(directory, "2.webp"), path.join(directory, "alias.webp"));
		const photos = await scanGalleryPhotos(directory);
		assert.deepEqual(photos.map((photo) => photo.alt), ["2", "10", "cover", "白子_壁纸 #1"]);
		assert.equal(photos[3].src, `/images/albums/${encodeURIComponent("白子_壁纸 #1.WEBP")}`);
		assert.ok(photos.every((photo) => photo.width === 37 && photo.height === 21));
		assert.deepEqual(await scanGalleryPhotos(directory), photos, "ordering and IDs stay stable");
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("missing gallery directories produce an empty gallery", async () => {
	const directory = await mkdtemp(path.join(tmpdir(), "album-gallery-empty-"));
	try {
		assert.deepEqual(await scanGalleryPhotos(path.join(directory, "missing")), []);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("replacement assets do not generate intermediate album routes", async () => {
	assert.deepEqual(await scanAlbums(), []);
});

test("albums index renders photos directly without cards or category selectors", async () => {
	const source = await readFile(new URL("../src/pages/albums.astro", import.meta.url), "utf8");
	assert.match(source, /await scanGalleryPhotos\(\)/);
	assert.match(source, /photos\.map\(\(photo\) =>/);
	assert.match(source, /<PhotoCard\b/);
	assert.match(source, /src=\{photo\.src\}/);
	assert.match(source, /width=\{photo\.width\}/);
	assert.match(source, /height=\{photo\.height\}/);
	assert.match(source, /albumId="photos"/);
	assert.match(source, /class="gallery-masonry"/);
	assert.match(source, /<PageHeader\b/);
	assert.match(source, /class="card-base/);
	assert.match(source, /Astro\.redirect\("\/404\.html"\)/);
	assert.doesNotMatch(source, /AlbumCard|FilterTabs|filter-tabs-handler|filterTabs|allTags|no-results|\/albums\/\$\{/);
});

test("photo card markup retains accessible grouped lightbox links and lazy sized images", async () => {
	const source = await photoCardSource();
	assert.match(source, /<a\s+href=\{src\}/, "photos need keyboard-accessible links");
	assert.match(source, /data-fancybox=\{`gallery-\$\{albumId\}`\}/);
	assert.match(source, /data-src=\{src\}/);
	assert.match(source, /data-type="image"/);
	assert.match(source, /data-caption=\{alt\}/);
	assert.match(source, /<img\s+src=\{src\}/);
	assert.match(source, /alt=\{alt\}/);
	assert.match(source, /loading="lazy"/);
	assert.match(source, /decoding="async"/);
	assert.match(source, /width=\{width\}/);
	assert.match(source, /height=\{height\}/);
	assert.match(source, /w-full h-auto/);
	assert.match(source, /gallery-photo-card break-inside-avoid/);
});

test("photo cards remain usable for legacy callers without dimensions", async () => {
	const source = await photoCardSource();
	assert.match(source, /extends PhotoCardProps/);
	assert.match(source, /width\?: number/);
	assert.match(source, /height\?: number/);
	assert.match(source, /alt = ""/);
});

test("gallery styling preserves full-width mobile photos and wider masonry layouts", async () => {
	const source = await readFile(new URL("../src/pages/albums.astro", import.meta.url), "utf8");
	assert.match(source, /#albums-grid\s*\{\s*column-width: auto;\s*column-count: 1;/);
	assert.match(source, /@media \(width >= 640px\)\s*\{\s*#albums-grid\s*\{\s*column-count: 2;/);
	assert.match(source, /@media \(width >= 1024px\)\s*\{\s*#main-grid\[data-layout-mode="grid"\] #albums-grid\s*\{\s*column-count: 3;/);
	const styles = await readFile(new URL("../src/styles/albums.css", import.meta.url), "utf8");
	assert.match(styles, /\.gallery-masonry\s*\{[^}]*column-gap:/);
	assert.match(styles, /\.gallery-masonry \.gallery-photo-card\s*\{\s*break-inside: avoid;/);
});

test("gallery lightbox attributes are covered by the existing Fancybox handler", async () => {
	assert.equal(FANCYBOX_SELECTORS.singleFancybox, "[data-fancybox]:not(.moment-images a):not(.image-grid [data-fancybox])");
	const source = await photoCardSource();
	assert.match(source, /data-fancybox=\{`gallery-\$\{albumId\}`\}/);
	assert.doesNotMatch(source, /moment-images|image-grid/);
});
