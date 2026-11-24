<script lang="ts">
import Icon from "@components/common/LocalIcon.svelte";

interface Props {
	volume: number;
	isMuted: boolean;
	onclick: () => void;
}

const { volume, isMuted, onclick }: Props = $props();
</script>

<button type="button" class="btn-plain w-8 h-8 rounded-lg" {onclick}
	aria-label={isMuted || volume === 0 ? "取消静音" : "静音"}
	aria-pressed={isMuted || volume === 0}>
	{#if isMuted || volume === 0}
		<Icon icon="material-symbols:volume-off" class="text-lg" />
	{:else if volume < 0.5}
		<Icon icon="material-symbols:volume-down" class="text-lg" />
	{:else}
		<Icon icon="material-symbols:volume-up" class="text-lg" />
	{/if}
</button>
