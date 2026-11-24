import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { BackgroundRotation } from "../src/utils/navigation-background.ts";

test("initial background seed chooses before deferred modules and shares one selection", async () => {
	const source = readFileSync(
		new URL("../src/scripts/initial-background.js", import.meta.url),
		"utf8",
	);
	const stored = new Map([["navigation-background-desktop", "/a.webp"]]);
	const window = {
		matchMedia: () => ({ matches: false }),
		sessionStorage: {
			getItem: (k: string) => stored.get(k),
			setItem: (k: string, v: string) => stored.set(k, v),
		},
	};
	const sandbox = {
		window,
		Math: { random: () => 0, floor: Math.floor },
		document: {
			currentScript: {
				dataset: {
					pools: JSON.stringify({
						desktop: ["/a.webp", "/b.webp"],
						mobile: ["/m.webp"],
					}),
				},
			},
		},
	};
	vm.runInNewContext(source, sandbox);
	assert.equal((window as any).__navigationBackground.url, "/b.webp");
	assert.equal((window as any).__navigationBackground.device, "desktop");
	assert.equal(stored.get("navigation-background-desktop"), "/b.webp");
	vm.runInNewContext(source, sandbox);
	assert.equal((window as any).__navigationBackground.url, "/b.webp");
});

test("mobile initial seed works when browser storage is unavailable", () => {
	const source = readFileSync(
		new URL("../src/scripts/initial-background.js", import.meta.url),
		"utf8",
	);
	const window = {
		matchMedia: () => ({ matches: true }),
		sessionStorage: {
			getItem() {
				throw new Error("Storage denied");
			},
			setItem() {
				throw new Error("Storage denied");
			},
		},
	};
	vm.runInNewContext(source, {
		window,
		Math: { random: () => 0.9, floor: Math.floor },
		document: {
			currentScript: {
				dataset: {
					pools: JSON.stringify({
						desktop: ["/a.webp"],
						mobile: ["/m.webp", "/n.webp"],
					}),
				},
			},
		},
	});
	assert.equal((window as any).__navigationBackground.url, "/n.webp");
	assert.equal((window as any).__navigationBackground.device, "mobile");
});

test("rotation adopts a valid seeded image without loading or replacing it", async () => {
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
	assert.equal(rotation.adopt("/b.webp", "desktop"), true);
	assert.deepEqual(loaded, []);
	assert.deepEqual(applied, ["/b.webp"]);
	assert.equal(await rotation.rotate("desktop"), true);
	assert.deepEqual(loaded, ["/a.webp"]);
	assert.equal(rotation.adopt("https://bad/image.webp", "desktop"), false);
});

test("script-enabled picture has no fixed initial image URL", () => {
	const source = readFileSync(
		new URL(
			"../src/components/layout/NavigationBackground.astro",
			import.meta.url,
		),
		"utf8",
	);
	const scripted = source.replace(/<noscript>[\s\S]*?<\/noscript>/g, "");
	assert.doesNotMatch(scripted, /src=\{pools\.|srcset=\{pools\./);
	assert.match(source, /<noscript>/);
	const layout = readFileSync(
		new URL("../src/layouts/Layout.astro", import.meta.url),
		"utf8",
	);
	assert.match(layout, /InitialBackground/);
});
