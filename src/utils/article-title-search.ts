interface SearchHit {
	url: string;
	meta: { title: string };
	excerpt: string;
}

/** Full-text segmentation must not make literal article titles unsearchable. */
export function mergeArticleTitleMatches(
	query: string,
	posts: { slug: string; title: string }[],
	hits: SearchHit[],
	resolveUrl: (path: string) => string,
): SearchHit[] {
	const normalized = query.trim().toLocaleLowerCase();
	if (!normalized) return hits;
	const matches = posts.filter((post) =>
		post.title.toLocaleLowerCase().includes(normalized),
	);
	const seen = new Set<string>();
	const results: SearchHit[] = [];
	for (const post of matches) {
		const url = resolveUrl(`/posts/${post.slug}/`);
		const found = hits.find((hit) => hit.url === url);
		const excerpt = post.title.replace(
			/[&<>"']/g,
			(char) =>
				({
					"&": "&amp;",
					"<": "&lt;",
					">": "&gt;",
					'"': "&quot;",
					"'": "&#39;",
				})[char] ?? char,
		);
		results.push(found ?? { url, meta: { title: post.title }, excerpt });
		seen.add(url);
	}
	for (const hit of hits) {
		if (!seen.has(hit.url)) results.push(hit);
		seen.add(hit.url);
	}
	return results;
}
