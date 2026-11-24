const headingSelector = "h1, h2, h3, h4, h5, h6";

export function getPageTOCLabel(element: Element): string {
	const label = element.getAttribute("data-page-toc");
	if (label?.trim()) return label.trim();
	const clone = element.cloneNode(true) as Element;
	for (const decoration of clone.querySelectorAll(
		".anchor, .anchor-icon, [aria-hidden='true'], script, style",
	))
		decoration.remove();
	return (clone.textContent || "").replace(/\s+/g, " ").trim();
}

function isHidden(element: HTMLElement, scope: Element): boolean {
	for (
		let current: HTMLElement | null = element;
		current;
		current = current.parentElement
	) {
		if (
			current.hasAttribute("hidden") ||
			current.getAttribute("aria-hidden") === "true" ||
			current.hasAttribute("inert")
		)
			return true;
		const style = getComputedStyle(current);
		if (style.display === "none" || style.visibility === "hidden") return true;
		if (current === scope) break;
	}
	return false;
}

/** Article headings first; otherwise use current-page sections and card titles. */
export function getPageTOCElements(
	scope = document.querySelector<HTMLElement>("#content-wrapper"),
): HTMLElement[] {
	if (!scope) return [];
	const articleHeadings = Array.from(
		scope.querySelectorAll<HTMLElement>(`.custom-md :is(${headingSelector})`),
	).filter(
		(element) => !!getPageTOCLabel(element) && !isHidden(element, scope),
	);
	const candidates = articleHeadings.length
		? articleHeadings
		: Array.from(
				scope.querySelectorAll<HTMLElement>(
					`[data-page-toc], ${headingSelector}`,
				),
			).filter((element) => {
				const parentCard = element.parentElement?.closest("[data-page-toc]");
				return (
					!parentCard && !!getPageTOCLabel(element) && !isHidden(element, scope)
				);
			});
	const seen = new Set<string>();
	return candidates.filter((element, index) => {
		if (!element.id) {
			let id = `page-toc-${index + 1}`;
			let suffix = 1;
			while (scope.querySelector(`[id="${id}"]`))
				id = `page-toc-${index + 1}-${suffix++}`;
			element.id = id;
		}
		if (seen.has(element.id)) return false;
		seen.add(element.id);
		return true;
	});
}

/** Track directory content and node identity, not unrelated article updates. */
export function capturePageTOC(
	scope = document.querySelector<HTMLElement>("#content-wrapper"),
) {
	return getPageTOCElements(scope).map((element) => ({
		element,
		id: element.id,
		label: getPageTOCLabel(element),
		tagName: element.tagName,
	}));
}

export function isSamePageTOC(
	previous: ReturnType<typeof capturePageTOC>,
	current: ReturnType<typeof capturePageTOC>,
): boolean {
	return (
		previous.length === current.length &&
		previous.every((entry, index) => {
			const next = current[index];
			return (
				entry.element === next.element &&
				entry.id === next.id &&
				entry.label === next.label &&
				entry.tagName === next.tagName
			);
		})
	);
}
