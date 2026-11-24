const instanceCounts = new WeakMap<object, Map<string, number>>();

/** A request-local sequence keeps repeated sidebar/drawer IDs deterministic. */
export function getWidgetContentId(request: object, kind: string): string {
	let counts = instanceCounts.get(request);
	if (!counts) {
		counts = new Map();
		instanceCounts.set(request, counts);
	}
	const count = (counts.get(kind) ?? 0) + 1;
	counts.set(kind, count);
	return `${kind}-${count}`;
}
