const publicPages = new Set([
	"/",
	"/blog/",
	"/archive/",
	"/about/",
	"/about-me/",
	"/albums/",
	"/friends/",
	"/games/",
]);

/** Only publish canonical, active content in the sitemap. */
export function isIndexablePage(page) {
	const url = new URL(page);
	if (url.search || url.hash) return false;
	return (
		publicPages.has(url.pathname) ||
		/^\/(?:blog|albums)\/(?:[2-9]|[1-9]\d+)\/$/.test(url.pathname) ||
		/^\/posts\/[^/]+\/$/.test(url.pathname) ||
		/^\/archive\/projects\/[^/]+\/$/.test(url.pathname)
	);
}

export function buildRobots(site) {
	return [
		"User-agent: *",
		"Allow: /",
		"Disallow: /api/",
		"Disallow: /services/",
		"Disallow: /games/chat.html",
		"Disallow: /pio/",
		"Disallow: /404.html",
		"",
		`Sitemap: ${new URL("sitemap-index.xml", site).href}`,
		"",
	].join("\n");
}
