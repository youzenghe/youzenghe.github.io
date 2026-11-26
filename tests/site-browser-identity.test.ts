import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import sharp from "sharp";
import { defaultFavicons } from "../src/constants/icon.ts";

const read = (path: string) =>
	readFileSync(new URL(`../${path}`, import.meta.url));
const faviconPath = "/favicon/profile-avatar-chibi-64.png";

test("the landing browser and social titles use the desk name", () => {
	const html = read("src/entry/landing.html").toString("utf8");
	assert.match(html, /<title>小识书桌<\/title>/);
	assert.match(html, /property="og:title" content="小识书桌"/);
	assert.match(html, /name="twitter:title" content="小识书桌"/);
	assert.doesNotMatch(html, /超级小识的书桌/);
});

test("landing and blog use one theme-independent local avatar favicon", async () => {
	assert.deepEqual(defaultFavicons, [{ src: faviconPath, sizes: "64x64" }]);
	const html = read("src/entry/landing.html").toString("utf8");
	assert.ok(html.includes(`rel="icon" type="image/png" href="${faviconPath}"`));
	const expected = await sharp(read("public/static/profile-avatar-chibi.png"))
		.resize(64, 64)
		.ensureAlpha()
		.raw()
		.toBuffer();
	const actual = await sharp(read(`public${faviconPath}`))
		.ensureAlpha()
		.raw()
		.toBuffer();
	assert.deepEqual(actual, expected);
});

test("compatibility PNG and ICO paths contain the same avatar icon", () => {
	const png = read(`public${faviconPath}`);
	assert.deepEqual(read("public/assets/favicon.png"), png);
	for (const path of ["public/favicon/favicon.ico", "public/favicon.ico"]) {
		const ico = read(path);
		assert.equal(ico.readUInt16LE(0), 0);
		assert.equal(ico.readUInt16LE(2), 1);
		assert.equal(ico.readUInt16LE(4), 1);
		assert.equal(ico[6], 64);
		assert.equal(ico[7], 64);
		const offset = ico.readUInt32LE(18);
		const bytes = ico.readUInt32LE(14);
		assert.deepEqual(ico.subarray(offset, offset + bytes), png);
	}
});
