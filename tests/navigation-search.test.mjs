import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const navigation = new URL(
	"../src/components/organisms/navigation/",
	import.meta.url,
);

test("desktop search uses separate native button and input controls", async () => {
	const source = await readFile(new URL("Search.svelte", navigation), "utf8");
	for (const button of source.match(/<button\b.*?<\/button>/gs) ?? []) {
		assert.ok(
			!button.includes("<input"),
			"input must not be nested in a button",
		);
	}
});

test("both search inputs have labels and use the same query state", async () => {
	const source = await readFile(new URL("Search.svelte", navigation), "utf8");
	const inputs = source.match(/<input\b.*?\/>/gs) ?? [];
	assert.equal(inputs.length, 2);
	for (const input of inputs) {
		assert.match(input, /aria-label=/);
		assert.match(input, /bind:value=\{keyword\}/);
	}
});

test("navigation and search share the 1280px desktop breakpoint", async () => {
	const navbar = await readFile(new URL("Navbar.astro", navigation), "utf8");
	const search = await readFile(new URL("Search.svelte", navigation), "utf8");
	const styles = await readFile(
		new URL("../src/styles/main.css", import.meta.url),
		"utf8",
	);
	const desktopBreakpoint = Number(
		styles.match(/--breakpoint-lg:\s*(\d+)px/)[1],
	);
	assert.equal(desktopBreakpoint, 1280);
	assert.match(navbar, /id="navbar-links-container".*?hidden lg:flex/s);
	assert.match(navbar, /lg:!hidden.*?id="nav-menu-switch"/s);
	assert.match(search, /hidden lg:block/);
	assert.match(search, /lg:hidden/);
	assert.match(search, /min-width: 1280px/);
	assert.doesNotMatch(navbar + search, /\bxl:/);
});

test("dropdowns do not rely on a one-shot DOMContentLoaded listener", async () => {
	for (const name of ["DropdownMenu.astro", "NavMenuPanel.astro"]) {
		const source = await readFile(new URL(name, navigation), "utf8");
		assert.doesNotMatch(source, /addEventListener\("DOMContentLoaded"/);
	}
});

test("search dismissal updates the panel before shared click handlers run", async () => {
	const source = await readFile(new URL("Search.svelte", navigation), "utf8");
	const dismissal = source.slice(
		source.indexOf("function closeSearch("),
		source.indexOf("async function openSearch("),
	);
	assert.ok(dismissal.includes('classList.add("float-panel-closed")'));
	assert.ok(dismissal.includes("panel.inert = true"));
});

const deferred = () => {
	let resolve;
	let reject;
	const promise = new Promise((yes, no) => {
		resolve = yes;
		reject = no;
	});
	return { promise, resolve, reject };
};

test("only the newest search may publish its results", async () => {
	const { createLatestSearch } = await import(
		new URL("search-controller.mjs", navigation)
	);
	const oldResponse = deferred();
	const newResponse = deferred();
	const controller = createLatestSearch((query) =>
		query === "old" ? oldResponse.promise : newResponse.promise,
	);
	const oldRun = controller.run("old");
	const newRun = controller.run("new");
	newResponse.resolve(["new"]);
	assert.deepEqual(await newRun, ["new"]);
	oldResponse.resolve(["old"]);
	assert.equal(await oldRun, null);
});

test("closing or editing the query invalidates pending search work", async () => {
	const { createLatestSearch } = await import(
		new URL("search-controller.mjs", navigation)
	);
	const response = deferred();
	const controller = createLatestSearch(() => response.promise);
	const run = controller.run("query");
	controller.invalidate();
	response.resolve(["query"]);
	assert.equal(await run, null);
});

test("stale errors are ignored but current search failures are reported", async () => {
	const { createLatestSearch } = await import(
		new URL("search-controller.mjs", navigation)
	);
	const response = deferred();
	const controller = createLatestSearch(() => response.promise);
	const run = controller.run("query");
	controller.invalidate();
	response.reject(new Error("unavailable"));
	assert.equal(await run, null);
	await assert.rejects(controller.run("query"), /unavailable/);
});

test("Pagefind loading coalesces imports and configures the configured base URL", async () => {
	const { createPagefindLoader } = await import(
		new URL("search-controller.mjs", navigation)
	);
	const imported = deferred();
	const paths = [];
	const settings = [];
	const engine = { options: async (options) => settings.push(options) };
	const load = createPagefindLoader("/blog/", (path) => {
		paths.push(path);
		return imported.promise;
	});
	const first = load();
	const second = load();
	assert.equal(first, second);
	imported.resolve(engine);
	assert.equal(await first, engine);
	assert.equal(await load(), engine);
	assert.deepEqual(paths, ["/blog/pagefind/pagefind.js"]);
	assert.deepEqual(settings, [{ excerptLength: 20 }]);
});

test("failed Pagefind initialization can be retried", async () => {
	const { createPagefindLoader } = await import(
		new URL("search-controller.mjs", navigation)
	);
	let attempts = 0;
	const engine = { options: async () => {} };
	const load = createPagefindLoader("/", async () => {
		if (++attempts === 1) throw new Error("missing index");
		return engine;
	});
	await assert.rejects(load(), /missing index/);
	assert.equal(await load(), engine);
	assert.equal(attempts, 2);
});

// These small DOM-shaped fixtures exercise event/state code, not layout.
class ElementFixture extends EventTarget {
	attributes = new Map();
	classes = new Set(["float-panel-closed"]);
	inert = false;
	focused = false;
	classList = {
		toggle: (name, force) =>
			force ? this.classes.add(name) : this.classes.delete(name),
	};
	setAttribute(name, value) {
		this.attributes.set(name, value);
	}
	getAttribute(name) {
		return this.attributes.get(name) ?? null;
	}
	focus() {
		this.focused = true;
	}
	contains(node) {
		return node === this;
	}
}

test("closed panels are inert and triggers reflect their visible state", async () => {
	const { setPanelState } = await import(
		new URL("navigation-runtime.ts", navigation)
	);
	const panel = new ElementFixture();
	const trigger = new ElementFixture();
	setPanelState(panel, trigger, false);
	assert.equal(panel.inert, true);
	assert.equal(panel.getAttribute("aria-hidden"), "true");
	assert.equal(trigger.getAttribute("aria-expanded"), "false");
	setPanelState(panel, trigger, true);
	assert.equal(panel.inert, false);
	assert.equal(panel.classes.has("float-panel-closed"), false);
	assert.equal(trigger.getAttribute("aria-expanded"), "true");
});

test("mobile dropdown responds to click, arrow keys, Escape and disposal", async () => {
	const { bindDropdown } = await import(
		new URL("navigation-runtime.ts", navigation)
	);
	const root = new ElementFixture();
	const trigger = new ElementFixture();
	const menu = new ElementFixture();
	const item = new ElementFixture();
	root.querySelector = (selector) =>
		selector.includes("trigger") ? trigger : menu;
	menu.querySelectorAll = () => [item];
	const binding = bindDropdown(root, true);
	assert.equal(menu.inert, true);
	trigger.dispatchEvent(new Event("click"));
	assert.equal(trigger.getAttribute("aria-expanded"), "true");
	assert.equal(menu.inert, false);
	trigger.dispatchEvent(new Event("click"));
	assert.equal(trigger.getAttribute("aria-expanded"), "false");
	const down = new Event("keydown", { cancelable: true });
	Object.defineProperty(down, "key", { value: "ArrowDown" });
	trigger.dispatchEvent(down);
	assert.equal(item.focused, true);
	assert.equal(down.defaultPrevented, true);
	const escapeKey = new Event("keydown", { cancelable: true });
	Object.defineProperty(escapeKey, "key", { value: "Escape" });
	root.dispatchEvent(escapeKey);
	assert.equal(menu.inert, true);
	assert.equal(trigger.focused, true);
	binding.dispose();
	trigger.dispatchEvent(new Event("click"));
	assert.equal(trigger.getAttribute("aria-expanded"), "false");
});
