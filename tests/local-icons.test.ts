import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { compile } from "svelte/compiler";
import {
	fallbackLocalIcon,
	localIconNames,
	resolveLocalIcon,
} from "../src/utils/local-icons";

test("selected strings resolve directly to local SVG data", () => {
	for (const name of [
		"material-symbols:search",
		"material-symbols:pause",
		"material-symbols:play-arrow",
		"fa7-solid:chevron-right",
		"mdi:github",
	]) {
		const icon = resolveLocalIcon(name);
		assert.notEqual(icon, fallbackLocalIcon, name);
		assert.ok(icon.body.length > 0);
		assert.ok((icon.width ?? 16) > 0);
	}
});

test("selected collection aliases retain their canonical parent SVG", () => {
	const alias = resolveLocalIcon("material-symbols:search-outline");
	assert.notEqual(alias, fallbackLocalIcon);
	assert.deepEqual(alias, resolveLocalIcon("material-symbols:search"));
});

test("missing families get an explicit local loading substitute or generic fallback", () => {
	assert.notEqual(resolveLocalIcon("eos-icons:loading"), fallbackLocalIcon);
	assert.notEqual(
		resolveLocalIcon("svg-spinners:90-ring-with-bg"),
		fallbackLocalIcon,
	);
	assert.equal(resolveLocalIcon("unknown:unrecorded"), fallbackLocalIcon);
	assert.equal(resolveLocalIcon(""), fallbackLocalIcon);
	assert.equal(resolveLocalIcon("__proto__"), fallbackLocalIcon);
});

test("supplied icon objects pass through without fetching or registration", () => {
	const icon = { body: '<path d="M0 0h8v8H0z"/>', width: 8, height: 8 };
	assert.equal(resolveLocalIcon(icon), icon);
});

test("the wrapper uses the offline component and forwards existing props", () => {
	const source = fs.readFileSync(
		new URL("../src/components/common/LocalIcon.svelte", import.meta.url),
		"utf8",
	);
	assert.match(source, /@iconify\/svelte\/dist\/OfflineIcon\.svelte/);
	assert.match(source, /\.\.\.props/);
	assert.doesNotMatch(source, /fetch\(|addIcon\(|addCollection\(|import\(/);
	for (const generate of ["client", "server"] as const) {
		assert.deepEqual(
			compile(source, { filename: "LocalIcon.svelte", generate }).warnings,
			[],
		);
	}
});

test("selected data is bounded rather than shipping complete icon collections", () => {
	assert.ok(localIconNames.length > 40);
	assert.ok(localIconNames.length < 250);
	const source = fs.readFileSync(
		new URL("../src/utils/local-icon-data.ts", import.meta.url),
		"utf8",
	);
	assert.ok(Buffer.byteLength(source) < 256 * 1024);
	assert.doesNotMatch(source, /import .*@iconify-json/);
});

test("the Astro icon atom renders local SVG rather than a network-backed element", () => {
	const source = fs.readFileSync(
		new URL("../src/components/atoms/Icon/Icon.astro", import.meta.url),
		"utf8",
	);
	assert.doesNotMatch(source, /<iconify-icon|<script|MutationObserver|fetch\(/);
	assert.match(source, /<svg/);
	assert.match(source, /resolveLocalIcon/);
});

test("legacy loader callers remain compatible without external script loading", async () => {
	const source = fs.readFileSync(
		new URL("../src/utils/icon-loader.ts", import.meta.url),
		"utf8",
	);
	assert.doesNotMatch(source, /fetch\(|https:\/\/|createElement\("script"\)/);
	const { loadIconify, preloadIcons, iconLoader } = await import(
		"../src/utils/icon-loader"
	);
	await loadIconify();
	await preloadIcons(["material-symbols:search", "unavailable:icon"]);
	assert.deepEqual(iconLoader.getLoadState(), {
		isLoaded: true,
		isLoading: false,
	});
});

test("current literal and dynamic-branch Svelte icon names are present locally", () => {
	function check(directory: string): void {
		for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
			const file = path.join(directory, entry.name);
			if (entry.isDirectory()) check(file);
			else if (entry.name.endsWith(".svelte")) {
				for (const match of fs
					.readFileSync(file, "utf8")
					.matchAll(
						/["'`]((?:material-symbols|mdi|fa7-solid|fa7-brands|fa7-regular|simple-icons|eos-icons|svg-spinners):[a-z0-9-]+)["'`]/g,
					)) {
					assert.notEqual(
						resolveLocalIcon(match[1]),
						fallbackLocalIcon,
						`${file}: ${match[1]}`,
					);
				}
			}
		}
	}
	check(fileURLToPath(new URL("../src/components", import.meta.url)));
});

test("legacy custom-element registration renders local SVG and is idempotent", async () => {
	const globals = globalThis as unknown as Record<string, unknown>;
	const keys = ["window", "document", "HTMLElement"];
	const previous = keys.map(
		(key) => [key, Object.hasOwn(globals, key), globals[key]] as const,
	);
	const definitions = new Map<string, new () => FakeElement>();
	class FakeElement {
		attributes = new Map<string, string>();
		children: FakeElement[] = [];
		innerHTML = "";
		getAttribute(name: string) {
			return this.attributes.get(name) ?? null;
		}
		setAttribute(name: string, value: string) {
			this.attributes.set(name, value);
		}
		replaceChildren(element: FakeElement) {
			this.children = [element];
		}
	}
	let registrationCount = 0;
	globals.HTMLElement = FakeElement;
	globals.document = { createElementNS: () => new FakeElement() };
	globals.window = {
		customElements: {
			get: (name: string) => definitions.get(name),
			define: (name: string, definition: new () => FakeElement) => {
				definitions.set(name, definition);
				registrationCount++;
			},
		},
	};
	try {
		const { loadIconify } = await import("../src/utils/icon-loader");
		await loadIconify();
		await loadIconify();
		assert.equal(registrationCount, 1);
		const Definition = definitions.get("iconify-icon");
		assert.ok(Definition);
		const element = new Definition() as FakeElement & {
			connectedCallback(): void;
			attributeChangedCallback(): void;
		};
		element.setAttribute("icon", "material-symbols:search-outline");
		element.connectedCallback();
		assert.equal(
			element.children[0].innerHTML,
			resolveLocalIcon("material-symbols:search").body,
		);
		assert.equal(element.getAttribute("data-icon-fallback"), "false");
		element.setAttribute("icon", "unavailable:icon");
		element.attributeChangedCallback();
		assert.equal(element.children[0].innerHTML, fallbackLocalIcon.body);
		assert.equal(element.getAttribute("data-icon-fallback"), "true");
	} finally {
		for (const [key, existed, value] of previous) {
			if (existed) globals[key] = value;
			else delete globals[key];
		}
	}
});
