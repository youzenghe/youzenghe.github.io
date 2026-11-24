import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { friendsData } from "../src/data/friends.ts";

test("only the three selected original friend destinations remain", () => {
	assert.deepEqual(
		friendsData.map((friend) => [friend.title, friend.siteurl]),
		[
			["Mako", "https://blog.hitachi-mako.com"],
			["veyliss", "https://blog.veyliss.top/"],
			["cosine", "https://ysx.cosine.ren/"],
		],
	);
	for (const friend of friendsData) {
		assert.ok(friend.imgurl.startsWith("/assets/friends/"));
		assert.ok(
			fs.existsSync(new URL(`../public${friend.imgurl}`, import.meta.url)),
		);
	}
});

test("the friend page replaces template exchange content with static contacts", () => {
	const page = fs.readFileSync(
		new URL("../src/pages/friends.astro", import.meta.url),
		"utf8",
	);
	assert.match(page, /<FriendExchange/);
	assert.doesNotMatch(page, /getShuffledFriendsList/);
	const content = fs.readFileSync(
		new URL("../src/content/spec/friends.md", import.meta.url),
		"utf8",
	);
	assert.match(
		content,
		/申请友链时建议带上站点名称、主页地址、头像、简介和 RSS 地址。/,
	);
	assert.doesNotMatch(content, /miku\.top|aicorein|律回|::github/);
});

test("exchange contacts are native static links, not an online submission form", () => {
	const component = fs.readFileSync(
		new URL(
			"../src/components/features/friends/FriendExchange.astro",
			import.meta.url,
		),
		"utf8",
	);
	assert.match(component, /href=\{contact\.href\}/);
	assert.match(component, /href=\{action\.href\}/);
	assert.match(component, /rel="noopener noreferrer"/);
	assert.doesNotMatch(component, /<form|<script|client:|fetch\(|onclick=/);
	assert.match(component, /class="contact-actions" role="group"/);
});
