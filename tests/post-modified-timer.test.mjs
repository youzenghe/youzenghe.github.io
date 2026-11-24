import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(
	new URL(
		"../src/components/features/posts/LastModified.astro",
		import.meta.url,
	),
	"utf8",
).match(/<script is:inline>([\s\S]*?)<\/script>/)[1];

function fixture() {
	const timers = new Map();
	let id = 0;
	let present = true;
	const context = vm.createContext({
		window: {},
		document: {
			getElementById: () =>
				present ? { dataset: { lastModified: "2025-01-01T00:00:00" } } : null,
		},
		setInterval(callback) {
			timers.set(++id, callback);
			return id;
		},
		clearInterval(timer) {
			timers.delete(timer);
		},
	});
	return {
		timers,
		run() {
			vm.runInContext(source, context);
		},
		leave() {
			present = false;
			for (const callback of timers.values()) callback();
		},
	};
}

test("article navigation retains only one elapsed-time interval", () => {
	const f = fixture();
	for (let i = 0; i < 6; i++) f.run();
	assert.equal(f.timers.size, 1);
});

test("the elapsed-time interval stops when the article is removed", () => {
	const f = fixture();
	f.run();
	f.leave();
	assert.equal(f.timers.size, 0);
});
