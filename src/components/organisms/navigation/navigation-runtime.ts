/** Synchronize visual disclosure state with keyboard and accessibility state. */
export function setPanelState(
	panel: HTMLElement,
	trigger: HTMLElement,
	open: boolean,
): void {
	panel.classList.toggle("float-panel-closed", !open);
	panel.inert = !open;
	panel.setAttribute("aria-hidden", String(!open));
	trigger.setAttribute("aria-expanded", String(open));
}

/** Native buttons provide Enter/Space activation; arrow keys navigate links. */
export function bindDropdown(dropdown: HTMLElement, mobile = false) {
	const trigger = dropdown.querySelector<HTMLElement>(
		mobile ? "[data-mobile-dropdown-trigger]" : "[data-dropdown-trigger]",
	);
	const menu = dropdown.querySelector<HTMLElement>(
		mobile ? "[data-mobile-submenu]" : "[data-dropdown-menu]",
	);
	const items = Array.from(
		menu?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? [],
	);
	if (!trigger || !menu) return { close() {}, dispose() {} };
	const controller = new AbortController();
	const options = { signal: controller.signal };
	const setOpen = (open: boolean) => {
		trigger.setAttribute("aria-expanded", String(open));
		dropdown.setAttribute("data-expanded", String(open));
		menu.inert = !open;
		menu.setAttribute("aria-hidden", String(!open));
	};
	const close = () => setOpen(false);
	close();
	trigger.addEventListener(
		"click",
		() => setOpen(trigger.getAttribute("aria-expanded") !== "true"),
		options,
	);
	trigger.addEventListener(
		"keydown",
		(event) => {
			if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
			event.preventDefault();
			setOpen(true);
			items[event.key === "ArrowDown" ? 0 : items.length - 1]?.focus();
		},
		options,
	);
	menu.addEventListener(
		"keydown",
		(event) => {
			const index = items.indexOf(event.target as HTMLAnchorElement);
			if (
				index < 0 ||
				!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
			)
				return;
			event.preventDefault();
			const next =
				event.key === "Home"
					? 0
					: event.key === "End"
						? items.length - 1
						: (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
							items.length;
			items[next]?.focus();
		},
		options,
	);
	dropdown.addEventListener(
		"keydown",
		(event) => {
			if (event.key !== "Escape") return;
			event.preventDefault();
			event.stopPropagation();
			close();
			trigger.focus();
		},
		options,
	);
	dropdown.addEventListener(
		"focusout",
		(event) => {
			if (!dropdown.contains(event.relatedTarget as Node | null)) close();
		},
		options,
	);
	if (!mobile) {
		dropdown.addEventListener(
			"mouseenter",
			() => {
				if (window.matchMedia("(hover: hover)").matches) setOpen(true);
			},
			options,
		);
		dropdown.addEventListener(
			"mouseleave",
			() => {
				if (!dropdown.contains(document.activeElement)) close();
			},
			options,
		);
	}
	return {
		close,
		dispose: () => {
			close();
			controller.abort();
		},
	};
}

/** Bind the current header only; the caller owns the Swup/document lifecycle. */
export function initNavbar(navbar: HTMLElement) {
	const controller = new AbortController();
	const options = { signal: controller.signal };
	const pairs = [
		["display-setting", "display-settings-switch"],
		["nav-menu-panel", "nav-menu-switch"],
	] as const;
	const dropdowns = [
		...Array.from(
			navbar.querySelectorAll<HTMLElement>("[data-dropdown]"),
			(root) => ({ root, binding: bindDropdown(root) }),
		),
		...Array.from(
			navbar.querySelectorAll<HTMLElement>("[data-mobile-dropdown]"),
			(root) => ({ root, binding: bindDropdown(root, true) }),
		),
	];
	const disclosures = dropdowns.map(({ binding }) => binding);
	const closePanels = (restoreFocus = false) => {
		for (const [id, buttonId] of pairs) {
			const panel = document.getElementById(id);
			const trigger = document.getElementById(buttonId);
			if (!panel || !trigger) continue;
			const hadFocus = panel.contains(document.activeElement);
			setPanelState(panel, trigger, false);
			if (restoreFocus && hadFocus) trigger.focus();
		}
		for (const disclosure of disclosures) disclosure.close();
	};
	const syncPanels = () => {
		for (const [id, buttonId] of pairs) {
			const panel = document.getElementById(id);
			const trigger = document.getElementById(buttonId);
			if (!panel || !trigger) continue;
			const open = !panel.classList.contains("float-panel-closed");
			panel.inert = !open;
			panel.setAttribute("aria-hidden", String(!open));
			panel.setAttribute(
				"role",
				id === "nav-menu-panel" ? "navigation" : "region",
			);
			panel.setAttribute(
				"aria-label",
				trigger.getAttribute("aria-label") ?? "",
			);
			trigger.setAttribute("aria-expanded", String(open));
		}
	};
	for (const [id, buttonId] of pairs) {
		const trigger = document.getElementById(buttonId);
		trigger?.addEventListener(
			"click",
			() => {
				const panel = document.getElementById(id);
				if (!panel) return;
				const open = panel.classList.contains("float-panel-closed");
				closePanels();
				document.dispatchEvent(new CustomEvent("navigation:close-search"));
				setPanelState(panel, trigger, open);
				if (open)
					panel
						.querySelector<HTMLElement>("a[href], button, input, select")
						?.focus();
			},
			options,
		);
	}
	// Capture dismissal before the site's asynchronous panel animator can queue it.
	document.addEventListener(
		"click",
		(event) => {
			if (!(event.target instanceof Node)) return;
			for (const [id, buttonId] of pairs) {
				const panel = document.getElementById(id);
				const trigger = document.getElementById(buttonId);
				if (
					panel &&
					trigger &&
					!panel.contains(event.target) &&
					!trigger.contains(event.target)
				)
					setPanelState(panel, trigger, false);
			}
			for (const { root, binding } of dropdowns) {
				if (!root.contains(event.target)) binding.close();
			}
		},
		{ ...options, capture: true },
	);
	document.addEventListener(
		"keydown",
		(event) => {
			if (event.key !== "Escape") return;
			for (const [id, buttonId] of pairs) {
				const panel = document.getElementById(id);
				const trigger = document.getElementById(buttonId);
				if (
					!panel ||
					!trigger ||
					panel.classList.contains("float-panel-closed")
				)
					continue;
				event.preventDefault();
				setPanelState(panel, trigger, false);
				trigger.focus();
			}
		},
		options,
	);
	navbar.addEventListener(
		"focusout",
		(event) => {
			if (
				event.relatedTarget instanceof Node &&
				!navbar.contains(event.relatedTarget)
			)
				closePanels();
		},
		options,
	);
	navbar.querySelector("#nav-menu-panel")?.addEventListener(
		"click",
		(event) => {
			if (event.target instanceof Element && event.target.closest("a[href]"))
				closePanels();
		},
		options,
	);
	document.addEventListener(
		"navigation:close-panels",
		() => closePanels(),
		options,
	);
	const media = window.matchMedia("(min-width: 1280px)");
	media.addEventListener("change", () => closePanels(true), options);
	// Settings is a client-only island and may appear after the Astro script.
	const observer = new MutationObserver(syncPanels);
	observer.observe(navbar, {
		subtree: true,
		childList: true,
		attributes: true,
		attributeFilter: ["class"],
	});
	syncPanels();
	let frame = 0;
	const updateScroll = () => {
		frame = 0;
		navbar.classList.toggle(
			"scrolled",
			navbar.dataset.isHome !== "true" || window.scrollY > 50,
		);
	};
	window.addEventListener(
		"scroll",
		() => {
			if (!frame) frame = requestAnimationFrame(updateScroll);
		},
		{ ...options, passive: true },
	);
	updateScroll();
	return {
		close: () => closePanels(),
		updateScroll,
		dispose: () => {
			closePanels();
			for (const disclosure of disclosures) disclosure.dispose();
			controller.abort();
			observer.disconnect();
			cancelAnimationFrame(frame);
		},
	};
}
