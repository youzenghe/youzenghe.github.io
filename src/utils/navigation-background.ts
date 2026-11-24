export type BackgroundDevice = "desktop" | "mobile";

export function backgroundDevice(width: number): BackgroundDevice {
	return width <= 768 ? "mobile" : "desktop";
}

export function normalizeBackgroundPool(values: string[]): string[] {
	return [
		...new Set(
			values.filter((value) => /^\/(?!\/)[^\\\s?#]+\.webp$/i.test(value)),
		),
	];
}

export function pickBackground(
	pool: string[],
	previous: string | null,
	random = Math.random,
): string | null {
	const candidates =
		pool.length > 1 ? pool.filter((value) => value !== previous) : pool;
	if (!candidates.length) return null;
	return candidates[
		Math.min(
			candidates.length - 1,
			Math.max(0, Math.floor(random() * candidates.length)),
		)
	];
}

export class BackgroundRotation {
	private revision = 0;
	private abort: AbortController | null = null;
	private selected: { url: string; device: BackgroundDevice } | null = null;

	constructor(
		private pools: Record<BackgroundDevice, string[]>,
		private load: (url: string, signal: AbortSignal) => Promise<void>,
		private apply: (url: string, device: BackgroundDevice) => void,
		private history: Partial<Record<BackgroundDevice, string>> = {},
		private random = Math.random,
	) {}

	get current() {
		return this.selected;
	}

	invalidate() {
		this.revision++;
		this.abort?.abort();
		this.abort = null;
	}

	async rotate(device: BackgroundDevice): Promise<boolean> {
		this.invalidate();
		const revision = this.revision;
		const abort = (this.abort = new AbortController());
		let available = normalizeBackgroundPool(this.pools[device]);
		const previous =
			this.selected?.device === device
				? this.selected.url
				: (this.history[device] ?? null);
		if (available.length > 1)
			available = available.filter((url) => url !== previous);
		for (let attempt = 0; attempt < 3; attempt++) {
			const url = pickBackground(available, null, this.random);
			if (!url) return false;
			try {
				await this.load(url, abort.signal);
				if (revision !== this.revision || abort.signal.aborted) return false;
				this.selected = { url, device };
				this.history[device] = url;
				this.apply(url, device);
				return true;
			} catch {
				if (revision !== this.revision || abort.signal.aborted) return false;
				available = available.filter((value) => value !== url);
			}
		}
		return false;
	}
}
