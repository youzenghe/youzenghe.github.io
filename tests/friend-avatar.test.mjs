import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

test("unavailable external avatars have a local fallback without an error loop", () => {
	const source = fs.readFileSync(
		new URL(
			"../src/components/features/friends/FriendCard.astro",
			import.meta.url,
		),
		"utf8",
	);
	assert.match(source, /onerror=\{`this\.onerror=null;/);
	assert.match(source, /friend-avatar\.svg/);
	assert.match(source, /data-avatar-source=\{friend\.imgurl\}/);
	assert.match(source, /aria-label=\{i18n\(I18nKey\.friendsCopyLink\)\}/);
});
