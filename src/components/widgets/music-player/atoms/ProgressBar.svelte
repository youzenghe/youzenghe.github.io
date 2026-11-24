<script lang="ts">
import Key from "../../../../i18n/i18nKey";
import { i18n } from "../../../../i18n/translation";

interface Props {
	currentTime: number;
	duration: number;
	onclick: (event: MouseEvent) => void;
	onkeydown: (event: KeyboardEvent) => void;
}

const { currentTime, duration, onclick, onkeydown }: Props = $props();
const available = $derived(Number.isFinite(duration) && duration > 0);
const progress = $derived(
	available ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0,
);
</script>

<div
	class="progress-bar flex-1 h-2 bg-(--btn-regular-bg) rounded-full cursor-pointer"
	onclick={(event) => { if (available) onclick(event); }}
	onkeydown={(event) => { if (available) onkeydown(event); }}
	role="slider"
	tabindex={available ? 0 : -1}
	aria-disabled={!available}
	aria-label={i18n(Key.musicPlayerProgress)}
	aria-valuemin="0"
	aria-valuemax="100"
	aria-valuenow={progress}
>
	<div
		class="h-full bg-(--primary) rounded-full transition-all duration-100"
		style="width: {progress}%"
	></div>
</div>
