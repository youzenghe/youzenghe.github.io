/// <reference types="mdast" />
import { h } from "hastscript";
import snapshots from "../data/repository-snapshots.json" with { type: "json" };

const countFormatter = new Intl.NumberFormat("en-US", {
	notation: "compact",
	maximumFractionDigits: 1,
});

function formatCount(value) {
	return Number.isSafeInteger(value) && value >= 0
		? countFormatter.format(value).replaceAll("\u202f", "")
		: null;
}

/** Render repository metadata recorded at build time, without browser requests. */
export function GithubCardComponent(properties, children) {
	if (Array.isArray(children) && children.length !== 0) {
		return h("div", { class: "hidden" }, [
			'Invalid directive. ("github" directive must be leaf type "::github{repo="owner/repo"}")',
		]);
	}
	const repo = properties?.repo;
	if (
		typeof repo !== "string" ||
		!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?\/[a-zA-Z0-9._-]{1,100}$/.test(
			repo,
		) ||
		[".", ".."].includes(repo.split("/")[1])
	) {
		return h(
			"div",
			{ class: "hidden" },
			'Invalid repository. Use "owner/repo".',
		);
	}
	const compact = properties?.compact === "true";
	const snapshot = !compact && Object.hasOwn(snapshots.repositories, repo.toLowerCase())
		? snapshots.repositories[repo.toLowerCase()]
		: null;
	const displayRepo = snapshot?.fullName || repo;
	const [owner, name] = displayRepo.split("/");
	const date = snapshot?.observedAt?.slice(0, 10);
	const description = snapshot?.description?.replace(/:[a-zA-Z0-9_]+:/g, "").trim();
	const stars = formatCount(snapshot?.stars);
	const forks = formatCount(snapshot?.forks);
	const metrics = [
		...(stars !== null ? [h("div", {class:"gc-stars",title:`Stars: ${snapshot.stars}`},stars)] : []),
		...(forks !== null ? [h("div", {class:"gc-forks",title:`Forks: ${snapshot.forks}`},forks)] : []),
		...(snapshot?.license?.trim() ? [h("div",{class:"gc-license",title:"Recorded license"},snapshot.license)] : []),
		...(snapshot?.language?.trim() ? [h("span",{class:"gc-language"},snapshot.language)] : []),
	];

	return h(
		"a",
		{
			class: "card-github no-styling",
			href: `https://github.com/${displayRepo}`,
			target: "_blank",
			rel: "noopener noreferrer",
			repo: displayRepo,
		},
		[
			h("div", { class: "gc-titlebar" }, [
				h(
					"div",
					{ class: "gc-titlebar-left", style: "min-width:0;flex-wrap:wrap" },
					[
						h("div", { class: "gc-owner" }, [
							h(
								"div",
								{
									class: "gc-avatar",
									ariaHidden: "true",
									title: "Owner initial",
									style:
										"display:flex;align-items:center;justify-content:center;color:var(--card-bg);font-size:.75rem",
								},
								owner[0].toUpperCase(),
							),
							h("div", { class: "gc-user" }, owner),
						]),
						h("div", { class: "gc-divider" }, "/"),
						h(
							"div",
							{ class: "gc-repo", style: "overflow-wrap:anywhere;min-width:0" },
							name,
						),
					],
				),
				h("div", { class: "github-logo", ariaHidden: "true" }),
			]),
			...(description ? [h("div", { class: "gc-description" }, description)] : []),
			...(metrics.length ? [h("div",{class:"gc-infobar",style:"flex-wrap:wrap"},metrics)] : []),
			...(date ? [h(
				"small",
				{
					class: "gc-snapshot",
					style: "display:block;margin-top:.5rem;font-size:.75rem;opacity:.7",
				},
				`Snapshot · ${date}`,
			)] : []),
		],
	);
}
