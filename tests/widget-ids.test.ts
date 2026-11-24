import assert from "node:assert/strict";
import { test } from "node:test";
import { getWidgetContentId } from "../src/utils/widget-ids.ts";

test("sidebar instances have distinct IDs within each render", () => {
	const request = {};
	assert.equal(getWidgetContentId(request, "tags"), "tags-1");
	assert.equal(getWidgetContentId(request, "tags"), "tags-2");
	assert.equal(getWidgetContentId(request, "calendar"), "calendar-1");
	assert.equal(getWidgetContentId({}, "tags"), "tags-1");
});
