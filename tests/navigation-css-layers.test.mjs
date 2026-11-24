import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const layout = fs.readFileSync(
	new URL("../src/layouts/Layout.astro", import.meta.url),
	"utf8",
);

test("every document fixes cascade layer priority before any generated stylesheet", () => {
	const declaration = layout.match(
		/<style\s+is:inline\s+data-css-layer-order\s*>\s*(@layer[^;]+;)\s*<\/style>/,
	);
	assert.ok(
		declaration,
		"Missing persistent document-level CSS layer ordering declaration",
	);
	assert.equal(
		declaration[1],
		"@layer properties, theme, base, components, utilities;",
	);
	const headStart = layout.indexOf("<head>");
	const orderPosition = layout.indexOf(declaration[0], headStart);
	const firstGeneratedStyles = layout.indexOf("<Font cssVariable=", headStart);
	assert.ok(orderPosition > headStart && orderPosition < firstGeneratedStyles);
	assert.doesNotMatch(declaration[0], /define:vars|data-astro-cid/);
});

test("Cascade priority survives the duplicated layer declarations in inline page chunks", () => {
	const declaration = layout.match(
		/data-css-layer-order[^>]*>\s*@layer\s+([^;]+);/,
	);
	assert.ok(declaration);
	const layers = declaration[1].split(",").map((name) => name.trim());
	const retainFirstDefinition = (...declarations) => [
		...new Set(declarations.flat()),
	];
	const layersAfterHeadMerge = retainFirstDefinition(
		layers,
		["properties", "components", "utilities"],
		["theme", "base", "components", "utilities"],
	);
	assert.deepEqual(layersAfterHeadMerge, layers);
	assert.ok(
		layersAfterHeadMerge.indexOf("base") <
			layersAfterHeadMerge.indexOf("utilities"),
	);
});
