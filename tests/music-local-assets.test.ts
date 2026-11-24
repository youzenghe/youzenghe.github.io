import assert from "node:assert/strict";
import { test } from "node:test";
import {
	isLocalMusicAssetPath,
	resolveLocalMusicAssetPath,
} from "../src/components/widgets/music-player/music-assets.ts";

test("music assets accept packaged paths without accepting remote schemes or hosts", () => {
	assert.equal(
		resolveLocalMusicAssetPath("/assets/music/background.mp3"),
		"/assets/music/background.mp3",
	);
	assert.equal(
		resolveLocalMusicAssetPath("static/avatar.webp"),
		"/static/avatar.webp",
	);
	for (const path of [
		"https://media.test/song.mp3",
		"http://media.test/song.mp3",
		"//media.test/song.mp3",
		"/\\media.test/song.mp3",
		"/\t/media.test/song.mp3",
		"/\n/media.test/song.mp3",
		"data:audio/mpeg;base64,AAAA",
		"",
		"/",
	]) {
		assert.equal(isLocalMusicAssetPath(path), false, JSON.stringify(path));
		assert.equal(resolveLocalMusicAssetPath(path), "", JSON.stringify(path));
	}
});
