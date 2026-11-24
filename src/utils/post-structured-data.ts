/** Only associate the profile URL with the profile's own author identity. */
export function getStructuredAuthor(
	author: string | undefined,
	profileName: string,
	site: URL | string | undefined,
) {
	const name = author || profileName;
	return {
		"@type": "Person",
		name,
		...(name === profileName && site ? { url: String(site) } : {}),
	};
}

/** JSON escaping does not escape HTML script end tags; encode their delimiter. */
export function serializeJsonLd(value: unknown): string {
	return JSON.stringify(value).replace(/</g, "\\u003c");
}
