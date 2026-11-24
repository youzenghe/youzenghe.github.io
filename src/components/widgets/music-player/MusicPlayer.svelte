<script lang="ts">
import Icon from "@components/common/LocalIcon.svelte";
import { onDestroy, onMount } from "svelte";
import { cubicOut } from "svelte/easing";
import { fly } from "svelte/transition";

import { musicPlayerConfig } from "@/config";
import type { MusicPlayerState } from "@/stores/musicPlayerStore";
import { musicPlayerStore } from "@/stores/musicPlayerStore";

import CoverImage from "./atoms/CoverImage.svelte";
import FabMusicPanel from "./FabMusicPanel.svelte";
import MiniPlayer from "./organisms/MiniPlayer.svelte";
import PlayerBar from "./organisms/PlayerBar.svelte";
import Playlist from "./organisms/Playlist.svelte";
import { sliderKeyboardValue } from "./slider-keyboard";
import { chooseMusicPanelPosition, shouldCloseMusicPanelOnEscape } from "@/utils/music-panel-placement";

let state: MusicPlayerState = musicPlayerStore.getState();
const showFloatingPlayer = musicPlayerConfig.showFloatingPlayer;
const floatingEntryMode = musicPlayerConfig.floatingEntryMode ?? "default";
const useFabEntry = floatingEntryMode === "fab";
const shouldRenderFloatingUi = showFloatingPlayer && musicPlayerConfig.enable;
let unsubscribe: (() => void) | undefined;
let panelElement: HTMLElement | undefined;
let panelPlacement = {left:16,top:16,width:320,height:156,compact:false,canPlace:true,frosted:false};
let placementFrame = 0;

function updatePanelPlacement() {
	placementFrame = 0;
	if (!state.isExpanded || !panelElement) return;
	const viewport = {width: window.innerWidth, height: window.innerHeight};
	const button = document.querySelector(".music-fab");
	const anchor = button?.getBoundingClientRect() ?? {left: viewport.width-64, top: viewport.height-80, width:48, height:48};
	const obstacles = [...document.querySelectorAll<HTMLElement>("#main-grid .card-base, widget-layout")]
		.filter(element => !element.contains(panelElement!) && element.getBoundingClientRect().width > 0)
		.map(element => element.getBoundingClientRect());
	const reserved = [...document.querySelectorAll<HTMLElement>("#navbar, .floating-controls-container")].map(element => element.getBoundingClientRect());
	panelPlacement = chooseMusicPanelPosition(viewport, {width:320,height:260}, obstacles, anchor, reserved);
	if (!panelPlacement.canPlace) closeFloatingPlayer();
}

function schedulePlacement() {
	if (state.isExpanded && panelElement && !placementFrame) placementFrame = requestAnimationFrame(updatePanelPlacement);
}

function positionPanel(node: HTMLElement) {
	panelElement = node;
	const observer = new ResizeObserver(schedulePlacement);
	observer.observe(node);
	schedulePlacement();
	return {destroy() { observer.disconnect(); if (panelElement === node) panelElement = undefined; }};
}

function closeFloatingPlayer(restoreFocus = false) {
	if (!state.isExpanded) return;
	musicPlayerStore.toggleExpanded();
	if (restoreFocus) document.querySelector<HTMLElement>(".music-fab")?.focus();
}

function handlePanelEscape(event: KeyboardEvent) {
	const active = document.activeElement;
	const ownsFocus = !!active && (!!panelElement?.contains(active) || !!active.closest(".music-fab"));
	if (state.isExpanded && shouldCloseMusicPanelOnEscape(event, ownsFocus)) {
		event.preventDefault();
		event.stopPropagation();
		closeFloatingPlayer(true);
	}
}

function handleOutsidePointer(event: PointerEvent) {
	const target = event.target as Element | null;
	if (state.isExpanded && panelElement && target && !panelElement.contains(target) && !target.closest(".music-fab")) closeFloatingPlayer();
}

function togglePlay() {
	musicPlayerStore.toggle();
}

function prev() {
	musicPlayerStore.prev();
}

function next() {
	musicPlayerStore.next();
}

function toggleShuffle() {
	musicPlayerStore.toggleShuffle();
}

function toggleRepeat() {
	musicPlayerStore.toggleRepeat();
}

function playIndex(index: number) {
	musicPlayerStore.playIndex(index);
}

function setProgress(event: MouseEvent) {
	const progressElement = event.currentTarget as HTMLElement | null;
	if (!progressElement) {
		return;
	}
	const rect = progressElement.getBoundingClientRect();
	if (rect.width <= 0) return;
	const percent = (event.clientX - rect.left) / rect.width;
	musicPlayerStore.setProgress(percent);
}

function handleProgressKeyDown(event: KeyboardEvent) {
	const time = sliderKeyboardValue(
		event.key,
		state.currentTime,
		0,
		state.duration,
		5,
	);
	if (time !== null) {
		event.preventDefault();
		event.stopPropagation();
		musicPlayerStore.seek(time);
	}
}

function handleVolumeButtonClick() {
	musicPlayerStore.toggleMute();
}

function startVolumeDrag(event: PointerEvent) {
	const slider = event.currentTarget as HTMLElement | null;
	if (!slider) {
		return;
	}

	const updateVolume = (clientX: number) => {
		const rect = slider.getBoundingClientRect();
		if (rect.width <= 0) {
			return;
		}
		const percent = Math.max(
			0,
			Math.min(1, (clientX - rect.left) / rect.width),
		);
		musicPlayerStore.setVolume(percent);
	};

	updateVolume(event.clientX);

	const pointerId = event.pointerId;
	slider.setPointerCapture(pointerId);

	const handleMove = (moveEvent: PointerEvent) => {
		if (moveEvent.pointerId !== pointerId) {
			return;
		}
		updateVolume(moveEvent.clientX);
	};

	const cleanup = () => {
		slider.removeEventListener("pointermove", handleMove);
		slider.removeEventListener("pointerup", handleUp);
		slider.removeEventListener("pointercancel", handleCancel);
		if (slider.hasPointerCapture(pointerId)) {
			slider.releasePointerCapture(pointerId);
		}
	};

	const handleUp = (upEvent: PointerEvent) => {
		if (upEvent.pointerId !== pointerId) {
			return;
		}
		updateVolume(upEvent.clientX);
		cleanup();
	};

	const handleCancel = (cancelEvent: PointerEvent) => {
		if (cancelEvent.pointerId !== pointerId) {
			return;
		}
		cleanup();
	};

	slider.addEventListener("pointermove", handleMove);
	slider.addEventListener("pointerup", handleUp);
	slider.addEventListener("pointercancel", handleCancel);
}

function handleVolumeKeyDown(event: KeyboardEvent) {
	const volume = sliderKeyboardValue(
		event.key,
		state.isMuted ? 0 : state.volume,
		0,
		1,
		0.05,
	);
	if (volume !== null) {
		event.preventDefault();
		event.stopPropagation();
		musicPlayerStore.setVolume(volume);
	}
}

function togglePlaylist() {
	musicPlayerStore.togglePlaylist();
}

function toggleExpanded() {
	musicPlayerStore.toggleExpanded();
}

function toggleHidden() {
	musicPlayerStore.toggleHidden();
}

function hideError() {
	musicPlayerStore.hideError();
}

function retry() {
	musicPlayerStore.retry();
}

function volumeBarRef(_node: HTMLElement) {}

onMount(() => {
	unsubscribe = musicPlayerStore.subscribe((nextState) => {
		state = nextState;
	});
	musicPlayerStore.initialize();
	window.addEventListener("resize", schedulePlacement);
	window.addEventListener("scroll", schedulePlacement, {passive:true});
	document.addEventListener("keydown", handlePanelEscape);
	document.addEventListener("pointerdown", handleOutsidePointer);
	return () => {
		window.removeEventListener("resize", schedulePlacement);
		window.removeEventListener("scroll", schedulePlacement);
		document.removeEventListener("keydown", handlePanelEscape);
		document.removeEventListener("pointerdown", handleOutsidePointer);
		if (placementFrame) cancelAnimationFrame(placementFrame);
	};
});

onDestroy(() => {
	if (unsubscribe) {
		unsubscribe();
	}
	musicPlayerStore.destroy();
});
</script>

{#if shouldRenderFloatingUi}
	{#if state.showError}
		<div class="fixed bottom-20 right-4 z-60 max-w-sm">
			<div
				class="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up"
				role="alert"
			>
				<Icon
					icon="material-symbols:error"
					class="text-xl shrink-0"
				/>
				<span class="text-sm flex-1">{state.errorMessage}</span>
				<button
					type="button"
					aria-label="关闭音乐播放器错误提示"
					onclick={hideError}
					class="text-white/80 hover:text-white transition-colors"
				>
					<Icon icon="material-symbols:close" class="text-lg" />
				</button>
			</div>
		</div>
	{/if}

	{#if useFabEntry}
		{#if state.isExpanded}
			<div class="music-player-fab-anchor fixed z-55" style={`--music-panel-left:${panelPlacement.left}px;--music-panel-top:${panelPlacement.top}px;--music-panel-width:${panelPlacement.width}px;--music-panel-height:${panelPlacement.height}px;`}>
				<div
					class="music-player-fab-shell"
					use:positionPanel
					transition:fly={{
						y: 16,
						duration: 280,
						opacity: 0.12,
						easing: cubicOut,
					}}
				>
					<FabMusicPanel compact={panelPlacement.compact} frosted={panelPlacement.frosted} onClose={() => closeFloatingPlayer(true)} />
				</div>
			</div>
		{/if}
	{:else}
		<div
			class="music-player fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out"
			class:expanded={state.isExpanded}
			class:hidden-mode={state.isHidden}
		>
			<div
				class="orb-player-container {state.isHidden
					? 'orb-enter pointer-events-auto'
					: 'orb-leave pointer-events-none'}"
				inert={!state.isHidden}
				aria-hidden={!state.isHidden}
			>
				<CoverImage
					cover={state.currentSong.cover}
					isPlaying={state.isPlaying}
					isLoading={state.isLoading}
					size="orb"
					onclick={toggleHidden}
				/>
			</div>

			<MiniPlayer
				song={state.currentSong}
				currentTime={state.currentTime}
				duration={state.duration}
				isPlaying={state.isPlaying}
				isLoading={state.isLoading}
				isHidden={state.isExpanded || state.isHidden}
				errorMessage={state.errorMessage}
				onRetry={retry}
				onCoverClick={togglePlay}
				onInfoClick={toggleExpanded}
				onHideClick={toggleHidden}
				onExpandClick={toggleExpanded}
			/>

			<PlayerBar
				song={state.currentSong}
				currentTime={state.currentTime}
				duration={state.duration}
				isPlaying={state.isPlaying}
				isLoading={state.isLoading}
				isShuffled={state.isShuffled}
				isRepeating={state.isRepeating}
				showPlaylist={state.showPlaylist}
				canSkip={state.playlist.length > 1}
				volume={state.volume}
				isMuted={state.isMuted}
				isVolumeDragging={false}
				isHidden={!state.isExpanded}
				errorMessage={state.errorMessage}
				onRetry={retry}
				{volumeBarRef}
				onPlayClick={togglePlay}
				onPrevClick={prev}
				onNextClick={() => next()}
				onShuffleClick={toggleShuffle}
				onRepeatClick={toggleRepeat}
				onProgressClick={setProgress}
				onProgressKeyDown={handleProgressKeyDown}
				onVolumeButtonClick={handleVolumeButtonClick}
				onSliderPointerDown={startVolumeDrag}
				onSliderKeyDown={handleVolumeKeyDown}
				onHideClick={toggleHidden}
				onPlaylistClick={togglePlaylist}
				onCollapseClick={toggleExpanded}
			/>

			<Playlist
				playlist={state.playlist}
				currentIndex={state.currentIndex}
				isPlaying={state.isPlaying}
				show={state.showPlaylist}
				onClose={togglePlaylist}
				onPlaySong={playIndex}
			/>
		</div>
	{/if}

	<style>
		.music-player-fab-anchor {
			left: var(--music-panel-left) !important;
			top: var(--music-panel-top) !important;
			right: auto !important;
			bottom: auto !important;
			pointer-events: none;
		}

		.music-player-fab-shell {
			position: relative;
			right: auto !important;
			bottom: auto !important;
			max-height: calc(100dvh - var(--music-panel-top) - 16px);
			overflow-y: auto;
			transform-origin: bottom right;
			pointer-events: auto;
			will-change: transform;
		}

		.orb-player-container {
			position: absolute;
			bottom: 0;
			right: 0;
		}

		.orb-enter {
			animation: orbElasticIn 460ms cubic-bezier(0.22, 1.25, 0.36, 1)
				forwards;
		}

		.orb-leave {
			animation: orbElasticOut 360ms cubic-bezier(0.4, 0, 1, 1) forwards;
		}

		@keyframes orbElasticIn {
			0% {
				opacity: 0;
				transform: translateX(0) scale(0.55);
			}
			70% {
				opacity: 1;
				transform: translateX(0) scale(1.12);
			}
			100% {
				opacity: 1;
				transform: translateX(0) scale(1);
			}
		}

		@keyframes orbElasticOut {
			0% {
				opacity: 1;
				transform: translateX(0) scale(1);
			}
			100% {
				opacity: 0;
				transform: translateX(0) scale(0.6);
			}
		}

		.music-player.hidden-mode {
			width: 3rem;
			height: 3rem;
		}

		.music-player {
			width: 20rem;
			max-width: 20rem;
			min-width: 20rem;
			user-select: none;
		}

		:global(.mini-player) {
			position: absolute;
			bottom: 0;
			right: 0;
		}

		:global(.expanded-player) {
			position: absolute;
			bottom: 0;
			right: 0;
		}

		:global(.orb-player) {
			position: relative;
			backdrop-filter: blur(10px);
			-webkit-backdrop-filter: blur(10px);
		}

		:global(.orb-player::before) {
			content: "";
			position: absolute;
			inset: -0.125rem;
			background: linear-gradient(
				45deg,
				var(--primary),
				transparent,
				var(--primary)
			);
			border-radius: 50%;
			z-index: -1;
			opacity: 0;
			transition: opacity 0.3s ease;
		}

		:global(.orb-player:hover::before) {
			opacity: 0.3;
			animation: rotate 2s linear infinite;
		}

		:global(.orb-player .animate-pulse) {
			animation: musicWave 1.5s ease-in-out infinite;
		}

		@keyframes rotate {
			from {
				transform: rotate(0deg);
			}
			to {
				transform: rotate(360deg);
			}
		}

		@keyframes musicWave {
			0%,
			100% {
				transform: scaleY(0.5);
			}
			50% {
				transform: scaleY(1);
			}
		}

		:global(.animate-pulse) {
			animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
		}

		@keyframes pulse {
			0%,
			100% {
				opacity: 1;
			}
			50% {
				opacity: 0.5;
			}
		}

		:global(.progress-section div:hover),
		:global(.bottom-controls > div:hover) {
			transform: scaleY(1.2);
			transition: transform 0.2s ease;
		}

		@media (width < 768px) {
			.music-player {
				width: 280px !important;
				min-width: 280px !important;
				max-width: 280px !important;
				bottom: 0.5rem !important;
				right: 0.5rem !important;
			}
			:global(.mini-player) {
				width: 280px !important;
			}
			:global(.expanded-player) {
				width: 280px !important;
				max-width: 280px !important;
			}
			.music-player.expanded {
				width: 280px !important;
				min-width: 280px !important;
				max-width: 280px !important;
				right: 0.5rem !important;
			}
			:global(.playlist-panel) {
				width: 280px !important;
				right: 0.5rem !important;
				max-width: 280px !important;
			}
			:global(.controls) {
				gap: 8px;
			}
			:global(.controls button) {
				width: 36px;
				height: 36px;
			}
			:global(.controls button:nth-child(3)) {
				width: 44px;
				height: 44px;
			}
		}

		@media (width < 480px) {
			.music-player {
				width: 260px !important;
				min-width: 260px !important;
				max-width: 260px !important;
			}
			:global(.expanded-player) {
				width: 260px !important;
				max-width: 260px !important;
			}
			:global(.playlist-panel) {
				width: 260px !important;
				max-width: 260px !important;
				right: 0.5rem !important;
			}
			:global(.song-title) {
				font-size: 14px;
			}
			:global(.song-artist) {
				font-size: 12px;
			}
			:global(.controls) {
				gap: 6px;
				margin-bottom: 12px;
			}
			:global(.controls button) {
				width: 32px;
				height: 32px;
			}
			:global(.controls button:nth-child(3)) {
				width: 40px;
				height: 40px;
			}
			:global(.playlist-item) {
				padding: 8px 12px;
			}
			:global(.playlist-item .w-10) {
				width: 32px;
				height: 32px;
			}
		}

		@keyframes slide-up {
			from {
				transform: translateY(100%);
				opacity: 0;
			}
			to {
				transform: translateY(0);
				opacity: 1;
			}
		}

		.animate-slide-up {
			animation: slide-up 0.3s ease-out;
		}

		@media (hover: none) and (pointer: coarse) {
			:global(.music-player button),
			:global(.playlist-item) {
				min-height: 44px;
			}
			:global(.progress-section > div),
			:global(.bottom-controls > div:nth-child(2)) {
				height: 12px;
			}
		}

		@keyframes spin-continuous {
			from {
				transform: rotate(0deg);
			}
			to {
				transform: rotate(360deg);
			}
		}

		:global(.cover-container img) {
			animation: spin-continuous 3s linear infinite;
			animation-play-state: paused;
		}

		:global(.cover-container img.spinning) {
			animation-play-state: running;
		}

		:global(button.bg-\\[var\\(--primary\\)\\]) {
			box-shadow: 0 0 0 2px var(--primary);
			border: none;
		}
	</style>
{/if}
