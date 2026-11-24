import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

test("link verification rejects encoded escapes and outside-root symlink targets", async () => {
	const temp = await fs.mkdtemp(path.join(os.tmpdir(), "blog-link-check-"));
	const root = path.join(temp, "dist");
	await fs.mkdir(root);
	await fs.writeFile(path.join(temp, "outside.txt"), "outside-marker");
	await fs.symlink(path.join(temp, "outside.txt"), path.join(root, "linked.txt"));
	await fs.writeFile(path.join(root, "index.html"), '<a href="/%2e%2e%2foutside.txt">Escaped</a><a href="/linked.txt">Linked</a>');
	try {
		const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/check-static-links.mjs", import.meta.url)), root], { encoding: "utf8" });
		const report = JSON.parse(result.stdout);
		assert.equal(result.status, 1);
		assert.equal(report.missing.length, 2);
		assert.ok(report.missing.every(item => item.reason === "outside-root"));
	} finally {
		await fs.rm(temp, { recursive: true, force: true });
	}
});
