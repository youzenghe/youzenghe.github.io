import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

const root = path.resolve(fileURLToPath(new URL("../dist/", import.meta.url)));
const html = [];
const css = [];
async function walk(directory) {
	for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
		const target = path.join(directory, entry.name);
		if (entry.isDirectory()) await walk(target);
		else if (entry.isFile() && target.endsWith(".html")) html.push(target);
		else if (entry.isFile() && target.endsWith(".css")) css.push(target);
	}
}
await walk(root);
const failures = [];
let resourceCount = 0;
const allowed = value => !/^(?:https?:)?\/\//i.test(value);
for (const file of html) {
	const dom = parse(await fs.readFile(file, "utf8"));
	for (const element of dom.querySelectorAll("[src],[srcset],[poster],link[href],style")) {
		for (const attribute of ["src", "srcset", "poster"]) {
			const value = element.getAttribute(attribute);
			if (!value) continue;
			resourceCount++;
			const candidates = attribute === "srcset" ? value.split(",").map(item => item.trim().split(/\s+/)[0]) : [value];
			for (const candidate of candidates) {
				if (!allowed(candidate)) failures.push({ file: path.relative(root, file), attribute, value: candidate });
			}
		}
		if (element.tagName === "LINK" && ["stylesheet", "preload", "modulepreload", "icon", "preconnect", "dns-prefetch"].includes(element.getAttribute("rel"))) {
			resourceCount++;
			const value = element.getAttribute("href") || "";
			if (!allowed(value)) failures.push({ file: path.relative(root, file), attribute: "href", value });
		}
	}
}
for (const file of css) {
	for (const match of (await fs.readFile(file, "utf8")).matchAll(/url\(\s*["']?((?:https?:)?\/\/[^)"']+)/gi)) {
		failures.push({ file: path.relative(root, file), attribute: "css-url", value: match[1] });
	}
}
const result = { htmlDocuments: html.length, cssFiles: css.length, resourceReferences: resourceCount, externalResourceReferences: failures };
console.log(JSON.stringify(result, null, 2));
process.exitCode = failures.length ? 1 : 0;
