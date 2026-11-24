import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { LOCAL_PLAYLIST } from "../src/components/widgets/music-player/constants.ts";
import { musicPlayerConfig } from "../src/config/musicConfig.ts";

const root = path.resolve(import.meta.dirname, "..");
const player = path.join(root, "src/components/widgets/music-player");
const sidebar = path.join(root, "src/components/widgets/music-sidebar");
const read = (file: string) => fs.readFileSync(file, "utf8");

function files(directory: string): string[] {
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const file = path.join(directory, entry.name);
		return entry.isDirectory() ? files(file) : [file];
	});
}

test("music configuration and playlist require only packaged local audio", () => {
	assert.equal(musicPlayerConfig.mode, "local");
	assert.doesNotMatch(
		read(path.join(root, "src/config/musicConfig.ts")),
		/meting|https?:\/\/|server:|type:/i,
	);
	assert.equal(LOCAL_PLAYLIST.length, 5);
	assert.equal(LOCAL_PLAYLIST[0].title, "我忘了歌的名字");
	assert.equal(LOCAL_PLAYLIST[0].url, "/assets/music/background.mp3");
	for (const song of LOCAL_PLAYLIST) {
		assert.equal(song.artist, "");
		assert.equal(song.cover, "/static/profile-avatar-chibi.png");
		assert.ok(song.title.length > 0);
		for (const asset of [song.url, song.cover]) {
			assert.ok(fs.statSync(path.join(root, "public", decodeURIComponent(asset))).isFile());
		}
	}
});

test("store and legacy playlist helpers contain no external music API path", () => {
	for (const file of [
		path.join(root, "src/stores/musicPlayerStore.ts"),
		...files(player),
		...files(sidebar),
	]) {
		if (!/\.(ts|svelte|astro)$/.test(file)) continue;
		assert.doesNotMatch(read(file), /meting|\bfetch\s*\(/i, file);
	}
});

test("scoped music widgets do not hand icon names to a runtime API client", () => {
	for (const file of [...files(player), ...files(sidebar)].filter((file) =>
		file.endsWith(".svelte"),
	)) {
		const source = read(file);
		assert.doesNotMatch(
			source,
			/from\s+["']@iconify\/svelte(?:\/[^"']*)?["']/,
			file,
		);
		if (/<Icon\b/.test(source))
			assert.match(
				source,
				/import Icon from "@components\/common\/LocalIcon.svelte"/,
				file,
			);
	}
});

test("packaged background audio has stable bytes and is not empty", () => {
	const bytes = fs.readFileSync(
		path.join(root, "public/assets/music/background.mp3"),
	);
	assert.equal(bytes.length, 2_528_175);
	const digest = createHash("sha256").update(bytes).digest("hex");
	assert.equal(
		digest,
		"4dfccecd3fa6e895f717e04ead1647c3a7bf02ff0b786956955cea324637b113",
	);
});

test("every music icon is available in the shared offline icon data", async () => {
	const { hasLocalIcon, resolveLocalIcon } = await import(
		"../src/utils/local-icons.ts"
	);
	for (const file of [...files(player), ...files(sidebar)].filter((file) =>
		file.endsWith(".svelte"),
	)) {
		for (const [, icon] of read(file).matchAll(
			/["']((?:material-symbols|eos-icons):[a-z0-9-]+)["']/g,
		)) {
			assert.equal(hasLocalIcon(icon), true, `${file}: ${icon}`);
			assert.ok(resolveLocalIcon(icon).body, `${file}: ${icon}`);
		}
	}
});
