import type { Song } from "./types";
import tracks from "../../../data/local-music.json";
import { profileConfig } from "../../../config/profileConfig";

export const STORAGE_KEY_VOLUME = "music-player-volume";

export const DEFAULT_VOLUME = 0.7;

export const LOCAL_PLAYLIST: Song[] = tracks.map((track) => ({
	...track,
	cover: profileConfig.avatar ?? "",
}));

export const DEFAULT_SONG: Song = {
	title: "",
	artist: "",
	cover: profileConfig.avatar ?? "",
	url: "",
	duration: 0,
	id: 0,
};

export const ERROR_DISPLAY_DURATION = 3000;
export const SKIP_ERROR_DELAY = 1000;
export const AUDIO_LOAD_TIMEOUT = 20_000;
