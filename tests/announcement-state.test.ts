import assert from "node:assert/strict";
import { test } from "node:test";
import {
	dismissAnnouncement,
	isAnnouncementDismissed,
} from "../src/utils/announcement-state.ts";

test("old generic or previous-notice dismissals cannot hide a replacement notice", () => {
	const values = new Map<string, string>([["announcementClosed", "true"]]);
	const storage = {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
	};
	assert.equal(isAnnouncementDismissed(storage, "new notice"), false);
	dismissAnnouncement(storage, "old notice");
	assert.equal(isAnnouncementDismissed(storage, "old notice"), true);
	assert.equal(isAnnouncementDismissed(storage, "new notice"), false);
	dismissAnnouncement(storage, "new notice");
	assert.equal(isAnnouncementDismissed(storage, "new notice"), true);
});

test("storage restrictions do not prevent announcement rendering or closing", () => {
	const storage = {
		getItem: () => {
			throw new Error("Storage denied");
		},
		setItem: () => {
			throw new Error("Storage denied");
		},
	};
	assert.equal(isAnnouncementDismissed(storage, "notice"), false);
	assert.doesNotThrow(() => dismissAnnouncement(storage, "notice"));
});
