<script lang="ts">
import Key from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

interface Props {
	isLoading: boolean;
	errorMessage: string;
	onRetry: () => void;
}

const { isLoading, errorMessage, onRetry }: Props = $props();
</script>

<div class="player-status text-xs text-(--content-meta)" role="status">
	{#if isLoading}
		{i18n(Key.musicPlayerLoading)}
	{:else if errorMessage}
		<span>{errorMessage}</span>
		<button type="button" class="btn-plain rounded-lg px-2" onclick={onRetry}>重试</button>
	{/if}
</div>

<style>
	.player-status:not(:empty) {
		margin-block: 0.5rem;
	}
</style>
