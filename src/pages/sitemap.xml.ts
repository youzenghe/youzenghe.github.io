import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
	const location = new URL("sitemap-0.xml", site).href;
	const escaped = location.replace(/&/g, "&amp;").replace(/</g, "&lt;");
	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${escaped}</loc></sitemap></sitemapindex>\n`,
		{ headers: { "Content-Type": "application/xml; charset=utf-8" } },
	);
};
