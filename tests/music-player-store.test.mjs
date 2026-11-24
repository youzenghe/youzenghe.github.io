import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");
const song = (id) => ({
	id,
	title: `Track ${id}`,
	artist: "Artist",
	url: `/assets/music/test-${id}.mp3`,
	cover: "/static/avatar.webp",
	duration: 0,
});
const tick = async () => {
	for (let i = 0; i < 8; i++) await Promise.resolve();
};

function harness({ playlist, enabled = true } = {}) {
	const fetchCalls = [];
	let clock = 0;
	let nextId = 0;
	const timers = new Map();
	class Audio extends EventTarget {
		src = "";
		currentTime = 0;
		duration = 0;
		volume = 0.7;
		muted = false;
		error = null;
		playCalls = 0;
		loadCalls = 0;
		playError = null;
		playResult = null;
		load() {
			this.loadCalls++;
		}
		pause() {
			this.dispatchEvent(new Event("pause"));
		}
		play() {
			this.playCalls++;
			return this.playError
				? Promise.reject(this.playError)
				: (this.playResult ?? Promise.resolve());
		}
	}
	const document = new EventTarget();
	const window = new EventTarget();
	const storage = new Map();
	const context = vm.createContext({
		Audio,
		Event,
		CustomEvent,
		DOMException,
		Error,
		window,
		document,
		console,
		fetch: (...args) => {
			fetchCalls.push(args);
			throw new Error("Local music must not fetch an API");
		},
		localStorage: {
			getItem: (key) => storage.get(key),
			setItem: (key, value) => storage.set(key, value),
		},
		setTimeout: (callback, delay) => {
			const id = ++nextId;
			timers.set(id, { callback, at: clock + delay });
			return id;
		},
		clearTimeout: (id) => timers.delete(id),
	});
	const modules = new Map();
	function load(path) {
		if (modules.has(path)) return modules.get(path).exports;
		if (path.endsWith(".json")) return JSON.parse(readFileSync(path, "utf8"));
		const module = { exports: {} };
		modules.set(path, module);
		const code = ts.transpileModule(readFileSync(path, "utf8"), {
			compilerOptions: {
				module: ts.ModuleKind.CommonJS,
				target: ts.ScriptTarget.ES2022,
			},
		}).outputText;
		const require = (specifier) => {
			if (specifier === "@/config")
				return {
					musicPlayerConfig: {
						...load(resolve(root, "src/config/musicConfig.ts"))
							.musicPlayerConfig,
						enable: enabled,
					},
				};
			if (specifier.endsWith("music-player/constants")) {
				const constants = load(
					resolve(root, "src/components/widgets/music-player/constants.ts"),
				);
				return playlist === undefined
					? constants
					: { ...constants, LOCAL_PLAYLIST: playlist };
			}
			if (specifier.includes("i18nKey"))
				return {
					__esModule: true,
					default: new Proxy({}, { get: (_, key) => key }),
				};
			if (specifier.includes("translation")) return { i18n: (key) => key };
			const location = specifier.startsWith("@/")
				? resolve(root, "src", specifier.slice(2))
				: resolve(path, "..", specifier);
			return load(location.endsWith(".json") ? location : `${location}.ts`);
		};
		vm.runInContext(`(function(require,module,exports){${code}\n})`, context, {
			filename: path,
		})(require, module, module.exports);
		return module.exports;
	}
	const store = load(
		resolve(root, "src/stores/musicPlayerStore.ts"),
	).musicPlayerStore;
	async function advance(ms) {
		clock += ms;
		for (const [id, timer] of [...timers]) {
			if (timer.at <= clock) {
				timers.delete(id);
				timer.callback();
			}
		}
		await tick();
	}
	return { store, document, window, timers, advance, context, fetchCalls };
}

test("initialization uses the packaged local track without fetching metadata or starting playback", async () => {
	const { store, fetchCalls } = harness();
	await store.initialize();
	assert.equal(fetchCalls.length, 0);
	assert.equal(store.getState().playlist.length, 5);
	assert.equal(store.getState().currentSong.title, "我忘了歌的名字");
	assert.equal(store.getState().currentSong.artist, "");
	assert.equal(store.getAudio().src, "/assets/music/background.mp3");
	assert.equal(store.getAudio().playCalls, 0);
	assert.equal(store.getState().isPlaying, false);
	store.destroy();
});

test("the delivered five-song playlist wraps from fifth to first and back", async () => {
	const { store } = harness();
	await store.initialize();
	store.playIndex(4);
	assert.equal(store.getState().currentIndex, 4);
	store.next();
	assert.equal(store.getState().currentIndex, 0);
	assert.equal(store.getState().currentSong.title, "我忘了歌的名字");
	store.prev();
	assert.equal(store.getState().currentIndex, 4);
	store.destroy();
});

test("empty or invalid local playlists leave an inline failure and cannot load remote media", async () => {
	for (const playlist of [
		[],
		[{ ...song(1), url: "" }],
		[{ ...song(1), url: "https://media.test/track.mp3" }],
		[{ ...song(1), url: "//media.test/track.mp3" }],
	]) {
		const { store, fetchCalls } = harness({ playlist });
		await store.initialize();
		assert.equal(store.getState().isLoading, false);
		assert.equal(store.getState().showError, false);
		assert.equal(store.getState().errorMessage, "musicPlayerErrorEmpty");
		assert.equal(store.getState().currentSong.url, "");
		assert.equal(fetchCalls.length, 0);
		store.destroy();
	}
});

test("media preload failure does not start unrelated playback or erase the song error", async () => {
	const { store, advance } = harness({ playlist: [song(1), song(2)] });
	await store.initialize();
	store.getAudio().dispatchEvent(new Event("error"));
	await advance(1500);
	assert.equal(store.getState().currentIndex, 0);
	assert.equal(store.getState().isLoading, false);
	assert.equal(store.getState().isPlaying, false);
	assert.equal(store.getState().errorMessage, "本地音频加载失败，请重试。");
	assert.equal(store.getState().showError, false);
	store.destroy();
});

test("media load timeout stops the spinner", async () => {
	const { store, advance } = harness();
	await store.initialize();
	await advance(60_000);
	assert.equal(store.getState().isLoading, false);
	assert.equal(store.getState().showError, false);
	assert.ok(store.getState().errorMessage);
	store.destroy();
});

test("automatic recovery stops after each unavailable track has failed", async () => {
	const { store, advance } = harness({ playlist: [song(1), song(2)] });
	await store.initialize();
	store.playIndex(0);
	const audio = store.getAudio();
	for (let i = 0; i < 3; i++) {
		audio.dispatchEvent(new Event("error"));
		await advance(1500);
	}
	assert.equal(store.getState().isLoading, false);
	assert.equal(store.getState().isPlaying, false);
	assert.equal(store.getState().willAutoPlay, false);
	assert.equal(store.getState().errorMessage, "musicPlayerErrorEmpty");
	assert.ok(audio.loadCalls <= 3);
	store.destroy();
});

test("play promise rejection broadcasts failure without claiming playback", async () => {
	const { store } = harness();
	await store.initialize();
	const audio = store.getAudio();
	let lastState;
	store.subscribe((state) => {
		lastState = state;
	});
	for (const name of ["NotAllowedError", "NotSupportedError"]) {
		audio.playError = new DOMException("Rejected", name);
		store.play();
		await tick();
		assert.equal(lastState.isPlaying, false);
		assert.equal(lastState.isLoading, false);
		assert.equal(lastState.showError, true);
		assert.equal(lastState.autoplayFailed, name === "NotAllowedError");
	}
	store.destroy();
});

test("switching a track resets time and duration before new metadata", async () => {
	const { store } = harness({ playlist: [song(1), song(2)] });
	await store.initialize();
	const audio = store.getAudio();
	audio.duration = 120;
	audio.dispatchEvent(new Event("loadeddata"));
	audio.currentTime = 40;
	audio.dispatchEvent(new Event("timeupdate"));
	store.next(false);
	assert.equal(store.getState().currentTime, 0);
	assert.equal(store.getState().duration, 0);
	store.destroy();
});

test("destroy cancels local loading timers and ignores late playback rejection", async () => {
	const { store, timers } = harness();
	await store.initialize();
	let reject;
	store.getAudio().playResult = new Promise((_, no) => {
		reject = no;
	});
	store.play();
	store.destroy();
	reject(new DOMException("Unavailable", "NotSupportedError"));
	await tick();
	assert.equal(store.getAudio(), null);
	assert.equal(store.getState().isLoading, false);
	assert.equal(store.getState().isPlaying, false);
	assert.equal(store.getState().showError, false);
	assert.equal(timers.size, 0);
});

test("explicit selection cancels a pending automatic skip", async () => {
	const { store, advance } = harness({ playlist: [song(1), song(2), song(3)] });
	await store.initialize();
	store.playIndex(0);
	store.getAudio().dispatchEvent(new Event("error"));
	store.playIndex(2);
	await advance(1500);
	assert.equal(store.getState().currentIndex, 2);
	store.destroy();
});

test("invalid seek and volume inputs cannot corrupt media state", async () => {
	const { store } = harness();
	await store.initialize();
	const audio = store.getAudio();
	store.setVolume(Number.NaN);
	assert.equal(store.getState().volume, 0.7);
	for (const duration of [0, Number.POSITIVE_INFINITY]) {
		audio.duration = duration;
		audio.dispatchEvent(new Event("loadeddata"));
		store.setProgress(0.5);
		assert.equal(store.getState().currentTime, 0);
	}
	store.destroy();
});

test("events from a destroyed audio element cannot revive loading or playback", async () => {
	const { store } = harness();
	await store.initialize();
	const audio = store.getAudio();
	store.destroy();
	for (const event of ["loadstart", "playing", "loadeddata"])
		audio.dispatchEvent(new Event(event));
	assert.equal(store.getState().isLoading, false);
	assert.equal(store.getState().isPlaying, false);
});

test("pause cancels an already scheduled failure recovery", async () => {
	const { store, advance } = harness({ playlist: [song(1), song(2)] });
	await store.initialize();
	store.playIndex(0);
	store.getAudio().dispatchEvent(new Event("error"));
	store.pause();
	await advance(1500);
	assert.equal(store.getState().currentIndex, 0);
	assert.equal(store.getState().willAutoPlay, false);
	store.destroy();
});

test("storage denial does not prevent initialization or volume changes", async () => {
	const { store, context } = harness();
	context.localStorage = {
		getItem() {
			throw new Error("Denied");
		},
		setItem() {
			throw new Error("Denied");
		},
	};
	await store.initialize();
	store.setVolume(0.4);
	assert.equal(store.getState().volume, 0.4);
	assert.equal(store.getState().playlist.length, 5);
	store.destroy();
});

test("successful play promise alone does not fabricate a playing event", async () => {
	const { store } = harness();
	await store.initialize();
	store.play();
	await tick();
	assert.equal(store.getState().isPlaying, false);
	store.getAudio().dispatchEvent(new Event("playing"));
	assert.equal(store.getState().isPlaying, true);
	store.destroy();
});

test("automatic interaction retry leaves ordinary keys and interactive control clicks alone", async () => {
	const { store, document } = harness();
	await store.initialize();
	const audio = store.getAudio();
	audio.playError = new DOMException("Blocked", "NotAllowedError");
	store.play();
	await tick();
	const arrow = new Event("keydown");
	Object.defineProperty(arrow, "key", { value: "ArrowDown" });
	document.dispatchEvent(arrow);
	await tick();
	assert.equal(audio.playCalls, 1);
	const buttonClick = new Event("click");
	Object.defineProperty(buttonClick, "target", {
		value: { closest: () => ({}) },
	});
	document.dispatchEvent(buttonClick);
	await tick();
	assert.equal(audio.playCalls, 1);
	document.dispatchEvent(new Event("click"));
	await tick();
	assert.equal(audio.playCalls, 2);
	store.destroy();
});

test("platform playback policy rejection is recognized by its standard error name", async () => {
	const { store } = harness();
	await store.initialize();
	store.getAudio().playError = { name: "NotAllowedError" };
	store.play();
	await tick();
	assert.equal(store.getState().autoplayFailed, true);
	store.destroy();
});

test("unmuting zero volume restores the previous audible volume", async () => {
	const { store } = harness();
	await store.initialize();
	store.setVolume(0.35);
	store.setVolume(0);
	store.toggleMute();
	assert.equal(store.getState().volume, 0.35);
	assert.equal(store.getState().isMuted, false);
	assert.equal(store.getAudio().volume, 0.35);
	assert.equal(store.getAudio().muted, false);
	store.destroy();
});

test("background local media failure stays inline and explicit retry failure announces briefly", async () => {
	const { store, advance, fetchCalls } = harness({playlist: [song(1)]});
	await store.initialize();
	const audio = store.getAudio();
	audio.dispatchEvent(new Event("error"));
	assert.equal(store.getState().showError, false);
	assert.equal(store.getState().errorMessage, "本地音频加载失败，请重试。");
	store.retry();
	assert.equal(store.getState().isLoading, true);
	audio.dispatchEvent(new Event("error"));
	assert.equal(store.getState().showError, true);
	await advance(3500);
	assert.equal(store.getState().showError, false);
	assert.ok(store.getState().errorMessage);
	assert.equal(fetchCalls.length, 0);
	store.destroy();
});

test("list repeat restarts a single local track while sequential mode stops", async () => {
	const { store } = harness({playlist: [song(1)]});
	await store.initialize();
	const audio = store.getAudio();
	audio.dispatchEvent(new Event("ended"));
	assert.equal(audio.playCalls, 0);
	store.toggleRepeat();
	store.toggleRepeat();
	audio.dispatchEvent(new Event("ended"));
	assert.equal(audio.playCalls, 1);
	store.destroy();
});

test("disabled music creates neither an audio element nor API requests", async () => {
	const { store, fetchCalls } = harness({ enabled: false });
	await store.initialize();
	assert.equal(store.getAudio(), null);
	assert.equal(fetchCalls.length, 0);
	store.destroy();
});

test("a single local track ending publishes its stopped state to subscribers", async () => {
	const { store } = harness();
	await store.initialize();
	let snapshot;
	store.subscribe((state) => {
		snapshot = state;
	});
	store.getAudio().dispatchEvent(new Event("playing"));
	assert.equal(snapshot.isPlaying, true);
	store.getAudio().dispatchEvent(new Event("ended"));
	assert.equal(snapshot.isPlaying, false);
	store.destroy();
});
