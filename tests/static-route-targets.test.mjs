import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

test("disabled routes redirect to the actual static 404 file", () => {
	for (const file of ["anime.astro", "ai-tools.astro", "projects.astro", "albums/[...page].astro", "timeline.astro", "friends.astro", "skills.astro", "diary.astro", "albums/[id]/index.astro"]) {
		const source = fs.readFileSync(new URL(`../src/pages/${file}`, import.meta.url), "utf8");
		assert.doesNotMatch(source, /Astro\.redirect\("\/404\/"\)/);
	}
});
