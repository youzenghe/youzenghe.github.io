import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const sourceUrl = (path) => new URL(`../${path}`, import.meta.url);
const read = (path) => fs.readFileSync(sourceUrl(path), "utf8");

function astroPages(directory = sourceUrl("src/pages/")) {
	return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = new URL(entry.name, directory);
		if (entry.isDirectory()) {
			return astroPages(new URL(`${entry.name}/`, directory));
		}
		return entry.name.endsWith(".astro") ? [path] : [];
	});
}

test("comment integration sources and configuration are removed", () => {
	assert.equal(fs.existsSync(sourceUrl("src/components/comment/")), false);
	assert.equal(fs.existsSync(sourceUrl("src/config/commentConfig.ts")), false);
});

test("pages have no comment integration imports or rendered comment widgets", () => {
	for (const path of astroPages()) {
		const source = fs.readFileSync(path, "utf8");
		assert.doesNotMatch(
			source,
			/\bimport\b[^;]*["'][^"']*components\/comment(?:\/|["'])|<(?:Comment|CommentIndex|Twikoo|Giscus)\b/,
			path.pathname,
		);
	}
});

test("the analytics script integration is removed rather than disabled", () => {
	assert.equal(
		fs.existsSync(sourceUrl("src/layouts/partials/AnalyticsScripts.astro")),
		false,
	);
});

test("the profile preserves author content without remote visitor UI or loaders", () => {
	const source = read("src/components/widgets/profile/Profile.astro");
	assert.doesNotMatch(
		source,
		/umami|oddmisc|site-stats-display|profileStats|fetchSiteStats|__siteStatsFetching/,
	);
	for (const field of ["avatar", "name", "bio", "links", "typewriter"]) {
		assert.ok(source.includes(`profileConfig.${field}`), field);
	}
	assert.match(source, /<TypewriterText\b/);
	assert.match(source, /href=\{url\("\/about\/"\)\}/);
});

test("post metadata retains static metadata without live visitor counters", () => {
	const source = read("src/components/features/posts/PostMeta.astro");
	assert.doesNotMatch(
		source,
		/umami|oddmisc|page-views-display|pageViewsLoading|fetchPageViews|generateStatsText/,
	);
	for (const component of [
		"PublishedDate",
		"Category",
		"WordCount",
		"ReadingTime",
		"EncryptedBadge",
	]) {
		assert.match(source, new RegExp(`<${component}\\b`));
	}
	assert.match(source, /getTagUrl\(tag\)/);
});

test("navigation retains about pages without analytics or service monitoring", () => {
	const source = read("src/config/navBarConfig.ts");
	assert.doesNotMatch(source, /umami|uptimerobot|访问统计|状态监控/);
	for (const path of ["/about/", "/about-me/"]) {
		assert.ok(source.includes(`"${path}"`), path);
	}
});

test("the site-statistics widget still derives static content counts", () => {
	const source = read("src/components/widgets/site-stats/SiteStats.astro");
	assert.match(source, /value:\s*posts\.length/);
	assert.match(source, /value:\s*categories\.length/);
	assert.match(source, /value:\s*tags\.length/);
	assert.match(source, /value:\s*totalWords/);
	assert.doesNotMatch(source, /umami|oddmisc|getSiteStats/);
});
