/**
 * A stale completion must not update UI after a new query, dismissal or teardown.
 * @template T
 * @param {(query: string) => Promise<T>} search
 */
export function createLatestSearch(search) {
	let revision = 0;
	return {
		invalidate() {
			revision += 1;
		},
		async run(query) {
			const current = ++revision;
			try {
				const results = await search(query);
				return current === revision ? results : null;
			} catch (error) {
				if (current !== revision) return null;
				throw error;
			}
		},
	};
}

/**
 * Keep one import/initialization in flight, but allow retry after an index error.
 * @template {{ options: (options: { excerptLength: number }) => Promise<unknown> }} T
 * @param {string} base
 * @param {(path: string) => Promise<T>} importEngine
 */
export function createPagefindLoader(base, importEngine) {
	/** @type {Promise<T> | undefined} */
	let pending;
	return () => {
		if (!pending) {
			pending = (async () => {
				const engine = await importEngine(
					`${base.replace(/\/?$/, "/")}pagefind/pagefind.js`,
				);
				await engine.options({ excerptLength: 20 });
				return engine;
			})().catch((error) => {
				pending = undefined;
				throw error;
			});
		}
		return pending;
	};
}
