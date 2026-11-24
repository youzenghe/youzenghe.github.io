// Compatibility API for legacy page callers. Icons are already bundled locally.
import { generateIcon } from "@iconify/svelte/dist/offline-functions";
import { hasLocalIcon, resolveLocalIcon } from "./local-icons";

interface IconifyLoadOptions {
	timeout?: number;
	retryCount?: number;
	retryDelay?: number;
}

let isLoaded = false;
const callbacks = new Set<() => void>();

/** Render legacy custom elements from local data, never from an icon service. */
function registerLocalIconElement(): void {
	if (
		typeof window === "undefined" ||
		!window.customElements ||
		window.customElements.get("iconify-icon")
	)
		return;
	class LocalIconElement extends HTMLElement {
		static observedAttributes = ["icon"];
		connectedCallback(): void {
			this.render();
		}
		attributeChangedCallback(): void {
			this.render();
		}
		private render(): void {
			const name = this.getAttribute("icon") || "";
			const data = generateIcon({
				icon: resolveLocalIcon(name),
				width: "1em",
				height: "1em",
			});
			if (!data?.svg) return;
			const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			for (const [name, value] of Object.entries(data.attributes))
				svg.setAttribute(name, String(value));
			svg.setAttribute("aria-hidden", "true");
			svg.setAttribute("focusable", "false");
			// SVG bodies come only from the selected, bundled icon data.
			svg.innerHTML = data.body;
			this.setAttribute("data-icon-fallback", String(!hasLocalIcon(name)));
			this.replaceChildren(svg);
		}
	}
	window.customElements.define("iconify-icon", LocalIconElement);
}

export async function loadIconify(
	_options: IconifyLoadOptions = {},
): Promise<void> {
	registerLocalIconElement();
	isLoaded = true;
	for (const callback of callbacks) {
		try {
			callback();
		} catch (error) {
			console.error("Local icon callback failed:", error);
		}
	}
	callbacks.clear();
}

export async function preloadIcons(icons: string[]): Promise<void> {
	await loadIconify();
	for (const name of icons) resolveLocalIcon(name);
}

export function onIconsReady(callback: () => void): () => void {
	if (isLoaded) callback();
	else callbacks.add(callback);
	return () => callbacks.delete(callback);
}

export const iconLoader = {
	loadIconify,
	preloadIcons,
	onLoad: onIconsReady,
	offLoad: (callback: () => void) => callbacks.delete(callback),
	getLoadState: () => ({ isLoaded, isLoading: false }),
};
