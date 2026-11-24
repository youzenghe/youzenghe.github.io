import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import { parse } from "node-html-parser";
import { compile } from "svelte/compiler";
import * as server from "svelte/internal/server";
import { render } from "svelte/server";
import ts from "typescript";

const read = (file) =>
	fs.readFileSync(
		new URL(`../src/components/widgets/${file}`, import.meta.url),
		"utf8",
	);

test("closed shared drawers are inert and playlist tracks use native actions", () => {
	assert.match(read("common/AccordionDrawer.svelte"), /inert=\{!show\}/);
	assert.match(read("common/AccordionDrawer.svelte"), /aria-hidden=\{!show\}/);
	assert.doesNotMatch(
		read("music-sidebar/components/SidebarPlaylist.svelte"),
		/role="listbox"/,
	);
	assert.match(
		read("music-sidebar/components/TrackListItem.svelte"),
		/<button\s+type="button"/,
	);
	assert.match(
		read("music-sidebar/SidebarMusicClient.svelte"),
		/<PlayerStatus/,
	);
});

test("sidebar playlist repairs compile without accessibility warnings", () => {
	for (const file of [
		"common/AccordionDrawer.svelte",
		"music-sidebar/components/SidebarPlaylist.svelte",
		"music-sidebar/components/TrackListItem.svelte",
		"music-sidebar/SidebarMusicClient.svelte",
	]) {
		const result = compile(read(file), { filename: file, generate: "client" });
		assert.deepEqual(result.warnings, []);
	}
});

test("sidebar mount receives a fresh snapshot and owns its subscription", () => {
	assert.match(
		read("music-sidebar/SidebarMusicClient.svelte"),
		/musicPlayerStore\.subscribe\(/,
	);
	assert.match(
		read("music-sidebar/SidebarMusicClient.svelte"),
		/return unsubscribe/,
	);
	assert.doesNotMatch(
		read("music-sidebar/SidebarMusicClient.svelte"),
		/addEventListener\("music-sidebar:state"/,
	);
});

async function renderControls(props) {
	const cache = new Map();
	function load(file) {
		if (cache.has(file)) return cache.get(file);
		const module = { exports: {} };
		const compiled = compile(fs.readFileSync(file, "utf8"), {
			filename: file,
			generate: "server",
		}).js.code;
		const code = ts.transpileModule(compiled, {
			compilerOptions: {
				module: ts.ModuleKind.CommonJS,
				target: ts.ScriptTarget.ES2022,
			},
		}).outputText;
		vm.runInNewContext(code, {
			module,
			exports: module.exports,
			require(name) {
				if (name === "svelte/internal/server") return server;
				if (name === "@components/common/LocalIcon.svelte")
					return { __esModule: true, default() {} };
				return {
					__esModule: true,
					default: load(path.resolve(path.dirname(file), name)),
				};
			},
		});
		cache.set(file, module.exports.default);
		return module.exports.default;
	}
	const file = path.resolve(
		import.meta.dirname,
		"../src/components/widgets/music-sidebar/components/SidebarControls.svelte",
	);
	const output = await render(load(file), {
		props: {
			isShuffled: false,
			repeatMode: 0,
			onPrev() {},
			onNext() {},
			onTogglePlay() {},
			onTogglePlaylist() {},
			...props,
		},
	});
	return parse(output.body);
}

test("a single-track sidebar disables skip actions and reflects loading without blocking pause", async () => {
	for (const isLoading of [false, true]) {
		const controls = await renderControls({
			canSkip: false,
			isLoading,
			isPlaying: false,
		});
		assert.equal(
			controls.querySelector('[aria-label="上一首"]').hasAttribute("disabled"),
			true,
		);
		assert.equal(
			controls.querySelector('[aria-label="下一首"]').hasAttribute("disabled"),
			true,
		);
		const play = controls.querySelector('[aria-label="播放"]');
		assert.equal(play.hasAttribute("disabled"), isLoading);
		assert.equal(play.getAttribute("aria-busy"), String(isLoading));
	}
	const buffering = await renderControls({
		canSkip: true,
		isLoading: true,
		isPlaying: true,
	});
	assert.equal(
		buffering.querySelector('[aria-label="暂停"]').hasAttribute("disabled"),
		false,
	);
	assert.equal(
		buffering.querySelector('[aria-label="下一首"]').hasAttribute("disabled"),
		false,
	);
});

test("sidebar control flags come from the current store snapshot", () => {
	const source = read("music-sidebar/SidebarMusicClient.svelte");
	assert.match(source, /canSkip=\{playerState\.playlist\.length > 1\}/);
	assert.match(source, /isLoading=\{playerState\.isLoading\}/);
});
