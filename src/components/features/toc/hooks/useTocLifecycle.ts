interface TOCSwup {
	hooks: {
		on(
			name: string,
			callback: () => void,
			options?: { before?: boolean },
		): unknown;
		off(name: string, callback: () => void): unknown;
	};
}

export function registerTOCPageLifecycle(
	refresh: () => void,
	cleanup: () => void,
	delay = 100,
): () => void {
	let timer: ReturnType<typeof setTimeout> | undefined;
	let swup: TOCSwup | undefined;
	let disposed = false;
	const cancel = () => {
		clearTimeout(timer);
		timer = undefined;
	};
	const schedule = () => {
		cancel();
		if (!disposed)
			timer = setTimeout(() => {
				timer = undefined;
				if (!disposed) refresh();
			}, delay);
	};
	const beforeReplace = () => {
		cancel();
		cleanup();
	};
	const detach = () => {
		swup?.hooks.off("page:view", schedule);
		swup?.hooks.off("content:replace", beforeReplace);
	};
	const attach = () => {
		const current = (window as unknown as { swup?: TOCSwup }).swup;
		if (current === swup) return;
		detach();
		swup = current;
		swup?.hooks.on("page:view", schedule);
		swup?.hooks.on("content:replace", beforeReplace, { before: true });
	};
	const enable = () => {
		attach();
		schedule();
	};
	document.addEventListener("swup:enable", enable);
	document.addEventListener("astro:page-load", schedule);
	document.addEventListener("astro:before-swap", beforeReplace);
	window.addEventListener("popstate", schedule);
	attach();
	schedule();
	return () => {
		disposed = true;
		cancel();
		detach();
		document.removeEventListener("swup:enable", enable);
		document.removeEventListener("astro:page-load", schedule);
		document.removeEventListener("astro:before-swap", beforeReplace);
		window.removeEventListener("popstate", schedule);
		cleanup();
	};
}
