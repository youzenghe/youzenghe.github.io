import assert from "node:assert/strict";
import { test } from "node:test";
import { sliderKeyboardValue } from "../src/components/widgets/music-player/slider-keyboard.ts";

test("music sliders support arrows, Home/End and Page keys with bounded values", () => {
	assert.equal(sliderKeyboardValue("ArrowRight", 40, 0, 100, 5), 45);
	assert.equal(sliderKeyboardValue("ArrowLeft", 40, 0, 100, 5), 35);
	assert.equal(sliderKeyboardValue("ArrowUp", 98, 0, 100, 5), 100);
	assert.equal(sliderKeyboardValue("ArrowDown", 2, 0, 100, 5), 0);
	assert.equal(sliderKeyboardValue("Home", 40, 0, 100, 5), 0);
	assert.equal(sliderKeyboardValue("End", 40, 0, 100, 5), 100);
	assert.equal(sliderKeyboardValue("PageUp", 40, 0, 100, 5), 90);
	assert.equal(sliderKeyboardValue("PageDown", 40, 0, 100, 5), 0);
});

test("unrelated keys and unavailable/invalid ranges do not seek or mute", () => {
	for (const key of ["Enter", " ", "Tab", "m"]) {
		assert.equal(sliderKeyboardValue(key, 40, 0, 100, 5), null);
	}
	assert.equal(sliderKeyboardValue("ArrowRight", 0, 0, 0, 5), null);
	assert.equal(
		sliderKeyboardValue("ArrowRight", 0, 0, Number.POSITIVE_INFINITY, 5),
		null,
	);
});
