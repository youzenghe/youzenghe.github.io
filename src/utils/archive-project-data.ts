export interface ArchiveEntry {
	id: string;
	url?: string;
	data: {
		title: string;
		published: Date;
		tags: string[];
		category?: string;
		alias?: string;
		permalink?: string;
	};
}

export function mergeArchiveEntries(
	articles: ArchiveEntry[],
	projects: ArchiveEntry[],
): ArchiveEntry[] {
	return [...articles, ...projects].sort(
		(a, b) =>
			b.data.published.getTime() - a.data.published.getTime() ||
			a.id.localeCompare(b.id),
	);
}

export function mergeArchiveCategories(
	categories: { name: string; count: number; url: string }[],
	projects: { data: { category: string } }[],
	categoryUrl: (name: string) => string,
) {
	const counts = new Map(
		categories.map((category) => [category.name, { ...category }]),
	);
	for (const project of projects) {
		const name = project.data.category;
		const category = counts.get(name) ?? {
			name,
			count: 0,
			url: categoryUrl(name),
		};
		category.count++;
		counts.set(name, category);
	}
	return [...counts.values()].sort((a, b) =>
		a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
	);
}
