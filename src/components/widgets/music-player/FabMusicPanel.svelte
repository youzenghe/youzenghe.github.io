<script lang="ts">
import Icon from "@components/common/LocalIcon.svelte";
import Key from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { onMount } from "svelte";

import type { MusicPlayerState } from "@/stores/musicPlayerStore";
import { musicPlayerStore } from "@/stores/musicPlayerStore";

import SidebarPlaylist from "../music-sidebar/components/SidebarPlaylist.svelte";
import CoverImage from "./atoms/CoverImage.svelte";
import NextButton from "./atoms/NextButton.svelte";
import PlayButton from "./atoms/PlayButton.svelte";
import PrevButton from "./atoms/PrevButton.svelte";
import VolumeButton from "./atoms/VolumeButton.svelte";
import { formatTime } from "./hooks/useKeyboardShortcuts";
import ProgressControl from "./molecules/ProgressControl.svelte";
import PlayerStatus from "./PlayerStatus.svelte";
import { sliderKeyboardValue } from "./slider-keyboard";

let playerState: MusicPlayerState = $state(musicPlayerStore.getState());
let showPlaylist = $state(false);
interface Props { compact?: boolean; frosted?: boolean; onClose: () => void; }
const {compact = false, frosted = false, onClose}: Props = $props();

onMount(() => {
	return musicPlayerStore.subscribe((state) => {
		playerState = state;
	});
});

function togglePlay() {
	musicPlayerStore.toggle();
}

function prev() {
	musicPlayerStore.prev();
}

function next() {
	musicPlayerStore.next();
}

function toggleMode() {
	musicPlayerStore.toggleMode();
}

function togglePlaylistView() {
	showPlaylist = !showPlaylist;
}

function playIndex(index: number) {
	musicPlayerStore.playIndex(index);
}

function seek(time: number) {
	musicPlayerStore.seek(time);
}

function progressClick(event: MouseEvent) {
	const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
	if (rect.width > 0)
		musicPlayerStore.setProgress((event.clientX - rect.left) / rect.width);
}

function progressKeyDown(event: KeyboardEvent) {
	const time = sliderKeyboardValue(
		event.key,
		playerState.currentTime,
		0,
		playerState.duration,
		5,
	);
	if (time !== null) {
		event.preventDefault();
		event.stopPropagation();
		seek(time);
	}
}

function retry() {
	musicPlayerStore.retry();
}

function toggleMute() {
	musicPlayerStore.toggleMute();
}

function setVolume(volume: number) {
	musicPlayerStore.setVolume(volume);
}

const modeLabel = $derived(
	playerState.isShuffled
		? i18n(Key.musicPlayerShuffle)
		: playerState.isRepeating === 1
			? i18n(Key.musicPlayerRepeatOne)
			: playerState.isRepeating === 2
				? i18n(Key.musicPlayerRepeat)
				: "顺序播放",
);
</script>

<div
	class="fab-music-panel card-base shadow-xl rounded-2xl p-4 w-[20rem] max-w-[calc(100vw-2rem)]"
	class:compact
	class:frosted
	role="region"
	aria-label="浮动音乐播放器"
	style="width:min(20rem,var(--music-panel-width,20rem));"
>
	<button type="button" class="fab-music-close btn-plain" aria-label="关闭音乐播放器" onclick={onClose}>
		<Icon icon="material-symbols:close" class="text-lg" />
	</button>
	<div class="fab-music-header">
		<CoverImage
			cover={playerState.currentSong.cover}
			isPlaying={playerState.isPlaying}
			isLoading={playerState.isLoading}
			size="mini"
		/>
		<div class="min-w-0 flex-1">
			<div class="font-semibold truncate">{playerState.currentSong.title}</div>
			{#if playerState.currentSong.artist}<div class="text-xs text-(--content-meta) truncate">{playerState.currentSong.artist}</div>{/if}
			<div class="fab-music-meta">
				<span class="text-xs whitespace-nowrap">{formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}</span>
				<VolumeButton volume={playerState.volume} isMuted={playerState.isMuted} onclick={toggleMute} />
				{#if !compact}<input type="range" min="0" max="1" step="0.05"
					class="fab-volume-slider" aria-label={i18n(Key.musicPlayerVolume)}
					value={playerState.isMuted ? 0 : playerState.volume}
					oninput={(event) => setVolume(Number(event.currentTarget.value))} />{/if}
			</div>
		</div>
	</div>

	<PlayerStatus isLoading={playerState.isLoading} errorMessage={playerState.errorMessage} onRetry={retry} />

	<ProgressControl
		currentTime={playerState.currentTime}
		duration={playerState.duration}
		onProgressClick={progressClick}
		onProgressKeyDown={progressKeyDown}
	/>

	<div class="fab-music-controls">
		<button type="button" class="btn-plain w-8 h-8 rounded-lg"
			onclick={toggleMode} aria-label={`播放模式：${modeLabel}`}
			aria-pressed={playerState.isShuffled || playerState.isRepeating > 0}>
			<Icon icon={playerState.isShuffled ? "material-symbols:shuffle-rounded" : playerState.isRepeating === 1 ? "material-symbols:repeat-one-rounded" : "material-symbols:repeat-rounded"} class="text-xl" />
		</button>
		<PrevButton onclick={prev} disabled={playerState.playlist.length <= 1} />
		<PlayButton isPlaying={playerState.isPlaying} isLoading={playerState.isLoading}
			disabled={playerState.playlist.length === 0} onclick={togglePlay} />
		<NextButton onclick={next} disabled={playerState.playlist.length <= 1} />
		<button type="button" class="btn-plain w-8 h-8 rounded-lg"
			onclick={togglePlaylistView} aria-label={i18n(Key.musicPlayerPlaylist)} aria-expanded={showPlaylist}>
			<Icon icon="material-symbols:queue-music-rounded" class="text-xl" />
		</button>
	</div>

	<div inert={!showPlaylist} aria-hidden={!showPlaylist}>
		<SidebarPlaylist
			playlist={playerState.playlist}
			currentIndex={playerState.currentIndex}
			isPlaying={playerState.isPlaying}
			show={showPlaylist}
			onClose={togglePlaylistView}
			onPlaySong={playIndex}
		/>
	</div>
</div>

<style>
	.fab-music-panel {
		position: relative;
		max-height: min(var(--music-panel-height,260px),calc(100dvh - var(--music-panel-top) - 16px));
		overflow-y: auto;
		overscroll-behavior: contain;
		border-radius: 1.25rem;
		background: var(--card-bg);
		border: 1px solid color-mix(in srgb, var(--line-color) 65%, transparent);
		box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
	}
	.fab-music-close { position:absolute; right:0.3rem; top:0.3rem; width:1.75rem; height:1.75rem; border-radius:50%; display:flex; align-items:center; justify-content:center; }
	.fab-music-header { padding-right:1.25rem; }
	.fab-music-panel.compact { padding:0.6rem 0.75rem; max-height:min(var(--music-panel-height,156px),calc(100dvh - var(--music-panel-top) - 16px)); overflow-y:auto; overscroll-behavior:contain; scrollbar-width:thin; }
	.fab-music-panel.frosted {
		--music-overlay-tint: 18%;
		--music-overlay-blur: 2px;
		--music-overlay-content: 0.35;
		background: color-mix(in srgb,var(--card-bg) var(--music-overlay-tint),transparent);
		backdrop-filter: blur(var(--music-overlay-blur));
		-webkit-backdrop-filter: blur(var(--music-overlay-blur));
		border-color: color-mix(in srgb,var(--line-color) 25%,transparent);
		box-shadow: 0 4px 14px rgba(15,23,42,0.025);
		transition: background-color 180ms ease, box-shadow 180ms ease;
	}
	.frosted > :global(*) { opacity:var(--music-overlay-content); transition:opacity 180ms ease; }
	.frosted:focus-within {
		--music-overlay-tint: 94%;
		--music-overlay-blur: 12px;
		--music-overlay-content: 1;
	}
	@media (hover: hover) and (pointer: fine) {
		.frosted:hover {
			--music-overlay-tint: 94%;
			--music-overlay-blur: 12px;
			--music-overlay-content: 1;
		}
	}
	@media (hover: none) {
		.fab-music-panel.frosted {
			--music-overlay-tint: 85%;
			--music-overlay-blur: 6px;
			--music-overlay-content: 1;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.frosted, .frosted > :global(*) { transition:none; }
	}
	.compact .fab-music-header { margin-bottom:0.25rem; gap:0.5rem; }
	.compact .fab-music-header :global(.cover-container) { width:2.5rem; height:2.5rem; flex-shrink:0; }
	.compact .fab-music-header .font-semibold { font-size:0.875rem; }
	.compact :global(.progress-section) { margin-bottom:0.35rem; }
	.compact .fab-music-controls { margin-top:0.15rem; }
	.compact .fab-music-controls :global(button) { width:2.25rem; height:2.25rem; }

	:global(.dark) .fab-music-panel {
		box-shadow: 0 18px 50px rgba(0, 0, 0, 0.5);
	}

	.fab-music-header {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		margin-bottom: 0.75rem;
	}

	.fab-music-meta {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.fab-volume-slider {
		width: 3rem;
		min-width: 2rem;
		accent-color: var(--primary);
	}

	.fab-music-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.25rem;
	}

	@media (width < 640px) {
		.fab-music-panel {
			padding: 0.9rem 0.85rem 0.9rem 0.9rem;
			border-radius: 1rem;
		}
	}
</style>
