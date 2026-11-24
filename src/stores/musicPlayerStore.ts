import Key from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

import {
	AUDIO_LOAD_TIMEOUT,
	DEFAULT_SONG,
	ERROR_DISPLAY_DURATION,
	LOCAL_PLAYLIST,
	SKIP_ERROR_DELAY,
	STORAGE_KEY_VOLUME,
} from "@/components/widgets/music-player/constants";
import {
	isLocalMusicAssetPath,
	resolveLocalMusicAssetPath,
} from "@/components/widgets/music-player/music-assets";
import type { RepeatMode, Song } from "@/components/widgets/music-player/types";
import { musicPlayerConfig } from "@/config";

export interface MusicPlayerState {
	currentSong: Song;
	playlist: Song[];
	currentIndex: number;
	isPlaying: boolean;
	isLoading: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	isMuted: boolean;
	isShuffled: boolean;
	isRepeating: RepeatMode;
	showPlaylist: boolean;
	errorMessage: string;
	showError: boolean;
	isExpanded: boolean;
	isHidden: boolean;
	autoplayFailed: boolean;
	willAutoPlay: boolean;
}

class MusicPlayerStore {
	private audio: HTMLAudioElement | null = null;
	private state: MusicPlayerState;
	private isInitialized = false;
	private unregisterInteraction: (() => void) | undefined;
	private listeners = new Set<(state: MusicPlayerState) => void>();
	private loadTimer: ReturnType<typeof setTimeout> | undefined;
	private skipTimer: ReturnType<typeof setTimeout> | undefined;
	private errorTimer: ReturnType<typeof setTimeout> | undefined;
	private failedTracks = new Set<number>();
	private loadVersion = 0;
	private playVersion = 0;
	private playPending = false;
	private lastAudibleVolume = 0.7;
	private notifyLoadErrors = false;

	constructor() {
		this.state = this.createInitialState();
	}

	private createInitialState(): MusicPlayerState {
		return {
			currentSong: { ...DEFAULT_SONG, title: "", artist: "" },
			playlist: [],
			currentIndex: 0,
			isPlaying: false,
			isLoading: false,
			currentTime: 0,
			duration: 0,
			volume: 0.7,
			isMuted: false,
			isShuffled: false,
			isRepeating: 0,
			showPlaylist: false,
			errorMessage: "",
			showError: false,
			isExpanded: false,
			isHidden: false,
			autoplayFailed: false,
			willAutoPlay: false,
		};
	}

	private createSnapshot(): MusicPlayerState {
		return {
			...this.state,
			currentSong: { ...this.state.currentSong },
			playlist: this.state.playlist.map((song) => ({ ...song })),
		};
	}

	getState(): MusicPlayerState {
		return this.createSnapshot();
	}

	getAudio(): HTMLAudioElement | null {
		return this.audio;
	}

	subscribe(listener: (state: MusicPlayerState) => void): () => void {
		this.listeners.add(listener);
		listener(this.createSnapshot());
		return () => {
			this.listeners.delete(listener);
		};
	}

	async initialize(): Promise<void> {
		if (typeof window === "undefined" || this.isInitialized) {
			return;
		}
		this.isInitialized = true;

		if (!musicPlayerConfig.enable) {
			return;
		}

		this.audio = new Audio();
		this.setupAudioListeners();
		this.loadVolumeFromStorage();
		this.registerInteractionHandler();
		this.loadLocalPlaylist();
	}

	private setupAudioListeners(): void {
		if (!this.audio) {
			return;
		}

		this.audio.volume = this.state.volume;
		this.audio.muted = this.state.isMuted;
		const audio = this.audio;
		const listen = (
			event: keyof HTMLMediaElementEventMap,
			handler: () => void,
		) => {
			audio.addEventListener(event, () => {
				if (this.audio === audio) handler();
			});
		};

		listen("playing", () => {
			this.playPending = false;
			this.state.willAutoPlay = false;
			this.state.isPlaying = true;
			this.state.isLoading = false;
			this.state.autoplayFailed = false;
			this.clearError();
			this.failedTracks.clear();
			this.clearLoadTimer();
			this.broadcastState();
		});

		listen("pause", () => {
			this.state.isPlaying = false;
			this.broadcastState();
		});

		listen("timeupdate", () => {
			if (this.audio) {
				this.state.currentTime = this.audio.currentTime;
				this.broadcastState();
			}
		});

		listen("ended", () => {
			this.handleAudioEnded();
		});

		listen("error", () => {
			this.handleAudioError();
		});

		listen("loadeddata", () => {
			this.handleAudioLoaded();
		});
		listen("canplay", () => {
			this.handleAudioLoaded();
		});
		listen("loadedmetadata", () => {
			this.updateDuration();
			this.broadcastState();
		});
		listen("durationchange", () => {
			this.updateDuration();
			this.broadcastState();
		});

		listen("loadstart", () => {
			this.state.isLoading = true;
			this.broadcastState();
		});
		listen("waiting", () => {
			if (this.state.isPlaying || this.state.willAutoPlay || this.playPending) {
				this.state.isLoading = true;
				this.startLoadTimer();
				this.broadcastState();
			}
		});
	}

	private handleAudioEnded(): void {
		this.state.isPlaying = false;
		if (
			this.state.isRepeating === 1 ||
			(this.state.isRepeating === 2 && this.state.playlist.length === 1)
		) {
			if (this.audio) {
				this.audio.currentTime = 0;
				this.requestPlay();
			}
		} else {
			this.next(true);
		}
		this.broadcastState();
	}

	private handleAudioError(): void {
		if (!this.audio || !this.state.currentSong.url) {
			return;
		}
		const shouldContinue =
			this.state.isPlaying || this.state.willAutoPlay || this.playPending;
		if (
			!this.state.isLoading &&
			!shouldContinue &&
			this.failedTracks.has(this.state.currentIndex)
		)
			return;
		this.clearLoadTimer();
		this.clearSkipTimer();
		this.playVersion++;
		this.playPending = false;
		this.audio.pause();
		this.state.isPlaying = false;
		this.state.isLoading = false;
		this.state.willAutoPlay = false;
		this.state.autoplayFailed = false;
		this.failedTracks.add(this.state.currentIndex);
		if (
			shouldContinue &&
			this.failedTracks.size >= this.state.playlist.length
		) {
			this.showError(i18n(Key.musicPlayerErrorEmpty));
		} else {
			this.showError(
				shouldContinue && this.state.playlist.length > 1
					? i18n(Key.musicPlayerErrorSong)
					: "本地音频加载失败，请重试。",
				shouldContinue || this.notifyLoadErrors,
			);
			if (shouldContinue && this.state.playlist.length > 1) {
				const version = this.loadVersion;
				this.skipTimer = setTimeout(() => {
					this.skipTimer = undefined;
					if (!this.audio || version !== this.loadVersion) return;
					const available = this.state.playlist
						.map((_, index) => index)
						.filter((index) => !this.failedTracks.has(index));
					const nextIndex = this.state.isShuffled
						? available[Math.floor(Math.random() * available.length)]
						: (available.find((index) => index > this.state.currentIndex) ??
							available[0]);
					if (nextIndex !== undefined) {
						this.state.currentIndex = nextIndex;
						this.loadSong(this.state.playlist[nextIndex], true);
					}
				}, SKIP_ERROR_DELAY);
			}
		}
		this.broadcastState();
	}

	private updateDuration(): void {
		if (this.audio) {
			this.state.duration =
				Number.isFinite(this.audio.duration) && this.audio.duration > 0
					? this.audio.duration
					: 0;
			this.state.currentSong = {
				...this.state.currentSong,
				duration: this.state.duration,
			};
		}
	}

	private handleAudioLoaded(): void {
		this.clearLoadTimer();
		this.state.isLoading = false;
		this.updateDuration();
		if (this.state.willAutoPlay && !this.playPending) {
			this.state.willAutoPlay = false;
			if (!this.state.isPlaying) this.requestPlay();
		}
		this.broadcastState();
	}

	private loadVolumeFromStorage(): void {
		try {
			if (typeof localStorage !== "undefined") {
				const savedVolume = localStorage.getItem(STORAGE_KEY_VOLUME);
				if (savedVolume) {
					const volume = Number.parseFloat(savedVolume);
					if (!Number.isNaN(volume) && volume >= 0 && volume <= 1) {
						this.state.volume = volume;
						if (volume > 0) this.lastAudibleVolume = volume;
						this.state.isMuted = volume === 0;
						if (this.audio) {
							this.audio.volume = volume;
							this.audio.muted = this.state.isMuted;
						}
					}
				}
			}
		} catch {
			// Storage can be unavailable in private or restricted browsing.
		}
	}

	private registerInteractionHandler(): void {
		const handler = (event: Event) => {
			if (event.defaultPrevented) return;
			if (event.type === "keydown") {
				const key = (event as KeyboardEvent).key;
				if (key !== "Enter" && key !== " ") return;
			}
			const target = event.target as HTMLElement | null;
			if (
				target?.closest?.(
					"button, a, input, select, textarea, [role='button'], [role='slider'], [contenteditable]",
				)
			)
				return;
			if (this.state.autoplayFailed && this.audio && !this.state.isLoading) {
				this.requestPlay();
			}
		};
		document.addEventListener("click", handler);
		document.addEventListener("keydown", handler);
		this.unregisterInteraction = () => {
			document.removeEventListener("click", handler);
			document.removeEventListener("keydown", handler);
		};
	}

	private loadLocalPlaylist(notify = false): void {
		this.clearError();
		this.failedTracks.clear();
		this.state.currentIndex = 0;
		this.state.playlist = LOCAL_PLAYLIST.filter((song) =>
			isLocalMusicAssetPath(song.url),
		).map((song) => ({
			...song,
			cover: isLocalMusicAssetPath(song.cover)
				? song.cover
				: DEFAULT_SONG.cover,
		}));
		if (this.state.playlist.length === 0) {
			this.state.currentSong = { ...DEFAULT_SONG };
			this.state.currentTime = 0;
			this.state.duration = 0;
			this.state.isLoading = false;
			this.showError(i18n(Key.musicPlayerErrorEmpty), notify);
		} else {
			this.loadSong(this.state.playlist[0], false, notify);
		}
	}

	private loadSong(song: Song, autoPlay = true, notify = autoPlay): void {
		if (!song?.url) {
			return;
		}
		this.clearLoadTimer();
		this.clearSkipTimer();
		this.loadVersion++;
		this.playVersion++;
		this.playPending = false;
		this.state.currentSong = { ...song };
		this.state.currentTime = 0;
		this.state.duration = 0;
		this.state.isPlaying = false;
		this.state.isLoading = true;
		this.state.autoplayFailed = false;
		this.clearError();
		this.notifyLoadErrors = notify;
		this.state.willAutoPlay = autoPlay;
		if (this.audio) {
			this.audio.pause();
			this.audio.src = resolveLocalMusicAssetPath(song.url);
			this.audio.load();
			this.startLoadTimer();
		}
		this.broadcastState();
	}

	private showError(message: string, notify = true): void {
		clearTimeout(this.errorTimer);
		this.errorTimer = undefined;
		this.state.errorMessage = message;
		this.state.showError = notify;
		if (notify) {
			this.errorTimer = setTimeout(() => {
				this.errorTimer = undefined;
				this.state.showError = false;
				this.broadcastState();
			}, ERROR_DISPLAY_DURATION);
		}
		this.broadcastState();
	}

	private clearError(): void {
		clearTimeout(this.errorTimer);
		this.errorTimer = undefined;
		this.state.errorMessage = "";
		this.state.showError = false;
	}

	private clearLoadTimer(): void {
		clearTimeout(this.loadTimer);
		this.loadTimer = undefined;
	}

	private clearSkipTimer(): void {
		clearTimeout(this.skipTimer);
		this.skipTimer = undefined;
	}

	private startLoadTimer(): void {
		this.clearLoadTimer();
		const version = this.loadVersion;
		this.loadTimer = setTimeout(() => {
			if (version === this.loadVersion && this.state.isLoading)
				this.handleAudioError();
		}, AUDIO_LOAD_TIMEOUT);
	}

	private requestPlay(): void {
		const audio = this.audio;
		if (!audio || !this.state.currentSong.url) return;
		const version = ++this.playVersion;
		const loadVersion = this.loadVersion;
		this.state.autoplayFailed = false;
		this.state.willAutoPlay = false;
		this.playPending = true;
		audio
			.play()
			.then(() => {
				if (
					this.audio !== audio ||
					version !== this.playVersion ||
					loadVersion !== this.loadVersion
				)
					return;
				this.state.autoplayFailed = false;
				this.state.willAutoPlay = false;
				this.playPending = false;
				this.broadcastState();
			})
			.catch((error: unknown) => {
				if (
					this.audio !== audio ||
					version !== this.playVersion ||
					loadVersion !== this.loadVersion
				)
					return;
				const errorName =
					typeof error === "object" &&
					error !== null &&
					"name" in error &&
					typeof error.name === "string"
						? error.name
						: "";
				if (errorName === "AbortError") {
					this.playPending = false;
					return;
				}
				this.clearLoadTimer();
				this.playPending = false;
				this.state.isLoading = false;
				this.state.isPlaying = false;
				this.state.willAutoPlay = false;
				this.state.autoplayFailed = errorName === "NotAllowedError";
				this.showError(
					this.state.autoplayFailed
						? "浏览器阻止了播放，请点击播放按钮重试。"
						: "本地音频加载失败，请重试。",
				);
			});
	}

	retry(): void {
		if (!this.audio || this.state.isLoading) return;
		this.failedTracks.clear();
		if (this.state.currentSong.url) {
			if (this.state.autoplayFailed) this.requestPlay();
			else this.loadSong(this.state.currentSong, true);
		} else {
			this.loadLocalPlaylist(true);
		}
	}

	hideError(): void {
		clearTimeout(this.errorTimer);
		this.errorTimer = undefined;
		this.state.showError = false;
		this.broadcastState();
	}

	toggle(): void {
		if (!this.audio) return;
		if (!this.state.currentSong.url || this.state.errorMessage) {
			this.retry();
			return;
		}
		if (this.state.isPlaying) {
			this.pause();
		} else {
			this.requestPlay();
		}
	}

	play(): void {
		if (!this.audio || !this.state.currentSong.url) {
			return;
		}
		this.requestPlay();
	}

	pause(): void {
		if (!this.audio || !this.state.currentSong.url) {
			return;
		}
		this.playVersion++;
		this.playPending = false;
		this.state.willAutoPlay = false;
		this.clearSkipTimer();
		this.audio.pause();
	}

	next(autoPlay = true): void {
		if (this.state.playlist.length <= 1) {
			return;
		}
		this.failedTracks.clear();

		let newIndex: number;
		if (this.state.isShuffled) {
			do {
				newIndex = Math.floor(Math.random() * this.state.playlist.length);
			} while (
				newIndex === this.state.currentIndex &&
				this.state.playlist.length > 1
			);
		} else {
			newIndex =
				this.state.currentIndex < this.state.playlist.length - 1
					? this.state.currentIndex + 1
					: 0;
		}

		this.state.currentIndex = newIndex;
		this.loadSong(this.state.playlist[newIndex], autoPlay);
	}

	prev(): void {
		if (this.state.playlist.length <= 1) {
			return;
		}
		this.failedTracks.clear();
		const newIndex =
			this.state.currentIndex > 0
				? this.state.currentIndex - 1
				: this.state.playlist.length - 1;
		this.state.currentIndex = newIndex;
		this.loadSong(this.state.playlist[newIndex], true);
	}

	playIndex(index: number): void {
		if (
			!Number.isInteger(index) ||
			index < 0 ||
			index >= this.state.playlist.length
		) {
			return;
		}
		this.failedTracks.clear();
		this.state.currentIndex = index;
		this.loadSong(this.state.playlist[index], true);
	}

	seek(time: number): void {
		if (!this.audio || !this.state.currentSong.url) {
			return;
		}
		if (
			Number.isFinite(time) &&
			Number.isFinite(this.state.duration) &&
			this.state.duration > 0 &&
			time >= 0 &&
			time <= this.state.duration
		) {
			this.audio.currentTime = time;
			this.state.currentTime = time;
			this.broadcastState();
		}
	}

	setVolume(volume: number): void {
		if (!Number.isFinite(volume)) return;
		const clampedVolume = Math.max(0, Math.min(1, volume));
		this.state.volume = clampedVolume;
		if (clampedVolume > 0) this.lastAudibleVolume = clampedVolume;
		this.state.isMuted = clampedVolume === 0;
		if (this.audio) {
			this.audio.volume = clampedVolume;
			this.audio.muted = this.state.isMuted;
		}
		try {
			if (typeof localStorage !== "undefined") {
				localStorage.setItem(STORAGE_KEY_VOLUME, String(clampedVolume));
			}
		} catch {
			// Playback remains usable when storage is blocked.
		}
		this.broadcastState();
	}

	toggleMute(): void {
		if (this.state.volume === 0) {
			this.setVolume(this.lastAudibleVolume);
			return;
		}
		this.state.isMuted = !this.state.isMuted;
		if (this.audio) {
			this.audio.muted = this.state.isMuted;
		}
		this.broadcastState();
	}

	toggleShuffle(): void {
		this.state.isShuffled = !this.state.isShuffled;
		if (this.state.isShuffled) {
			this.state.isRepeating = 0;
		}
		this.broadcastState();
	}

	toggleRepeat(): void {
		this.state.isRepeating = ((this.state.isRepeating + 1) % 3) as RepeatMode;
		if (this.state.isRepeating !== 0) {
			this.state.isShuffled = false;
		}
		this.broadcastState();
	}

	toggleMode(): void {
		if (this.state.isShuffled) {
			this.toggleShuffle();
			return;
		}
		if (this.state.isRepeating === 2) {
			this.toggleRepeat();
			this.toggleShuffle();
			return;
		}
		this.toggleRepeat();
	}

	togglePlaylist(): void {
		this.state.showPlaylist = !this.state.showPlaylist;
		this.broadcastState();
	}

	toggleExpanded(): void {
		this.state.isExpanded = !this.state.isExpanded;
		// 保持与原先 usePlayerState.toggleExpandedUI 一致的联动行为：
		// 展开时强制取消隐藏，并关闭播放列表，避免状态组合异常
		if (this.state.isExpanded) {
			this.state.showPlaylist = false;
			this.state.isHidden = false;
		}
		this.broadcastState();
	}

	toggleHidden(): void {
		this.state.isHidden = !this.state.isHidden;
		// 保持与原先 usePlayerState.toggleHiddenUI 一致的联动行为：
		// 隐藏时收起播放器并关闭播放列表，防止展开 UI 悬挂在小球旁边
		if (this.state.isHidden) {
			this.state.isExpanded = false;
			this.state.showPlaylist = false;
		}
		this.broadcastState();
	}

	canSkip(): boolean {
		return this.state.playlist.length > 1;
	}

	setProgress(percent: number): void {
		if (
			!Number.isFinite(percent) ||
			!Number.isFinite(this.state.duration) ||
			this.state.duration <= 0
		) {
			return;
		}
		this.seek(Math.max(0, Math.min(1, percent)) * this.state.duration);
	}

	private broadcastState(): void {
		const snapshot = this.createSnapshot();

		for (const listener of this.listeners) {
			listener(snapshot);
		}

		if (typeof window === "undefined") {
			return;
		}
		window.dispatchEvent(
			new CustomEvent("music-sidebar:state", {
				detail: snapshot,
			}),
		);
	}

	destroy(): void {
		this.isInitialized = false;
		this.clearLoadTimer();
		this.clearSkipTimer();
		this.loadVersion++;
		this.playVersion++;
		this.playPending = false;
		if (this.unregisterInteraction) {
			this.unregisterInteraction();
		}
		if (this.audio) {
			this.audio.pause();
			this.audio.src = "";
			this.audio = null;
		}
		this.state.isLoading = false;
		this.state.isPlaying = false;
		this.state.willAutoPlay = false;
		this.state.autoplayFailed = false;
		this.notifyLoadErrors = false;
		clearTimeout(this.errorTimer);
		this.errorTimer = undefined;
		this.state.showError = false;
		this.broadcastState();
	}
}

export const musicPlayerStore = new MusicPlayerStore();
