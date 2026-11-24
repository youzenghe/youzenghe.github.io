<script lang="ts">
import TrackDisplay from "../molecules/TrackDisplay.svelte";
import PlayerStatus from "../PlayerStatus.svelte";
import type { Song } from "../types";

interface Props {
	song: Song;
	currentTime: number;
	duration: number;
	isPlaying: boolean;
	isLoading: boolean;
	isHidden: boolean;
	errorMessage: string;
	onRetry: () => void;
	onCoverClick: () => void;
	onInfoClick: () => void;
	onHideClick: () => void;
	onExpandClick: () => void;
}

const {
	song,
	currentTime,
	duration,
	isPlaying,
	isLoading,
	isHidden,
	errorMessage,
	onRetry,
	onCoverClick,
	onInfoClick,
	onHideClick,
	onExpandClick,
}: Props = $props();
</script>

<div
	class="mini-player card-base shadow-xl rounded-2xl p-3 absolute bottom-0 right-0 w-70"
	class:mini-enter={!isHidden}
	class:mini-leave={isHidden}
	class:pointer-events-none={isHidden}
	inert={isHidden}
	aria-hidden={isHidden}
>
	<TrackDisplay
		{song}
		{currentTime}
		{duration}
		{isPlaying}
		{isLoading}
		size="mini"
		{onCoverClick}
		{onInfoClick}
		{onHideClick}
		{onExpandClick}
	/>
	<PlayerStatus {isLoading} {errorMessage} {onRetry} />
</div>

<style>
	.mini-enter {
		animation: miniElasticIn 520ms cubic-bezier(0.22, 1.18, 0.36, 1)
			forwards;
	}

	.mini-leave {
		animation: miniElasticOut 320ms cubic-bezier(0.4, 0, 1, 1) forwards;
	}

	@keyframes miniElasticIn {
		0% {
			opacity: 0;
			transform: translateX(0) scale(0.82);
		}
		65% {
			opacity: 1;
			transform: translateX(0) scale(1.04);
		}
		100% {
			opacity: 1;
			transform: translateX(0) scale(1);
		}
	}

	@keyframes miniElasticOut {
		0% {
			opacity: 1;
			transform: translateX(0) scale(1);
		}
		100% {
			opacity: 0;
			transform: translateX(0) scale(0.86);
		}
	}
</style>
