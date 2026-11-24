export const legacyRoutes = {
	post: {
		fallback: "/archive/",
		ids: {
			1: "/posts/robot-ai-contest/",
			2: "/posts/software-copyrights/",
			5: "/posts/software-adoption/",
			6: "/posts/shen-ben-wu-xiang/",
			7: "/posts/qiaoweng-galgame/",
			8: "/posts/last-contest/",
		},
	},
	learning: {
		fallback: "/archive/",
		ids: { 24: "/posts/muyuan-java-interview/" },
	},
	project: { fallback: "/archive/?category=项目", ids: {} },
	archive: { fallback: "/archive/" },
	tags: { fallback: "/archive/" },
	categories: { fallback: "/archive/" },
	games: { fallback: "/games/" },
	links: { fallback: "/friends/" },
	acg: { fallback: "/games/" },
	moments: { fallback: "/404.html" },
	changelog: { fallback: "/404.html" },
};

/** Static compatibility navigation; never follow a URL supplied by the caller. */
export function resolveLegacyDestination(kind, search = "", hash = "") {
	if (!Object.hasOwn(legacyRoutes, kind)) return "/404.html";
	const route = legacyRoutes[kind];
	const query = new URLSearchParams(search);
	const ids = query.getAll("id");
	let destination = route.fallback;
	if (route.ids && ids.length) {
		if (ids.length !== 1 || !Object.hasOwn(route.ids, ids[0]))
			return "/404.html";
		destination = route.ids[ids[0]];
	}
	if (destination === "/404.html") return destination;
	query.delete("id");
	const target = new URL(destination, "https://compatibility.invalid");
	for (const [key, value] of query) target.searchParams.append(key, value);
	target.hash = hash;
	return target.pathname + target.search + target.hash;
}
