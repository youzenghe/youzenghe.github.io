import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = fs.readFileSync(
	new URL(
		"../src/components/widgets/common/WidgetLayout.astro",
		import.meta.url,
	),
	"utf8",
);

test("collapsible widgets initialize after children are connected and expose state", () => {
	assert.match(source, /connectedCallback\(/);
	assert.match(source, /aria-expanded=/);
	assert.match(source, /aria-controls=\{contentId\}/);
	const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
	const listeners = new Map();
	const attributes = new Map();
	const classes = new Set(["collapsed"]);
	const trigger = {
		addEventListener: (name, handler) => listeners.set(name, handler),
		removeEventListener: (name) => listeners.delete(name),
		setAttribute: (name, value) => attributes.set(name, value),
	};
	const wrapper = { classList: { remove: (name) => classes.delete(name) } };
	const expand = { classList: { add() {} } };
	let Widget;
	class Element {
		dataset = { isCollapsed: "true", id: "tags" };
		querySelector(selector) {
			if (selector === ".expand-btn button") return trigger;
			if (selector === ".expand-btn") return expand;
			if (selector === ".collapse-wrapper") return wrapper;
			return null;
		}
	}
	vm.runInNewContext(ts.transpile(script, { target: ts.ScriptTarget.ES2022 }), {
		HTMLElement: Element,
		customElements: {
			get() {},
			define(_, ctor) {
				Widget = ctor;
			},
		},
	});
	const instance = new Widget();
	instance.connectedCallback();
	instance.connectedCallback();
	assert.equal(listeners.size, 1);
	listeners.get("click")();
	assert.equal(classes.has("collapsed"), false);
	assert.equal(attributes.get("aria-expanded"), "true");
	instance.disconnectedCallback();
	assert.equal(listeners.size, 0);
});
