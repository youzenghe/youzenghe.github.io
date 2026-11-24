import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import {
	pickBackground,
	backgroundDevice,
	normalizeBackgroundPool,
	BackgroundRotation,
} from "../src/utils/navigation-background.ts";
import pools from "../src/data/background-pool.json";

test("local background pool contains51desktop and154mobileWebPs", () => {
	assert.equal(pools.desktop.length, 51);
	assert.equal(pools.mobile.length, 154);
	for (const [device, paths] of Object.entries(pools)) {
		assert.equal(new Set(paths).size, paths.length);
		for (const url of paths) {
			assert.match(url, new RegExp(`^/assets/bg-pool/${device}/[^/]+\\.webp$`));
			assert.ok(
				fs.statSync(new URL("../public" + url, import.meta.url)).isFile(),
			);
		}
	}
});
test("desktop backgrounds no longer use the old low-resolution video poster names", () => {
	for (const url of pools.desktop) assert.doesNotMatch(url, /\/bg\d+\.webp$/);
	const files=fs.readdirSync(new URL("../public/assets/bg-pool/desktop/",import.meta.url));
	assert.equal(files.length,51);
});
test("replacement desktop assets are landscape WebPs at their preserved native dimensions",async()=>{
	const {default:sharp}=await import("sharp");
	for(const url of pools.desktop){
		const image=await sharp(fs.readFileSync(new URL("../public"+url,import.meta.url))).metadata();
		assert.equal(image.format,"webp");
		assert.ok(image.width && image.height && image.width>=1000 && image.width>image.height,url);
	}
});
test("non16:9 backgrounds retain aspect ratio rather than being stretched",()=>{
	const source=fs.readFileSync(new URL("../src/components/layout/NavigationBackground.astro",import.meta.url),"utf8");
	assert.match(source,/object-cover/);
	assert.doesNotMatch(source,/object-fill|aspect-video/);
});
test("background selection excludes the previous image without unbounded retries", () => {
	const pool = ["/a.webp", "/b.webp", "/c.webp"];
	assert.equal(
		pickBackground(pool, "/a.webp", () => 0),
		"/b.webp",
	);
	assert.equal(
		pickBackground(pool, "/c.webp", () => 0.99),
		"/b.webp",
	);
	assert.equal(
		pickBackground(["/a.webp"], "/a.webp", () => 0),
		"/a.webp",
	);
	assert.equal(
		pickBackground([], "", () => 0),
		null,
	);
});
test("device selection follows original mobile breakpoint and rejects nonlocal/video inputs", () => {
	assert.equal(backgroundDevice(768), "mobile");
	assert.equal(backgroundDevice(769), "desktop");
	assert.deepEqual(
		normalizeBackgroundPool([
			"/x.webp",
			"/x.webp",
			"//bad/x.webp",
			"/x.webm",
			"https://bad/x.webp",
			"/\\bad.webp",
		]),
		["/x.webp"],
	);
});
test("rotation loads one selected image and changes without consecutive repeats", async () => {
	const loaded: string[] = [],
		applied: string[] = [];
	const rotation = new BackgroundRotation(
		{ desktop: ["/a.webp", "/b.webp"], mobile: ["/m.webp"] },
		async (url) => {
			loaded.push(url);
		},
		(url) => applied.push(url),
		{},
		() => 0,
	);
	assert.equal(await rotation.rotate("desktop"), true);
	assert.equal(await rotation.rotate("desktop"), true);
	assert.deepEqual(loaded, ["/a.webp", "/b.webp"]);
	assert.deepEqual(applied, loaded);
	await rotation.rotate("mobile");
	assert.equal(rotation.current?.device, "mobile");
});
test("rapid navigation and device changes discard obsolete image loads", async () => {
	const pending: { url: string; signal: AbortSignal; resolve: () => void }[] =
			[],
		applied: string[] = [];
	const rotation = new BackgroundRotation(
		{ desktop: ["/a.webp", "/b.webp"], mobile: ["/m.webp"] },
		(url, signal) =>
			new Promise<void>((resolve) => pending.push({ url, signal, resolve })),
		(url) => applied.push(url),
		{},
		() => 0,
	);
	const first = rotation.rotate("desktop"),
		second = rotation.rotate("mobile");
	assert.equal(pending[0].signal.aborted, true);
	pending[1].resolve();
	await second;
	pending[0].resolve();
	await first;
	assert.deepEqual(applied, ["/m.webp"]);
	assert.equal(rotation.current?.url, "/m.webp");
});
test("image failure tries a bounded alternate and keeps the accepted image on total failure", async () => {
	let fail = false;
	const loaded: string[] = [],
		applied: string[] = [];
	const rotation = new BackgroundRotation(
		{ desktop: ["/a.webp", "/b.webp", "/c.webp", "/d.webp"], mobile: [] },
		async (url) => {
			loaded.push(url);
			if (fail) throw new Error("Unavailable");
		},
		(url) => applied.push(url),
		{},
		() => 0,
	);
	await rotation.rotate("desktop");
	fail = true;
	assert.equal(await rotation.rotate("desktop"), false);
	assert.equal(loaded.length, 4);
	assert.deepEqual(applied, ["/a.webp"]);
});
test("suspended page cancels pending work and history excludes last session selection", async () => {
	let resolve!: () => void;
	const applied: string[] = [];
	const rotation = new BackgroundRotation(
		{ desktop: ["/a.webp", "/b.webp"], mobile: [] },
		() => new Promise<void>((done) => (resolve = done)),
		(url) => applied.push(url),
		{ desktop: "/a.webp" },
		() => 0,
	);
	const work = rotation.rotate("desktop");
	rotation.invalidate();
	resolve();
	assert.equal(await work, false);
	assert.deepEqual(applied, []);
});
test("background component renders a responsive selected image rather than entire pools", () => {
	const source = fs.readFileSync(
		new URL(
			"../src/components/layout/NavigationBackground.astro",
			import.meta.url,
		),
		"utf8",
	);
	assert.match(source, /<picture/);
	assert.equal((source.match(/<img\s/g) || []).length, 1);
	assert.doesNotMatch(source, /\.map\(|<video|<template/);
	const banner = fs.readFileSync(
		new URL("../src/components/layout/Banner.astro", import.meta.url),
		"utf8",
	);
	const wallpaper = fs.readFileSync(
		new URL(
			"../src/components/misc/FullscreenWallpaper.astro",
			import.meta.url,
		),
		"utf8",
	);
	for (const component of [banner, wallpaper]) {
		assert.match(component, /<NavigationBackground/);
		assert.doesNotMatch(
			component,
			/startCarousel|setInterval|data-carousel-item/,
		);
	}
});
test("same-page detection captures the click before router history changes", () => {
	const source = fs.readFileSync(
		new URL("../src/scripts/navigation-background.ts", import.meta.url),
		"utf8",
	);
	assert.match(source, /addEventListener\("click",samePageNavigation,true\)/);
	assert.match(
		source,
		/removeEventListener\("click",samePageNavigation,true\)/,
	);
});
