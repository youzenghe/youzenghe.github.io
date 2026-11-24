export function getFeedAuthor(
	data: { author?: string },
	fallback: string,
): string {
	return data.author || fallback;
}

export function escapeXmlText(value: string): string {
	return value.replace(
		/[&<>"']/g,
		(character) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&apos;",
			})[character] ?? character,
	);
}
