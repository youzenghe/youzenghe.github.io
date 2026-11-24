import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { parse } from "node-html-parser";
import ts from "typescript";
import * as pageTOC from "../src/utils/page-toc.ts";

function fixture() {
	const dom = parse(
		'<div id="content-wrapper"><div class="custom-md"><section><h2 id="one">First</h2></section></div><div id="modifiedtime">One second</div></div><div data-card-toc-root><div data-card-toc-content></div></div>',
	);
	const main = dom.querySelector("#content-wrapper")!;
	const directory = dom.querySelector("[data-card-toc-root]")!;
	directory.setAttribute("data-japanese-badge", "false");
	const content = directory.querySelector("[data-card-toc-content]")!;
	Object.assign(content, { replaceChildren() {} });
	function prepare() {
		for (const node of dom.querySelectorAll("*")) {
			Object.defineProperty(node, "parentElement", {
				configurable: true,
				get: () => (node.parentNode?.rawTagName ? node.parentNode : null),
			});
			Object.defineProperty(node, "cloneNode", {
				configurable: true,
				value: () => parse(node.outerHTML).firstChild,
			});
		}
	}
	prepare();
	Object.assign(directory, { dataset: { japaneseBadge: "false" } });
	let initializations = 0;
	let observer: { callback: () => void; options?: MutationObserverInit };
	const timers = new Map<number, () => void>();
	let nextId = 0;
	const previous = globalThis.getComputedStyle;
	globalThis.getComputedStyle = (() => ({
		display: "block",
		visibility: "visible",
	})) as typeof getComputedStyle;
	const source = readFileSync(
		new URL(
			"../src/components/widgets/card-toc/CardTOC.astro",
			import.meta.url,
		),
		"utf8",
	).match(/<script>([\s\S]*?)<\/script>/)![1];
	const code = ts.transpileModule(source, {
		compilerOptions: {
			module: ts.ModuleKind.CommonJS,
			target: ts.ScriptTarget.ES2022,
		},
	}).outputText;
	vm.runInNewContext(code, {
		exports: {},
		document: {
			querySelector: () => main,
			querySelectorAll: () => [directory],
			addEventListener() {},
			removeEventListener() {},
		},
		window: { addEventListener() {} },
		MutationObserver: class {
			callback: () => void;
			constructor(callback: () => void) {
				this.callback = callback;
				observer = this;
			}
			observe(_main: unknown, options: MutationObserverInit) {
				Object.assign(this, { options });
			}
			disconnect() {}
		},
		setTimeout: (callback: () => void) => {
			timers.set(++nextId, callback);
			return nextId;
		},
		clearTimeout: (id: number) => timers.delete(id),
		require(name: string) {
			if (name === "@/utils/tocManager")
				return {
					TOCManager: class {
						init() {
							initializations++;
						}
						cleanup() {}
					},
				};
			if (name === "@/utils/page-toc") return pageTOC;
			if (name.endsWith("useTocLifecycle"))
				return {
					registerTOCPageLifecycle(refresh: () => void) {
						refresh();
						return () => {};
					},
				};
			throw new Error(`Unexpected import: ${name}`);
		},
	});
	return {
		main,
		prepare,
		get initializations() {
			return initializations;
		},
		get options() {
			return observer.options;
		},
		mutate() {
			observer.callback();
			for (const [id, fn] of timers) {
				timers.delete(id);
				fn();
			}
		},
		restore() {
			globalThis.getComputedStyle = previous;
		},
	};
}

test("live article metadata does not rebuild the directory", () => {
	const f = fixture();
	try {
		const count = f.initializations;
		for (let i = 0; i < 3; i++) {
			f.main.querySelector("#modifiedtime")!.set_content(`Elapsed ${i}`);
			f.mutate();
		}
		assert.equal(f.initializations, count);
	} finally {
		f.restore();
	}
});

test("directory tracks title text edits and visibility changes", () => {
	const f = fixture();
	try {
		const count = f.initializations;
		f.main.querySelector("h2")!.set_content("Renamed");
		f.mutate();
		assert.equal(f.initializations, count + 1);
		f.main.querySelector("section")!.setAttribute("hidden", "");
		f.mutate();
		assert.equal(f.initializations, count + 2);
		assert.equal(f.options?.characterData, true);
	} finally {
		f.restore();
	}
});

test("replaced heading nodes with the same label and id rebind the directory", () => {
	const f = fixture();
	try {
		const count = f.initializations;
		f.main.querySelector("section")!.set_content('<h2 id="one">First</h2>');
		f.prepare();
		f.mutate();
		assert.equal(f.initializations, count + 1);
	} finally {
		f.restore();
	}
});
