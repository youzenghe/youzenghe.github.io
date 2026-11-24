<script lang="ts">
import OfflineIcon from "@iconify/svelte/dist/OfflineIcon.svelte";
import type { ComponentProps } from "svelte";
import { resolveLocalIcon } from "../../utils/local-icons";

type Props = ComponentProps<typeof OfflineIcon>;
let { icon, ...props }: Props = $props();
const localIcon = $derived(resolveLocalIcon(icon));
</script>

<OfflineIcon {...props} icon={localIcon} />
