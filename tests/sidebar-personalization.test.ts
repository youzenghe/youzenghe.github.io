import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { announcementConfig } from "../src/config/announcementConfig.ts";
import { profileConfig } from "../src/config/profileConfig.ts";
import { sidebarTags } from "../src/config/sidebarTags.ts";

test("sidebar tags use only the specified order independently of article metadata", () => {
	assert.deepEqual(sidebarTags, [
		"Java",
		"Spring",
		"MySQL",
		"MyBatis",
		"Redis",
		"MQ",
		"Kafka",
		"Docker",
		"Python",
		"Django",
		"PostgreSQL",
		"MongoDB",
		"AI",
		"项目",
	]);
	const source = fs.readFileSync(
		new URL("../src/components/widgets/tags/Tags.astro", import.meta.url),
		"utf8",
	);
	assert.match(source, /sidebarTags/);
	assert.doesNotMatch(source, /getTagList/);
});

test("profile is personalized and exposes only GitHub and Bilibili", () => {
	assert.equal(profileConfig.name, "AAA乔瓮批发宝哥");
	assert.equal(profileConfig.avatar, "/static/profile-avatar-chibi.png");
	assert.deepEqual(
		profileConfig.links.map((link) => [link.name, link.url]),
		[
			["GitHub", "https://github.com/youzenghe"],
			["Bilibili", "https://space.bilibili.com/220928497"],
		],
	);
	const source = fs.readFileSync(
		new URL("../src/components/widgets/profile/Profile.astro", import.meta.url),
		"utf8",
	);
	assert.match(source, /class="profile-social-links"/);
	assert.match(source, /class="profile-social-link/);
	assert.match(source, /min-width: 2\.75rem/);
	assert.match(source, /justify-content: center/);
	assert.match(source, /overflow-wrap: anywhere/);
	assert.match(source, /rel="me noopener noreferrer"/);
});

test("announcement preserves the user's literal date and emoticon", () => {
	assert.equal(
		announcementConfig.content,
		"本站于2026.11.25完成界面改造\n∠・ω< )⌒☆",
	);
});

test("notice lines are explicit and avatar is rendered without cropping", () => {
	const notice = fs.readFileSync(
		new URL(
			"../src/components/widgets/announcement/Announcement.astro",
			import.meta.url,
		),
		"utf8",
	);
	assert.match(notice, /config\.content\.split\("\\n"\)/);
	assert.match(notice, /class="announcement-line"/);
	assert.match(notice, /white-space: nowrap/);
	const profile = fs.readFileSync(
		new URL("../src/components/widgets/profile/Profile.astro", import.meta.url),
		"utf8",
	);
	assert.match(profile, /class="profile-avatar"/);
	assert.match(profile, /object-fit: contain/);
	assert.doesNotMatch(profile, /<Image\s/);
});
