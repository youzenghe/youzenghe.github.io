import { LOCAL_PLAYLIST } from "../constants";
import type { RepeatMode, Song } from "../types";

export interface PlaylistState {
	playlist: Song[];
	currentIndex: number;
	isShuffled: boolean;
	isRepeating: RepeatMode;
}

export function createPlaylistState(): PlaylistState {
	return {
		playlist: [],
		currentIndex: 0,
		isShuffled: false,
		isRepeating: 0,
	};
}

export function toggleShuffle(state: PlaylistState) {
	state.isShuffled = !state.isShuffled;
	if (state.isShuffled) {
		state.isRepeating = 0;
	}
}

export function toggleRepeat(state: PlaylistState) {
	state.isRepeating = ((state.isRepeating + 1) % 3) as RepeatMode;
	if (state.isRepeating !== 0) {
		state.isShuffled = false;
	}
}

export function previousSong(state: PlaylistState): number {
	if (state.playlist.length <= 1) {
		return state.currentIndex;
	}
	return state.currentIndex > 0
		? state.currentIndex - 1
		: state.playlist.length - 1;
}

export function nextSong(state: PlaylistState, _autoPlay = true): number {
	if (state.playlist.length <= 1) {
		return state.currentIndex;
	}

	let newIndex: number;
	if (state.isShuffled) {
		do {
			newIndex = Math.floor(Math.random() * state.playlist.length);
		} while (newIndex === state.currentIndex && state.playlist.length > 1);
	} else {
		newIndex =
			state.currentIndex < state.playlist.length - 1
				? state.currentIndex + 1
				: 0;
	}
	return newIndex;
}

export function playSong(state: PlaylistState, index: number): boolean {
	if (index < 0 || index >= state.playlist.length) {
		return false;
	}
	state.currentIndex = index;
	return true;
}

export function loadLocalPlaylist(
	state: PlaylistState,
	showError: (message: string) => void,
): boolean {
	state.playlist = [...LOCAL_PLAYLIST];
	if (state.playlist.length === 0) {
		showError("本地播放列表为空");
		return false;
	}
	return true;
}

export function canSkip(state: PlaylistState): boolean {
	return state.playlist.length > 1;
}
