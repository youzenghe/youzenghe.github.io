// Runs synchronously in the head, before any deferred page scripts.
(() => {
	if (window.__navigationBackground) return;
	const pools = JSON.parse(document.currentScript.dataset.pools);
	const device = window.matchMedia("(max-width: 768px)").matches ? "mobile" : "desktop";
	const key = `navigation-background-${device}`;
	let previous;
	try { previous = window.sessionStorage.getItem(key); } catch { /* Storage is optional. */ }
	const pool = pools[device].filter(url => /^\/(?!\/)[^\\\s?#]+\.webp$/i.test(url));
	const choices = pool.length > 1 ? pool.filter(url => url !== previous) : pool;
	if (!choices.length) return;
	const url = choices[Math.floor(Math.random() * choices.length)];
	window.__navigationBackground = { url, device };
	try { window.sessionStorage.setItem(key, url); } catch { /* Storage is optional. */ }
})();
