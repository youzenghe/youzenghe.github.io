import type { IconifyIcon } from "@iconify/svelte/dist/OfflineIcon.svelte";
import { selectedIconData } from "./local-icon-data";

/** A neutral local glyph for names absent from the selected icon set. */
export const fallbackLocalIcon: IconifyIcon = {
	width: 24,
	height: 24,
	body: '<g fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4"/></g><circle cx="12" cy="16.5" r="1" fill="currentColor"/>',
};

const icons: Readonly<Record<string, IconifyIcon>> = selectedIconData;
export const localIconNames = Object.keys(icons);

export function hasLocalIcon(name: string): boolean {
	return Object.hasOwn(icons, name);
}

/** Aliases in the selected data have already been resolved to complete SVGs. */
export function resolveLocalIcon(icon: string | IconifyIcon): IconifyIcon {
	if (
		typeof icon === "object" &&
		icon !== null &&
		typeof icon.body === "string"
	) {
		return icon;
	}
	return typeof icon === "string" && hasLocalIcon(icon)
		? icons[icon]
		: fallbackLocalIcon;
}
