import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
	resolveRequestPath,
	startPreview,
} from "../scripts/preview-static.mjs";

test("static preview resolves route paths without allowing root escape", () => {
	const root = path.resolve("dist");
	assert.equal(resolveRequestPath(root, "/about/"), path.join(root, "about"));
	assert.equal(resolveRequestPath(root, "/%2e%2e/%2e%2e/etc/passwd"), null);
	assert.equal(resolveRequestPath(root, "/%00"), null);
	assert.equal(resolveRequestPath(root, "/%ZZ"), null);
	assert.equal(resolveRequestPath(root, "/%5c..%5csecret"), null);
});

test("static preview serves a fixture, preserves HEAD and rejects writes", async () => {
	const root = await fs.mkdtemp(path.join(os.tmpdir(), "blog-preview-"));
	await fs.writeFile(
		path.join(root, "index.html"),
		"<!doctype html><title>Preview</title>",
	);
	await fs.mkdir(path.join(root, "about"));
	await fs.writeFile(
		path.join(root, "about/index.html"),
		"<!doctype html><title>About</title>",
	);
	await fs.writeFile(path.join(root, "404.html"), "<!doctype html><title>Not found</title>");
	const server = await startPreview({ port: 0, root });
	const origin = `http://127.0.0.1:${server.address().port}`;
	try {
		const home = await fetch(`${origin}/`);
		assert.equal(home.status, 200);
		assert.match(home.headers.get("content-type"), /text\/html/);
		assert.match(await home.text(), /<title>Preview<\/title>/);
		const about = await fetch(`${origin}/about/`, { method: "HEAD" });
		assert.equal(about.status, 200);
		assert.equal(await about.text(), "");
		assert.equal((await fetch(origin, { method: "POST" })).status, 405);
		const missing = await fetch(`${origin}/does-not-exist/`);
		assert.equal(missing.status, 404);
		assert.match(await missing.text(), /<title>Not found<\/title>/);
	} finally {
		server.closeAllConnections();
		await new Promise((resolve) => server.close(resolve));
		await fs.rm(root, { recursive: true, force: true });
	}
});

test("404 fallback never follows a symlink outside the preview root", async () => {
	const temp = await fs.mkdtemp(path.join(os.tmpdir(), "blog-preview-link-"));
	const root = path.join(temp, "dist");
	await fs.mkdir(root);
	await fs.writeFile(path.join(root, "index.html"), "<title>Home</title>");
	const outside = path.join(temp, "private.txt");
	await fs.writeFile(outside, "outside-marker");
	await fs.symlink(outside, path.join(root, "404.html"));
	const server = await startPreview({ port: 0, root });
	try {
		const response = await fetch(`http://127.0.0.1:${server.address().port}/missing/`);
		assert.equal(response.status, 404);
		assert.equal(await response.text(), "Not found");
	} finally {
		server.closeAllConnections();
		await new Promise(resolve => server.close(resolve));
		await fs.rm(temp, { recursive: true, force: true });
	}
});
