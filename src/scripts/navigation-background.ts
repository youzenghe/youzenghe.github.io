import pools from "../data/background-pool.json";
import {BackgroundRotation, backgroundDevice, type BackgroundDevice} from "../utils/navigation-background";

let initialized = false;

function loadBackground(url: string, signal: AbortSignal): Promise<void> {
	return new Promise((resolve,reject) => {
		const image = new Image();
		let complete = false;
		const finish = (error?: Error) => {
			if (complete) return;
			complete = true;
			clearTimeout(timer);
			signal.removeEventListener("abort",cancel);
			image.onload = image.onerror = null;
			if (error) { image.src = ""; reject(error); } else resolve();
		};
		const cancel = () => finish(new DOMException("Background load cancelled","AbortError"));
		const timer = setTimeout(() => finish(new Error("Background load timed out")),15_000);
		image.decoding = "async";
		image.onload = () => { image.decode().then(() => finish(),() => finish()); };
		image.onerror = () => finish(new Error("Background image unavailable"));
		signal.addEventListener("abort",cancel,{once:true});
		if (signal.aborted) cancel(); else image.src = url;
	});
}

export function initializeNavigationBackground() {
	if (initialized) return;
	initialized = true;
	const storageKey = (device: BackgroundDevice) => `navigation-background-${device}`;
	const history: Partial<Record<BackgroundDevice,string>> = {};
	for (const device of ["desktop","mobile"] as const) {
		try { history[device] = sessionStorage.getItem(storageKey(device)) ?? undefined; } catch { /* Storage is optional. */ }
	}
	const rotation = new BackgroundRotation(pools,loadBackground,(url,device) => {
		(window as unknown as { __navigationBackground: { url: string; device: BackgroundDevice } }).__navigationBackground = { url, device };
		for (const element of document.querySelectorAll<HTMLPictureElement>("[data-navigation-background]")) {
			const source = element.querySelector("source");
			const image = element.querySelector("img");
			if (!image) continue;
			if (source) source.srcset = url;
			image.src = url;
			element.dataset.backgroundUrl = url;
			element.dataset.backgroundDevice = device;
		}
		try { sessionStorage.setItem(storageKey(device),url); } catch { /* Storage is optional. */ }
		window.dispatchEvent(new CustomEvent("navigation-background:change",{detail:{url,device}}));
	},history);
	const seed = (window as unknown as { __navigationBackground?: { url: string; device: BackgroundDevice } }).__navigationBackground;
	if (seed) rotation.adopt(seed.url, seed.device);
	const media = window.matchMedia("(max-width: 768px)");
	const device = () => backgroundDevice(media.matches ? 768 : 769);
	const change = () => { void rotation.rotate(device()); };
	let active = false;
	let initialLoad: AbortController | undefined;
	let boundSwup: typeof window.swup | undefined;
	const bindSwup = () => {
		if (!active || !window.swup || boundSwup === window.swup) return;
		boundSwup?.hooks.off("page:view",change);
		boundSwup = window.swup;
		boundSwup.hooks.on("page:view",change);
	};
	const samePageNavigation = (event: MouseEvent) => {
		if (event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
		const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("#navbar a[href], [data-control-key='home'] a[href]");
		if (!link || link.target==="_blank" || link.hasAttribute("download")) return;
		const target = new URL(link.href,location.href);
		if (target.origin===location.origin && target.pathname===location.pathname && target.search===location.search && !target.hash) change();
	};
	const start = () => {
		if (active) return;
		active = true;
		document.addEventListener("click",samePageNavigation,true);
		document.addEventListener("swup:enable",bindSwup);
		media.addEventListener("change",change);
		bindSwup();
		if (!rotation.current || rotation.current.device !== device()) change();
		else {
			const selection = rotation.current;
			initialLoad = new AbortController();
			void loadBackground(selection.url, initialLoad.signal).catch(() => {
				if (active && rotation.current === selection) change();
			});
		}
	};
	const stop = () => {
		active = false;
		initialLoad?.abort();
		rotation.invalidate();
		document.removeEventListener("click",samePageNavigation,true);
		document.removeEventListener("swup:enable",bindSwup);
		media.removeEventListener("change",change);
		boundSwup?.hooks.off("page:view",change);
		boundSwup = undefined;
	};
	window.addEventListener("pagehide",stop);
	window.addEventListener("pageshow",start);
	start();
}
