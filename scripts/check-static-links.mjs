import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";
import { resolveRequestPath } from "./preview-static.mjs";

const root = path.resolve(process.argv[2] || fileURLToPath(new URL("../dist/", import.meta.url)));
const actualRoot = await fs.realpath(root);
const documents = [];
async function walk(directory) {
	for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
		const file = path.join(directory, entry.name);
		if (entry.isDirectory()) await walk(file);
		else if (entry.isFile() && entry.name.endsWith(".html")) documents.push(file);
	}
}
await walk(root);
const parsed = new Map();
for (const file of documents) parsed.set(file, parse(await fs.readFile(file, "utf8")));
const missing = [];
let linkCount = 0;
for (const [file, dom] of parsed) {
	const relative = path.relative(root, file).replaceAll(path.sep, "/");
	const sourceURL = new URL(relative.replace(/index\.html$/, ""), "http://local.test/");
	for (const link of dom.querySelectorAll("a[href]")) {
		const href = link.getAttribute("href");
		let url;
		try { url = new URL(href, sourceURL); } catch { missing.push({ source: relative, href, reason: "invalid-url" }); continue; }
		if (url.origin !== sourceURL.origin) continue;
		linkCount++;
		let target = resolveRequestPath(root, url.pathname);
		if (!target) { missing.push({ source: relative, href, reason: "outside-root" }); continue; }
		try {
			if ((await fs.stat(target)).isDirectory()) target = path.join(target, "index.html");
			await fs.access(target);
			const realTarget = await fs.realpath(target);
			if (!realTarget.startsWith(actualRoot + path.sep)) {
				missing.push({ source: relative, href, reason: "outside-root" });
				continue;
			}
		} catch {
			missing.push({ source: relative, href, reason: "missing-file" });
			continue;
		}
		if (url.hash && parsed.has(target)) {
			let id;
			try { id = decodeURIComponent(url.hash.slice(1)); } catch { id = url.hash.slice(1); }
			if (!parsed.get(target).querySelectorAll("[id]").some(node => node.id === id)) {
				missing.push({ source: relative, href, reason: "missing-fragment" });
			}
		}
	}
}
const result = { documentCount: documents.length, localLinkCount: linkCount, missing };
console.log(JSON.stringify(result, null, 2));
process.exitCode = missing.length ? 1 : 0;
