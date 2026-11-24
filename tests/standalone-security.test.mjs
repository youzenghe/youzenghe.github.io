import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("standalone entry documents enforce local-script policy before scripts", () => {
	for (const name of ["public/pages/blog.html", "public/pages/posts.html", "public/pages/about.html", "public/pages/projects.html", "public/services/index.html", "public/games/chat.html"]) {
		const source = readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
		assert.match(source, /http-equiv="Content-Security-Policy"/, name);
		assert.match(source, /script-src 'self' 'unsafe-inline'/, name);
		assert.ok(source.indexOf('http-equiv="Content-Security-Policy"') < source.indexOf("<script"), name);
	}
	const route = readFileSync(new URL("../src/pages/pages/[legacy].html.ts", import.meta.url), "utf8");
	assert.match(route, /Content-Security-Policy/);
	assert.match(route, /script-src 'self' 'unsafe-inline'/);
});

test("optional chat still permits caller-selected network endpoints", () => {
	const source = readFileSync(new URL("../public/games/chat.html", import.meta.url), "utf8");
	assert.match(source, /connect-src 'self' https: http: ws: wss:/);
});
