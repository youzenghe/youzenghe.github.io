import { getCollection, type CollectionEntry } from "astro:content";
import { url } from "./url-utils";
import type { ArchiveEntry } from "./archive-project-data";

export function archivedProjectUrl(
	project: Pick<CollectionEntry<"archivedProjects">, "id">,
): string {
	return url(`/archive/projects/${encodeURIComponent(project.id)}/`);
}

export async function getArchivedProjects() {
	return (await getCollection("archivedProjects")).sort(
		(a, b) =>
			b.data.published.getTime() - a.data.published.getTime() ||
			a.id.localeCompare(b.id),
	);
}

export function archivedProjectEntry(
	project: CollectionEntry<"archivedProjects">,
): ArchiveEntry {
	return {
		id: `archived-projects/${project.id}`,
		url: archivedProjectUrl(project),
		data: {
			title: project.data.title,
			published: project.data.published,
			category: project.data.category,
			tags: [],
		},
	};
}
