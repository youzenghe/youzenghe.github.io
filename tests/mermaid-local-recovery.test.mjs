import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { test } from "node:test";

const source = fs.readFileSync(new URL("../src/plugins/mermaid-render-script.js", import.meta.url), "utf8");

test("local vendor failure is retryable without exporting an uninitialized closure", async () => {
	let requests = 0;
	const document = {
		readyState: "complete",
		documentElement: { classList: { contains: () => false } },
		createElement: () => ({}),
		head: { appendChild: script => { requests++;queueMicrotask(() => script.onerror()); } },
		addEventListener() {},
		getElementById: () => null,
	};
	const window = {};
	const context = vm.createContext({ window, document, console: { error() {}, log() {} }, queueMicrotask, setTimeout, clearTimeout });
	vm.runInContext(source, context);
	await new Promise(resolve => setTimeout(resolve, 0));
	assert.equal(window.renderMermaidDiagrams, undefined);
	assert.equal(requests, 1);
	vm.runInContext(source, context);
	await new Promise(resolve => setTimeout(resolve, 0));
	assert.equal(window.renderMermaidDiagrams, undefined);
	assert.equal(requests, 2);
});
