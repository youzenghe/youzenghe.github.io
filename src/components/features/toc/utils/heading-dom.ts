import type { HeadingData } from "../types/toc";

const headingSelector = "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]";

export function getHeadingText(heading: Element): string {
	const content = heading.cloneNode(true) as Element;
	for (const decoration of content.querySelectorAll(
		".anchor, .anchor-icon, [aria-hidden='true']",
	)) {
		decoration.remove();
	}
	return (content.textContent || "").replace(/\s+/g, " ").trim();
}

export function getContentHeadingElements(
	containerSelector?: string,
): HTMLElement[] {
	const container = containerSelector
		? document.querySelector(containerSelector)
		: document.querySelector("#post-container") ||
			document.querySelector(
				"main .custom-md, main .markdown-content, main .prose",
			);
	if (!container) return [];
	const seen = new Set<string>();
	return Array.from(
		container.querySelectorAll<HTMLElement>(headingSelector),
	).filter((heading) => {
		if (!heading.id || seen.has(heading.id) || !getHeadingText(heading))
			return false;
		seen.add(heading.id);
		return true;
	});
}

export function headingData(heading: HTMLElement): HeadingData {
	return {
		id: heading.id,
		text: getHeadingText(heading),
		level: Number.parseInt(heading.tagName[1], 10),
	};
}

export function escapeTOCText(text: string): string {
	return text.replace(
		/[&<>"']/g,
		(character) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;",
			})[character] || character,
	);
}
