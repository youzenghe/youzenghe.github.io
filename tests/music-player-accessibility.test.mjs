import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { compile } from "svelte/compiler";

const base = resolve(
	import.meta.dirname,
	"../src/components/widgets/music-player",
);
const source = (file) => readFileSync(resolve(base, file), "utf8");

test("hidden music panels are inert rather than pointer-only hidden", () => {
	for (const file of [
		"organisms/MiniPlayer.svelte",
		"organisms/PlayerBar.svelte",
	]) {
		assert.match(source(file), /inert=\{isHidden\}/);
		assert.match(source(file), /aria-hidden=\{isHidden\}/);
	}
	assert.match(source("MusicPlayer.svelte"), /inert=\{!state\.isHidden\}/);
	assert.match(source("FabMusicPanel.svelte"), /inert=\{!showPlaylist\}/);
});

test("window-level shortcuts no longer override ordinary controls", () => {
	assert.doesNotMatch(
		source("MusicPlayer.svelte"),
		/<svelte:window onkeydown=\{handleVolumeKeyDown\}/,
	);
});

test("named mode, mute, expand and close controls expose their state", () => {
	for (const file of [
		"atoms/ModeButton.svelte",
		"atoms/VolumeButton.svelte",
		"organisms/Playlist.svelte",
		"molecules/TrackDisplay.svelte",
	]) {
		const code = source(file);
		const buttons = [...code.matchAll(/<button\b[\s\S]*?>/g)];
		assert.ok(buttons.length > 0);
		for (const [button] of buttons)
			assert.match(button, /aria-label=/, `${file}: ${button}`);
	}
	assert.match(source("atoms/ModeButton.svelte"), /aria-pressed=/);
	assert.match(source("atoms/VolumeButton.svelte"), /aria-pressed=/);
	assert.match(
		source("molecules/PlayerControls.svelte"),
		/disabled=\{!canSkip\}/,
	);
	assert.match(
		source("MusicPlayer.svelte"),
		/canSkip=\{state.playlist.length > 1\}/,
	);
});

test("slider markup exposes unavailable state and player has persistent failure recovery", () => {
	assert.match(source("atoms/ProgressBar.svelte"), /aria-disabled=/);
	assert.match(source("MusicPlayer.svelte"), /role="alert"/);
	assert.match(source("PlayerStatus.svelte"), /role="status"/);
	for (const file of [
		"FabMusicPanel.svelte",
		"organisms/MiniPlayer.svelte",
		"organisms/PlayerBar.svelte",
	]) {
		assert.match(source(file), /<PlayerStatus/);
	}
	assert.match(source("FabMusicPanel.svelte"), /musicPlayerStore\.retry\(/);
});

test("the error toast close action has an explicit accessible name", () => {
	assert.match(
		source("MusicPlayer.svelte"),
		/aria-label="关闭音乐播放器错误提示"/,
	);
});

test("missing or failed cover media does not request the current document as an image", () => {
	assert.match(source("atoms/CoverImage.svelte"), /\{#if hasCover\}/);
	assert.match(source("atoms/CoverImage.svelte"), /onerror=/);
});

test("music widgets compile without accessibility warnings", () => {
	for (const file of [
		"MusicPlayer.svelte",
		"FabMusicPanel.svelte",
		"PlayerStatus.svelte",
		"atoms/CoverImage.svelte",
		"atoms/PlayButton.svelte",
		"atoms/ModeButton.svelte",
		"atoms/VolumeButton.svelte",
		"atoms/ProgressBar.svelte",
		"organisms/MiniPlayer.svelte",
		"organisms/PlayerBar.svelte",
		"organisms/Playlist.svelte",
		"molecules/PlayerControls.svelte",
		"molecules/TrackDisplay.svelte",
	]) {
		const result = compile(source(file), {
			filename: resolve(base, file),
			generate: false,
		});
		assert.deepEqual(
			result.warnings.filter((warning) => warning.code.startsWith("a11y")),
			[],
			file,
		);
	}
});
