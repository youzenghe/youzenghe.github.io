import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const read = (path) =>
	readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const controlsSource = read("src/components/control/FloatingControls.astro");
const buttonSource = read("src/components/common/FloatingButton.astro");
const musicSource = read("src/components/control/MusicFabButton.svelte");
const runtime = controlsSource.match(
	/<script is:inline>([\s\S]*?)<\/script>/,
)[1];

class Target {
	listeners = new Map();
	addEventListener(name, listener) {
		const listeners = this.listeners.get(name) ?? new Set();
		listeners.add(listener);
		this.listeners.set(name, listeners);
	}
	removeEventListener(name, listener) {
		this.listeners.get(name)?.delete(listener);
	}
	emit(name, detail) {
		for (const listener of this.listeners.get(name) ?? []) listener({ detail });
	}
}

function element(id, classes = [], attributes = {}) {
	const values = new Set(classes);
	return {
		id,
		inert: false,
		attributes: new Map(Object.entries(attributes)),
		classList: {
			contains: (value) => values.has(value),
			add: (...names) => {
				for (const name of names) values.add(name);
			},
			remove: (...names) => {
				for (const name of names) values.delete(name);
			},
			toggle(name, force = !values.has(name)) {
				force ? values.add(name) : values.delete(name);
				return force;
			},
		},
		getAttribute(name) {
			return this.attributes.get(name) ?? null;
		},
		setAttribute(name, value) {
			this.attributes.set(name, String(value));
		},
		removeAttribute(name) {
			this.attributes.delete(name);
		},
	};
}

function fixture() {
	const document = new Target();
	const window = new Target();
	const frames = new Map();
	const timers = new Map();
	const observers = [];
	const hooks = new Target();
	window.location = {
		pathname: "/posts/example/",
		href: "https://example.test/posts/example/",
	};
	window.swup = {
		hooks: {
			on: hooks.addEventListener.bind(hooks),
			off: hooks.removeEventListener.bind(hooks),
		},
	};
	const buttons = new Map([
		["floating-toc-btn", element("floating-toc-btn", ["hide"])],
		["back-to-home-btn", element("back-to-home-btn", [], { href: "/" })],
		["back-to-top-btn", element("back-to-top-btn", ["hide"])],
	]);
	const items = ["music", "toc", "home", "top"].map((key) =>
		element("", [], { "data-control-key": key }),
	);
	const properties = new Map();
	document.documentElement = element("html");
	document.documentElement.style = {
		setProperty: (key, value) => properties.set(key, value),
	};
	document.getElementById = (id) => buttons.get(id) ?? null;
	document.querySelectorAll = () => items;
	let nextId = 0;
	const context = vm.createContext({
		document,
		window,
		URL,
		MutationObserver: class {
			constructor(callback) {
				this.callback = callback;
				this.disconnected = false;
				observers.push(this);
			}
			observe(target) {
				this.target = target;
			}
			disconnect() {
				this.disconnected = true;
			}
		},
		requestAnimationFrame: (callback) => {
			frames.set(++nextId, callback);
			return nextId;
		},
		cancelAnimationFrame: (id) => frames.delete(id),
		setTimeout: (callback) => {
			timers.set(++nextId, callback);
			return nextId;
		},
		clearTimeout: (id) => timers.delete(id),
	});
	const run = () => vm.runInContext(runtime, context);
	const flush = () => {
		for (const [id, callback] of frames) {
			frames.delete(id);
			callback();
		}
	};
	const mutate = (id) =>
		observers
			.filter((observer) => !observer.disconnected && observer.target.id === id)
			.forEach((observer) => {
				observer.callback();
			});
	run();
	return {
		document,
		window,
		buttons,
		items,
		observers,
		frames,
		timers,
		hooks,
		properties,
		run,
		flush,
		mutate,
	};
}

test("floating actions expose one native button or navigation link, not a clickable wrapper", () => {
	assert.match(buttonSource, /const Tag = href \? "a" : "button"/);
	assert.match(buttonSource, /type=\{href \? undefined : "button"\}/);
	assert.doesNotMatch(buttonSource, /<div[\s\S]*?onclick=/);
	assert.match(buttonSource, /aria-label=\{ariaLabel\}/);
	assert.match(buttonSource, /aria-hidden=\{isHidden/);
});

test("home uses a native base-aware URL instead of a repeated global click/listener script", () => {
	const source = read("src/components/control/BackToHome.astro");
	assert.match(source, /href=\{url\(BLOG_HOME_PATH\)\}/);
	assert.doesNotMatch(source, /<script|onclick=/);
});

test("all floating buttons consume one responsive size contract", () => {
	assert.match(buttonSource, /width: var\(--fab-button-size/);
	assert.match(buttonSource, /height: var\(--fab-button-size/);
	assert.match(musicSource, /width: var\(--fab-button-size/);
	assert.doesNotMatch(buttonSource, /width: 2\.(5|75)rem/);
	assert.match(controlsSource, /@media \(width <= 768px\)/);
	assert.match(controlsSource, /@media \(width <= 480px\)/);
});

test("floating edges include device safe areas", () => {
	assert.match(controlsSource, /safe-area-inset-right/);
	assert.match(controlsSource, /safe-area-inset-bottom/);
});

test("hidden controls are inert and removed from the accessibility tree", () => {
	const { items, buttons } = fixture();
	assert.equal(items[1].inert, true);
	assert.equal(items[1].getAttribute("aria-hidden"), "true");
	assert.equal(buttons.get("back-to-top-btn").inert, true);
	assert.equal(items[2].inert, false);
});

test("revealing a control restores keyboard access and stacks only visible controls", () => {
	const state = fixture();
	state.buttons.get("back-to-top-btn").classList.remove("hide");
	state.mutate("back-to-top-btn");
	state.flush();
	assert.equal(state.items[3].inert, false);
	assert.equal(
		state.buttons.get("back-to-top-btn").getAttribute("aria-hidden"),
		"false",
	);
	assert.equal(state.items[3].classList.contains("is-stacked"), true);
	assert.equal(state.properties.get("--fab-visible-count"), "3");
});

test("music lock preserves visual and accessible visibility through scroll changes", () => {
	const state = fixture();
	const button = state.buttons.get("back-to-home-btn");
	state.window.emit("music-sidebar:state", { isExpanded: true });
	button.classList.add("hide");
	state.mutate("back-to-home-btn");
	state.flush();
	assert.equal(state.items[2].inert, false);
	assert.equal(button.inert, false);
	assert.equal(state.items[1].inert, true);
	state.window.emit("music-sidebar:state", { isExpanded: false });
	assert.equal(state.items[2].inert, true);
});

test("music visibility lock still updates TOC expansion semantics", () => {
	const state = fixture();
	const button = state.buttons.get("floating-toc-btn");
	button.classList.remove("hide");
	state.mutate("floating-toc-btn");
	state.flush();
	state.window.emit("music-sidebar:state", { isExpanded: true });
	button.classList.add("active");
	state.mutate("floating-toc-btn");
	state.flush();
	assert.equal(button.getAttribute("aria-expanded"), "true");
});

test("home visibility respects the configured site base and trailing slash", () => {
	const state = fixture();
	state.buttons.get("back-to-home-btn").setAttribute("href", "/blog/");
	state.window.location.pathname = "/blog";
	state.window.location.href = "https://example.test/blog";
	state.hooks.emit("page:view");
	assert.equal(state.items[2].inert, true);
	state.window.location.pathname = "/blog/archive/";
	state.hooks.emit("page:view");
	assert.equal(state.items[2].inert, false);
});

test("Swup replacement releases old observers and reattaches the current controls", () => {
	const state = fixture();
	state.window.emit("music-sidebar:state", { isExpanded: true });
	state.hooks.emit("content:replace");
	assert.equal(
		state.observers.every((observer) => observer.disconnected),
		true,
	);
	assert.equal(
		state.document.documentElement.classList.contains("fab-visibility-locked"),
		false,
	);
	state.hooks.emit("page:view");
	assert.equal(
		state.observers.filter((observer) => !observer.disconnected).length,
		3,
	);
	assert.equal(
		state.document.documentElement.classList.contains("fab-visibility-locked"),
		true,
	);
});

test("changing Swup instances removes only this control group's old hooks", () => {
	const state = fixture();
	const nextHooks = new Target();
	state.window.swup = {
		hooks: {
			on: nextHooks.addEventListener.bind(nextHooks),
			off: nextHooks.removeEventListener.bind(nextHooks),
		},
	};
	state.document.emit("swup:enable");
	assert.equal(state.hooks.listeners.get("page:view").size, 0);
	assert.equal(nextHooks.listeners.get("page:view").size, 1);
	state.document.emit("swup:enable");
	assert.equal(nextHooks.listeners.get("page:view").size, 1);
});

test("page initialization disconnects observers for controls removed from the page", () => {
	const state = fixture();
	const previous = state.observers.find(
		(observer) => observer.target.id === "floating-toc-btn",
	);
	state.buttons.delete("floating-toc-btn");
	state.document.emit("astro:page-load");
	assert.equal(previous.disconnected, true);
	assert.equal(
		state.window.__floatingControlObservers.has("floating-toc-btn"),
		false,
	);
});

test("actual Swup page:view hooks refresh home visibility without relying on legacy DOM events", () => {
	const state = fixture();
	state.window.location.pathname = "/";
	state.window.location.href = "https://example.test/";
	state.hooks.emit("page:view");
	assert.equal(
		state.buttons.get("back-to-home-btn").classList.contains("hide"),
		true,
	);
	assert.equal(state.items[2].inert, true);
});

test("page initialization cancels stale animation frames and Mermaid timers", () => {
	const state = fixture();
	state.mutate("back-to-top-btn");
	state.window.emit("mermaid:render:done");
	assert.equal(state.frames.size, 1);
	assert.equal(state.timers.size, 1);
	state.document.emit("astro:page-load");
	assert.equal(state.frames.size, 0);
	assert.equal(state.timers.size, 0);
});

test("repeated inline initialization does not multiply document/window or Swup listeners", () => {
	const state = fixture();
	state.run();
	assert.equal(state.document.listeners.get("astro:page-load").size, 1);
	assert.equal(state.window.listeners.get("music-sidebar:state").size, 1);
	assert.equal(state.hooks.listeners.get("page:view")?.size, 1);
	assert.equal(
		state.observers.filter((observer) => !observer.disconnected).length,
		3,
	);
});

test("music exposes expansion state and both button variants show focus", () => {
	assert.match(musicSource, /aria-expanded=\{playerState.isExpanded\}/);
	assert.match(musicSource, /:focus-visible/);
	assert.match(buttonSource, /:focus-visible/);
});

test("reduced-motion preferences apply to the music pulse and scrolling action", () => {
	assert.match(musicSource, /prefers-reduced-motion: reduce/);
	assert.match(
		read("src/components/control/BackToTop.astro"),
		/prefers-reduced-motion: reduce/,
	);
});

test("back to top keeps smooth scrolling but uses instant movement for reduced motion", () => {
	const source = read("src/components/control/BackToTop.astro");
	const script = source.match(
		/<script is:raw is:inline>([\s\S]*?)<\/script>/,
	)[1];
	for (const matches of [false, true]) {
		const calls = [];
		const window = {
			matchMedia: (query) => {
				assert.equal(query, "(prefers-reduced-motion: reduce)");
				return { matches };
			},
			scroll: ({ top, behavior }) => calls.push([top, behavior]),
		};
		vm.runInNewContext(`${script}\nbackToTop();`, { window });
		assert.deepEqual(calls, [[0, matches ? "instant" : "smooth"]]);
	}
});
