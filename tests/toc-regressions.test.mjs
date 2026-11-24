import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const read = (file) => readFileSync(path.join(root, file), "utf8");

class Target {
	listeners = new Map();
	addEventListener(name, callback) {
		const callbacks = this.listeners.get(name) ?? new Set();
		callbacks.add(callback);
		this.listeners.set(name, callbacks);
	}
	removeEventListener(name, callback) {
		this.listeners.get(name)?.delete(callback);
	}
	emit(name, event = {}) {
		for (const callback of this.listeners.get(name) ?? []) callback(event);
	}
	count(name) {
		return this.listeners.get(name)?.size ?? 0;
	}
}

function element(id = "", text = "", top = 0, level = 2, anchor = false) {
	const node = new Target();
	const classes = new Set();
	Object.assign(node, {
		id,
		tagName: `H${level}`,
		textContent: text,
		offsetTop: 40,
		inert: false,
		innerHTML: "",
		children: [],
		scrollTop: 120,
		clientHeight: 300,
		scrollHeight: 1000,
		attributes: new Map(),
		classList: {
			contains: (name) => classes.has(name),
			add: (...names) => {
				for (const name of names) classes.add(name);
			},
			remove: (...names) => {
				for (const name of names) classes.delete(name);
			},
			toggle(name, force = !classes.has(name)) {
				force ? classes.add(name) : classes.delete(name);
				return force;
			},
		},
		getBoundingClientRect: () => ({ top, bottom: top + 20, height: 20 }),
		getAttribute(name) {
			return this.attributes.get(name) ?? null;
		},
		setAttribute(name, value) {
			this.attributes.set(name, String(value));
		},
		removeAttribute(name) {
			this.attributes.delete(name);
		},
		querySelectorAll: () => [],
		querySelector: () => null,
		contains: () => false,
		focus() {
			this.focused = true;
		},
		scrollTo(options) {
			this.lastScroll = { ...options };
		},
		cloneNode() {
			const clone = {
				textContent: text,
				querySelectorAll: () =>
					anchor
						? [
								{
									remove() {
										clone.textContent = text.slice(0, -1);
									},
								},
							]
						: [],
			};
			return clone;
		},
	});
	return node;
}

function environment(headings = []) {
	const document = new Target();
	const window = new Target();
	const timers = new Map();
	const frames = new Map();
	const observers = [];
	const hooks = new Target();
	const unrelated = () => {};
	hooks.addEventListener("page:view", unrelated);
	const makeSwup = (target = hooks) => ({
		hooks: {
			on: target.addEventListener.bind(target),
			off(name, callback) {
				callback
					? target.removeEventListener(name, callback)
					: target.listeners.delete(name);
			},
		},
	});
	const container = element("post-container");
	container.querySelectorAll = () => headings;
	const ids = new Map(headings.map((heading) => [heading.id, heading]));
	ids.set("post-container", container);
	window.scrollY = 500;
	window.location = { pathname: "/posts/example/" };
	window.matchMedia = () => ({ matches: false });
	window.scrollTo = (options) => {
		window.lastScroll = { ...options };
	};
	window.swup = makeSwup();
	window.siteConfig = { toc: { depth: 3, useJapaneseBadge: false } };
	document.readyState = "complete";
	document.documentElement = element();
	document.getElementById = (id) => ids.get(id) ?? null;
	document.querySelector = (selector) =>
		selector.includes("post-container") ? container : null;
	document.querySelectorAll = () => [
		element("banner-decoration", ""),
		...headings,
	];
	let nextId = 0;
	const sandbox = {
		document,
		window,
		console,
		URL,
		HTMLElement: Target,
		HTMLAnchorElement: Target,
		MutationObserver: class {
			constructor(callback) {
				this.callback = callback;
				observers.push(this);
			}
			observe(target) {
				this.target = target;
			}
			disconnect() {
				this.disconnected = true;
			}
		},
		IntersectionObserver: class {
			constructor(callback) {
				this.callback = callback;
				this.targets = new Set();
				observers.push(this);
			}
			observe(target) {
				this.targets.add(target);
			}
			disconnect() {
				this.disconnected = true;
			}
		},
		setTimeout: (callback) => {
			timers.set(++nextId, callback);
			return nextId;
		},
		clearTimeout: (id) => timers.delete(id),
		requestAnimationFrame: (callback) => {
			frames.set(++nextId, callback);
			return nextId;
		},
		cancelAnimationFrame: (id) => frames.delete(id),
	};
	return {
		...sandbox,
		sandbox,
		ids,
		container,
		headings,
		hooks,
		unrelated,
		makeSwup,
		timers,
		frames,
		observers,
	};
}

function loader(env, mocks = {}) {
	const cache = new Map();
	const load = (file) => {
		const absolute = path.resolve(root, file);
		if (cache.has(absolute)) return cache.get(absolute);
		const module = { exports: {} };
		cache.set(absolute, module.exports);
		const code = ts.transpileModule(readFileSync(absolute, "utf8"), {
			compilerOptions: {
				module: ts.ModuleKind.CommonJS,
				target: ts.ScriptTarget.ES2022,
			},
		}).outputText;
		const require = (name) => {
			if (name in mocks) return mocks[name];
			if (!name.startsWith(".")) throw new Error(`Unexpected import ${name}`);
			return load(
				path.resolve(path.dirname(absolute), `${name.replace(/\.js$/, "")}.ts`),
			);
		};
		vm.runInNewContext(
			code,
			{ ...env.sandbox, module, exports: module.exports, require },
			{ filename: absolute },
		);
		return module.exports;
	};
	return load;
}

function mountMobile(env, { panel, togglePanel = async () => false } = {}) {
	let mount;
	const mocks = {
		"@iconify/svelte": {},
		svelte: {
			onMount: (callback) => {
				mount = callback;
			},
		},
		"../../../i18n/i18nKey": { default: {} },
		"../../../i18n/translation": { i18n: (key) => key },
		"../../../utils/navigation-utils": { navigateToPage() {} },
		"../../../utils/panel-manager.js": {
			panelManager: { togglePanel },
		},
	};
	const load = loader(env, mocks);
	const source = read("src/components/features/toc/MobileTOC.svelte").match(
		/<script lang="ts">([\s\S]*?)<\/script>/,
	)[1];
	const code = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
		},
	}).outputText;
	const context = vm.createContext({
		...env.sandbox,
		$state: (value) => value,
		exports: {},
		require(name) {
			return (
				mocks[name] ??
				load(`src/components/features/toc/${name.replace(/\.js$/, "")}.ts`)
			);
		},
	});
	vm.runInContext(code, context);
	if (panel) {
		context.testPanel = panel;
		vm.runInContext("panelElement = testPanel;", context);
	}
	const destroy = mount();
	return { context, destroy, init: () => vm.runInContext("init()", context) };
}

function mountFloating(env) {
	const source = read("src/components/features/toc/FloatingTOC.astro");
	const button = element("floating-toc-btn");
	const panel = element("floating-toc-panel");
	const content = element("floating-toc-content");
	const close = element("floating-toc-close");
	const wrapper = element();
	wrapper.querySelector = () => close;
	for (const node of [button, panel, content, close])
		env.ids.set(node.id, node);
	const originalQuery = env.document.querySelector;
	env.document.querySelector = (selector) =>
		selector === ".floating-toc-wrapper" ? wrapper : originalQuery(selector);
	const load = loader(env);
	const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
	const code = ts.transpileModule(script, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
		},
	}).outputText;
	const context = vm.createContext({
		...env.sandbox,
		exports: {},
		require: (name) =>
			load(`src/components/features/toc/${name.replace(/\.js$/, "")}.ts`),
	});
	vm.runInContext(code, context);
	env.document.emit("DOMContentLoaded");
	for (const [id, callback] of env.timers) {
		env.timers.delete(id);
		callback();
	}
	const click = (target = button) => {
		if (
			target === button &&
			/onclick="window.toggleFloatingTOC\(\)"/.test(
				source.split('<div id="floating-toc-panel"')[0],
			)
		)
			env.window.toggleFloatingTOC();
		target.emit("click", { stopPropagation() {}, target });
	};
	return { button, panel, content, close, wrapper, context, click };
}

function mountSidebar(env) {
	let Sidebar;
	const load = loader(env);
	const script = read("src/components/features/toc/SidebarTOC.astro").match(
		/<script>([\s\S]*?)<\/script>/,
	)[1];
	const code = ts.transpileModule(script, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
		},
	}).outputText;
	vm.runInNewContext(code, {
		...env.sandbox,
		exports: {},
		customElements: {
			get: () => null,
			define: (_name, componentClass) => {
				Sidebar = componentClass;
			},
		},
		require: (name) => load(`src/components/features/toc/${name}.ts`),
	});
	const sidebar = new Sidebar();
	sidebar.dataset = {};
	sidebar.isConnected = true;
	return sidebar;
}

test("mobile TOC excludes decorative document headings and empty labels", () => {
	const env = environment([
		element("valid", "Readable heading #", 0, 2, true),
		element("empty", " #", 100, 2, true),
	]);
	const mobile = loader(env)(
		"src/components/features/toc/hooks/useMobileTOC.ts",
	);
	assert.deepEqual(
		Array.from(
			mobile.generateTOCItems({ depth: 3, useJapaneseBadge: false }),
			(item) => [item.id, item.text],
		),
		[["valid", "Readable heading"]],
	);
});

test("shared heading extraction removes only permalink markup and preserves C#", () => {
	const env = environment([
		element("csharp", "C##", 0, 2, true),
		element("empty", " #", 100, 2, true),
	]);
	const shared = loader(env)("src/components/features/toc/utils/toc-utils.ts");
	assert.deepEqual(
		Array.from(shared.extractHeadings(), (heading) => [
			heading.id,
			heading.text,
		]),
		[["csharp", "C#"]],
	);
});

test("mobile active heading uses viewport coordinates rather than offsetParent offsets", () => {
	const env = environment([
		element("first", "First", -50),
		element("second", "Second", 300),
	]);
	assert.equal(
		loader(env)(
			"src/components/features/toc/hooks/useMobileTOC.ts",
		).updateActiveHeading(),
		"first",
	);
});

test("mobile scroll targets document coordinates inside positioned article containers", () => {
	const env = environment([element("heading", "Heading", 300)]);
	loader(env)(
		"src/components/features/toc/hooks/useMobileTOC.ts",
	).scrollToHeading("heading", 80);
	assert.equal(env.window.lastScroll.top, 720);
});

test("TOC list scrolling uses the scroll container's coordinate space", () => {
	const env = environment();
	const container = element("list", "", 200);
	const active = element("item", "", 350);
	loader(env)(
		"src/components/features/toc/hooks/useTocScroll.ts",
	).scrollActiveIntoView(container, [active], 300);
	assert.equal(container.lastScroll.top, 238);
});

test("MobileTOC teardown leaves unrelated Swup page:view callbacks registered", () => {
	const env = environment([element("heading", "Heading")]);
	const mobile = mountMobile(env);
	mobile.init();
	mobile.destroy();
	assert.equal(env.hooks.listeners.get("page:view")?.has(env.unrelated), true);
});

test("MobileTOC teardown cancels scheduled initialization", () => {
	const env = environment();
	const mobile = mountMobile(env);
	assert.ok(env.timers.size > 0);
	mobile.destroy();
	assert.equal(env.timers.size, 0);
});

test("MobileTOC observes only nonempty content headings listed in its TOC", () => {
	const env = environment([
		element("valid", "Heading"),
		element("empty", " #", 50, 2, true),
		element("deep", "Hidden by depth", 100, 4),
	]);
	const mobile = mountMobile(env);
	mobile.init();
	const observer = env.observers.find((candidate) => candidate.targets);
	assert.deepEqual(
		Array.from(observer.targets, (heading) => heading.id),
		["valid"],
	);
	mobile.destroy();
});

test("TOC lifecycle registers delayed Swup without removing unrelated callbacks", () => {
	const env = environment();
	env.window.swup = undefined;
	const mobile = mountMobile(env);
	env.window.swup = env.makeSwup();
	env.document.emit("swup:enable");
	env.document.emit("swup:enable");
	assert.equal(env.hooks.count("page:view"), 2);
	mobile.destroy();
	assert.equal(env.hooks.count("page:view"), 1);
	assert.equal(env.document.count("swup:enable"), 0);
	assert.equal(env.window.count("popstate"), 0);
	assert.equal(env.timers.size, 0);
});

test("MobileTOC clears old item IDs before Swup replaces article content", () => {
	const env = environment([element("old-heading", "Old heading")]);
	const mobile = mountMobile(env);
	mobile.init();
	assert.equal(vm.runInContext("tocItems.length", mobile.context), 1);
	env.hooks.emit("content:replace");
	assert.equal(vm.runInContext("tocItems.length", mobile.context), 0);
	assert.equal(vm.runInContext("activeId", mobile.context), "");
	mobile.destroy();
});

for (const width of [1023, 1024, 1279, 1280, 1281]) {
	test(`MobileTOC resize at ${width}px follows the trigger's lg visibility edge`, () => {
		const styles = read("src/styles/main.css");
		const desktopWidth = Number(styles.match(/--breakpoint-lg:\s*(\d+)px/)[1]);
		assert.equal(desktopWidth, 1280);
		const env = environment();
		env.window.matchMedia = (query) => ({
			matches: width >= Number(query.match(/min-width:\s*(\d+)px/)[1]),
		});
		const calls = [];
		const mobile = mountMobile(env, {
			panel: element("mobile-toc-panel"),
			togglePanel: async (id, show) => {
				calls.push([id, show]);
				return false;
			},
		});
		env.window.emit("resize");
		assert.deepEqual(
			calls,
			width >= desktopWidth ? [["mobile-toc-panel", false]] : [],
		);
		mobile.destroy();
	});
}

test("floating TOC header close and trigger use the same open state", () => {
	const env = environment([element("heading", "Heading")]);
	const toc = mountFloating(env);
	toc.click();
	assert.equal(toc.panel.classList.contains("show"), true);
	if (toc.close.count("click")) toc.click(toc.close);
	else env.window.toggleFloatingTOC();
	assert.equal(toc.panel.classList.contains("show"), false);
	toc.click();
	assert.equal(toc.panel.classList.contains("show"), true);
});

test("floating TOC closed panel is inert and Escape returns focus to the trigger", () => {
	const env = environment([element("heading", "Heading")]);
	const toc = mountFloating(env);
	assert.equal(toc.panel.inert, true);
	toc.click();
	assert.equal(toc.button.getAttribute("aria-expanded"), "true");
	env.document.emit("keydown", { key: "Escape", preventDefault() {} });
	assert.equal(toc.panel.inert, true);
	assert.equal(toc.button.focused, true);
});

test("floating TOC reinitialization binds replacement controls exactly once", () => {
	const env = environment([element("heading", "Heading")]);
	const toc = mountFloating(env);
	const replacement = element("floating-toc-btn");
	env.ids.set(replacement.id, replacement);
	vm.runInContext(
		"floatingTOCInstance.reinit(); floatingTOCInstance.reinit();",
		toc.context,
	);
	assert.equal(toc.button.count("click"), 0);
	assert.equal(replacement.count("click"), 1);
});

test("floating TOC renders heading text as text, not HTML", () => {
	const env = environment([
		element('quote"heading', '<img src=x onerror="run()">'),
	]);
	const toc = mountFloating(env);
	assert.doesNotMatch(toc.content.innerHTML, /<img|href="#quote"heading"/);
	assert.match(toc.content.innerHTML, /&lt;img/);
});

test("floating TOC drops stale headings and panel content when leaving an article", () => {
	const env = environment([element("heading", "Heading")]);
	const toc = mountFloating(env);
	toc.click();
	env.ids.delete("post-container");
	vm.runInContext("floatingTOCInstance.reinit();", toc.context);
	assert.equal(toc.content.innerHTML, "");
	assert.equal(toc.panel.classList.contains("show"), false);
	assert.equal(
		vm.runInContext("floatingTOCInstance.state.headings.length", toc.context),
		0,
	);
});

test("floating TOC stays unavailable throughout content replacement until refreshed headings are ready", () => {
	const env = environment([element("old-heading", "Old heading")]);
	const toc = mountFloating(env);
	toc.click();
	env.hooks.emit("content:replace");
	assert.equal(toc.content.innerHTML, "");
	assert.equal(
		vm.runInContext("floatingTOCInstance.state.headings.length", toc.context),
		0,
	);
	assert.equal(toc.button.classList.contains("hide"), true);
	assert.equal(toc.button.getAttribute("disabled"), "");
	assert.equal(toc.button.inert, true);
	assert.equal(toc.button.getAttribute("aria-hidden"), "true");
	const nextHeading = element("new-heading", "New heading");
	env.container.querySelectorAll = () => [nextHeading];
	env.ids.delete("old-heading");
	env.ids.set(nextHeading.id, nextHeading);
	env.hooks.emit("page:view");
	assert.ok(env.timers.size > 0);
	toc.click();
	env.window.toggleFloatingTOC();
	assert.equal(toc.panel.classList.contains("show"), false);
	assert.equal(toc.content.innerHTML, "");
	for (const [id, callback] of env.timers) {
		env.timers.delete(id);
		callback();
	}
	assert.equal(toc.button.classList.contains("hide"), false);
	assert.equal(toc.button.getAttribute("disabled"), null);
	assert.equal(toc.button.inert, false);
	assert.match(toc.content.innerHTML, /New heading/);
	toc.click();
	assert.equal(toc.panel.classList.contains("show"), true);
});

test("sidebar TOC renders safe heading labels and encoded fragments", () => {
	const env = environment([
		element('quote"heading', '<img src=x onerror="run()">'),
	]);
	const sidebar = mountSidebar(env);
	sidebar.regenerateTOC();
	assert.doesNotMatch(sidebar.innerHTML, /<img|href="#quote"heading"/);
	assert.match(sidebar.innerHTML, /&lt;img/);
});

test("sidebar disconnect cancels delayed retries and animation frames", () => {
	const env = environment();
	const sidebar = mountSidebar(env);
	sidebar.regenerateTOC();
	sidebar.update();
	assert.ok(env.timers.size > 0);
	assert.ok(env.frames.size > 0);
	sidebar.disconnectedCallback();
	assert.equal(env.timers.size, 0);
	assert.equal(env.frames.size, 0);
});

test("MobileTOC exposes expansion, panel ownership and initial hidden semantics", () => {
	const source = read("src/components/features/toc/MobileTOC.svelte");
	assert.match(source, /aria-expanded=\{panelOpen\}/);
	assert.match(source, /aria-controls="mobile-toc-panel"/);
	assert.match(source, /inert=\{!panelOpen\}/);
});
