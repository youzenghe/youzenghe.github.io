<script lang="ts">
import { siteConfig } from "@/config";
import type { SearchResult } from "@/global";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@components/common/LocalIcon.svelte";
import { navigateToPage } from "@utils/navigation-utils";
import { url } from "@utils/url-utils";
import { onMount, tick } from "svelte";
import { createLatestSearch } from "./search-controller.mjs";
import postCatalog from "@/data/post-catalog.json";
import { mergeArticleTitleMatches } from "@utils/article-title-search";
import { BLOG_HOME_PATH } from "../../../constants/constants";

let keyword = $state("");
let result: SearchResult[] = $state([]);
let active = $state(false);
let isDesktop = $state(false);
let isDesktopSearchExpanded = $state(false);
let status = $state<"idle" | "loading" | "ready" | "error">("idle");
let desktopInput: HTMLInputElement;
let mobileInput: HTMLInputElement;
let debounceTimer: ReturnType<typeof setTimeout>;
let windowJustFocused = false;
let focusTimer: ReturnType<typeof setTimeout>;
const panelOpen = $derived(active && (!isDesktop || keyword.trim().length > 0));
const messages = siteConfig.lang.startsWith("zh")
	? { empty: "未找到搜索结果。", error: "搜索暂时不可用。" }
	: siteConfig.lang.startsWith("ja")
		? { empty: "検索結果がありません。", error: "検索は一時的に利用できません。" }
		: { empty: "No search results.", error: "Search is temporarily unavailable." };

const fakeResult: SearchResult[] = [
	{
		url: url(BLOG_HOME_PATH),
		meta: { title: "This Is a Fake Search Result" },
		excerpt: "Because the search cannot work in the <mark>dev</mark> environment.",
	},
	{
		url: url(BLOG_HOME_PATH),
		meta: { title: "If You Want to Test the Search" },
		excerpt: "Try running <mark>npm build && npm preview</mark> instead.",
	},
];

// Waiting for the index is part of the request. Guard item.data() completion too.
const controller = createLatestSearch(async (query: string): Promise<SearchResult[]> => {
	if (import.meta.env.DEV) return fakeResult;
	if (!window.pagefind) await window.loadPagefind?.();
	if (!window.pagefind) throw new Error("Pagefind is not available.");
	const response = await window.pagefind.search(query);
	const hits = await Promise.all(response.results.map((item) => item.data()));
	return mergeArticleTitleMatches(query, postCatalog.posts, hits, url);
});

function closeSearch(clear = false): void {
	controller.invalidate();
	clearTimeout(debounceTimer);
	active = false;
	isDesktopSearchExpanded = false;
	status = "idle";
	// Svelte flushes later; dismiss now so the shared click handler cannot
	// queue an animation that would close a subsequently reopened search.
	const panel = document.getElementById("search-panel");
	if (panel) {
		panel.classList.add("float-panel-closed");
		panel.inert = true;
		panel.setAttribute("aria-hidden", "true");
	}
	if (clear) {
		keyword = "";
		result = [];
	}
}

async function openSearch(focusInput: boolean): Promise<void> {
	active = true;
	isDesktopSearchExpanded = isDesktop;
	document.dispatchEvent(new CustomEvent("navigation:close-panels"));
	await tick();
	if (active && focusInput) (isDesktop ? desktopInput : mobileInput)?.focus();
}

function toggleMobileSearch(): void {
	if (active) closeSearch();
	else void openSearch(true);
}

function handleResultClick(event: MouseEvent, destination: string): void {
	// Preserve native modified-click and new-tab behavior.
	if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
	event.preventDefault();
	closeSearch(true);
	navigateToPage(destination);
}

function handleHover(): void {
	if (!windowJustFocused && window.matchMedia("(hover: hover)").matches && !active) {
		void openSearch(false);
	}
}

function handleMouseLeave(): void {
	if (!keyword.trim() && !document.getElementById("search-container")?.contains(document.activeElement)) closeSearch();
}

$effect(() => {
	const query = keyword.trim();
	const shouldSearch = active;
	controller.invalidate();
	clearTimeout(debounceTimer);
	result = [];
	status = shouldSearch && query ? "loading" : "idle";
	if (shouldSearch && query) {
		debounceTimer = setTimeout(async () => {
			try {
				const found = await controller.run(query);
				if (found === null) return;
				result = found;
				status = "ready";
			} catch (error) {
				console.error("Search error:", error);
				status = "error";
			}
		}, 300);
	}
	return () => {
		clearTimeout(debounceTimer);
		controller.invalidate();
	};
});

$effect(() => {
	const navbar = document.getElementById("navbar");
	const links = document.getElementById("navbar-links-container");
	navbar?.classList.toggle("is-searching", isDesktopSearchExpanded);
	if (links) links.inert = isDesktopSearchExpanded;
});

onMount(() => {
	const media = window.matchMedia("(min-width: 1280px)");
	const updateViewport = () => {
		closeSearch();
		isDesktop = media.matches;
	};
	updateViewport();
	media.addEventListener("change", updateViewport);
	const container = document.getElementById("search-container");
	const panel = document.getElementById("search-panel");
	const dismissOutside = (event: MouseEvent) => {
		if (active && event.target instanceof Node && !container?.contains(event.target)) closeSearch();
	};
	const dismissOnFocusLeave = (event: FocusEvent) => {
		if (active && event.relatedTarget instanceof Node && !container?.contains(event.relatedTarget)) closeSearch();
	};
	const dismissOnEscape = (event: KeyboardEvent) => {
		if (event.key !== "Escape" || !active) return;
		event.preventDefault();
		event.stopPropagation();
		closeSearch();
		document.getElementById(isDesktop ? "search-trigger" : "search-switch")?.focus();
	};
	const dismissForNavigation = () => closeSearch(true);
	const dismissForPanel = () => closeSearch();
	const handleWindowFocus = () => {
		windowJustFocused = true;
		clearTimeout(focusTimer);
		focusTimer = setTimeout(() => { windowJustFocused = false; }, 500);
	};
	// Other site controls can dismiss the panel by changing its class.
	const observer = new MutationObserver(() => {
		if (active && panelOpen && panel?.classList.contains("float-panel-closed")) closeSearch();
	});
	if (panel) observer.observe(panel, { attributes: true, attributeFilter: ["class"] });
	document.addEventListener("click", dismissOutside, true);
	document.addEventListener("keydown", dismissOnEscape, true);
	container?.addEventListener("focusout", dismissOnFocusLeave);
	document.addEventListener("navigation:close-search", dismissForPanel);
	window.addEventListener("focus", handleWindowFocus);
	window.addEventListener("pagehide", dismissForNavigation);
	let hookedSwup: typeof window.swup;
	const setupSwup = () => {
		if (hookedSwup || !window.swup?.hooks) return;
		hookedSwup = window.swup;
		hookedSwup.hooks.on("content:replace", dismissForNavigation);
	};
	setupSwup();
	document.addEventListener("swup:enable", setupSwup);
	return () => {
		closeSearch(true);
		clearTimeout(focusTimer);
		observer.disconnect();
		media.removeEventListener("change", updateViewport);
		document.removeEventListener("click", dismissOutside, true);
		document.removeEventListener("keydown", dismissOnEscape, true);
		container?.removeEventListener("focusout", dismissOnFocusLeave);
		document.removeEventListener("navigation:close-search", dismissForPanel);
		document.removeEventListener("swup:enable", setupSwup);
		window.removeEventListener("focus", handleWindowFocus);
		window.removeEventListener("pagehide", dismissForNavigation);
		hookedSwup?.hooks.off("content:replace", dismissForNavigation);
		document.getElementById("navbar")?.classList.remove("is-searching");
		const links = document.getElementById("navbar-links-container");
		if (links) links.inert = false;
	};
});
</script>

<!-- Separate controls retain native button activation and input semantics. -->
<div class="hidden lg:block relative w-11 h-11 shrink-0">
	<div
		id="search-bar"
		class="search-bar flex items-center h-11 rounded-lg absolute right-0 top-0 transition-all
			{isDesktopSearchExpanded ? 'w-60 bg-black/4 dark:bg-white/5' : 'w-11'}"
		onmouseenter={handleHover}
		onmouseleave={handleMouseLeave}
		role="search"
		aria-label={i18n(I18nKey.search)}
	>
		<button
			id="search-trigger"
			type="button"
			class="btn-plain rounded-lg w-11 h-11 shrink-0"
			aria-label={i18n(I18nKey.search)}
			aria-expanded={isDesktopSearchExpanded}
			aria-controls="search-input-desktop search-panel"
			onclick={() => openSearch(true)}
		>
			<Icon icon="material-symbols:search" class="text-[1.25rem]" />
		</button>
		<input
			id="search-input-desktop"
			bind:this={desktopInput}
			type="search"
			aria-label={i18n(I18nKey.search)}
			aria-controls="search-results"
			placeholder={i18n(I18nKey.search)}
			bind:value={keyword}
			hidden={!isDesktopSearchExpanded}
			class="min-w-0 flex-1 h-full pr-3 text-sm bg-transparent text-black/75 dark:text-white/75"
		/>
	</div>
</div>

<button
	onclick={toggleMobileSearch}
	type="button"
	aria-label={i18n(I18nKey.search)}
	aria-expanded={panelOpen}
	aria-controls="search-panel"
	id="search-switch"
	class="btn-plain scale-animation lg:hidden! rounded-lg w-11 h-11 active:scale-90"
>
	<Icon icon="material-symbols:search" class="text-[1.25rem]" />
</button>

<div
	id="search-panel"
	class="float-panel absolute top-20 left-4 md:left-[unset] right-4 z-50 search-panel shadow-2xl rounded-2xl p-2"
	class:float-panel-closed={!panelOpen}
	inert={!panelOpen}
	aria-hidden={!panelOpen}
	role="search"
	aria-label={i18n(I18nKey.search)}
>
	<div id="search-bar-inside" class="flex relative lg:hidden items-center h-11 rounded-xl bg-black/4 dark:bg-white/5">
		<Icon icon="material-symbols:search" class="absolute text-[1.25rem] pointer-events-none ml-3 text-black/30 dark:text-white/30" />
		<input
			id="search-input-mobile"
			bind:this={mobileInput}
			type="search"
			aria-label={i18n(I18nKey.search)}
			aria-controls="search-results"
			placeholder={i18n(I18nKey.search)}
			bind:value={keyword}
			class="pl-10 pr-3 w-full min-w-0 h-full text-sm bg-transparent text-black/75 dark:text-white/75"
		/>
	</div>
	<div id="search-results" aria-busy={status === "loading"}>
		{#each result as item}
			<a
				href={item.url}
				onclick={(event) => handleResultClick(event, item.url)}
				class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block rounded-xl text-lg px-3 py-2 hover:bg-(--btn-plain-bg-hover) active:bg-(--btn-plain-bg-active)"
			>
				<div class="transition text-90 inline-flex font-bold group-hover:text-(--primary)">
					{item.meta.title}<Icon icon="fa7-solid:chevron-right" class="transition text-[0.75rem] translate-x-1 my-auto text-(--primary) shrink-0" />
				</div>
				<div class="transition text-sm text-50">{@html item.excerpt}</div>
			</a>
		{/each}
	</div>
	<p class="search-status px-3 py-2 text-sm text-50" role="status" aria-live="polite">
		{#if status === "loading"}
			{i18n(I18nKey.search)}…
		{:else if status === "error"}
			{messages.error}
		{:else if status === "ready" && result.length === 0}
			{messages.empty}
		{/if}
	</p>
</div>

<style>
	input:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: -2px;
		border-radius: 0.5rem;
	}
	.search-panel {
		width: min(30rem, calc(100vw - 2rem));
		max-height: calc(100dvh - 6.25rem);
		overflow-y: auto;
		overflow-wrap: anywhere;
	}
	.search-status:empty { display: none; }
	@media (width < 768px) {
		.search-panel { width: auto; }
	}
</style>
