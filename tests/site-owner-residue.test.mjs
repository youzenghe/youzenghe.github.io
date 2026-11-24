import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { test } from "node:test";
import sharp from "sharp";

const read = name => readFileSync(new URL(`../${name}`, import.meta.url));

test("optional widget configuration does not retain the prior owner's personal link", () => {
	const config = read("src/config/pioConfig.ts").toString();
	assert.doesNotMatch(config, /github\.com\/aicorein|melodyecho|miku\.top|律回/i);
	assert.match(config, /https:\/\/github\.com\/youzenghe/);
});

test("legacy avatar PNG path serves the current supplied avatar exactly", () => {
	const digest = bytes => createHash("sha256").update(bytes).digest("hex");
	assert.equal(digest(read("public/static/avatar.png")), digest(read("public/static/profile-avatar-chibi.png")));
});

test("legacy avatar format variants use the current avatar's dimensions", async () => {
	const reference = await sharp(read("public/static/profile-avatar-chibi.png")).flatten({background:"#ffffff"}).removeAlpha().raw().toBuffer();
	for (const name of ["public/static/avatar.jpg", "public/static/avatar.webp", "public/static/avatar.avif", "public/pio/static/avatar.jpg"]) {
		const meta = await sharp(read(name)).metadata();
		assert.equal(meta.width, 256, name);
		assert.equal(meta.height, 256, name);
		const pixels = await sharp(read(name)).flatten({background:"#ffffff"}).removeAlpha().raw().toBuffer();
		assert.equal(pixels.length, reference.length);
		const averageDelta = pixels.reduce((total, value, i) => total + Math.abs(value-reference[i]), 0) / pixels.length;
		assert.ok(averageDelta < 8, `${name}: pixel delta ${averageDelta}`);
	}
});

test("the personal about pages point to the current identity without erasing theme credit", () => {
	const about = read("src/content/spec/about.md").toString();
	const me = read("src/content/spec/about-me.md").toString();
	assert.match(me, /AAA乔瓮批发宝哥/);
	assert.match(about, /youzenghe\/youzenghe\.github\.io/);
	assert.match(about, /LyraVoid\/Mizuki/);
	for (const content of [about, me]) assert.doesNotMatch(content, /melodyecho|meloland|glowmem|aicorein@|律回|杭州电子/i);
});
