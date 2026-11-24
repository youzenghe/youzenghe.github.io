import assert from "node:assert/strict";
import { test } from "node:test";
import {
	friendContactActions,
	friendContacts,
} from "../src/data/friend-contact.ts";

test("the three requested public email addresses have their original webmail destinations", () => {
	assert.deepEqual(
		friendContacts.map((contact) => [contact.label, contact.email]),
		[
			["主邮箱", "2442616509@qq.com"],
			["备用邮箱", "A5075073344@163.com"],
			["备用邮箱", "skyberggrenzmb3391@gmail.com"],
		],
	);
	assert.equal(
		new URL(friendContacts[0].href).searchParams.get("email"),
		"2442616509@qq.com",
	);
	assert.equal(friendContacts[1].href, "https://mail.163.com/");
	assert.equal(
		friendContacts[0].href,
		"https://mail.qq.com/cgi-bin/qm_share?t=qm_mailme&email=2442616509%40qq.com",
	);
	const gmail = new URL(friendContacts[2].href);
	assert.equal(gmail.searchParams.get("to"), "skyberggrenzmb3391@gmail.com");
	assert.equal(gmail.searchParams.get("su"), "友链交换 / 站点留言");
	assert.equal(gmail.origin, "https://mail.google.com");
	assert.equal(gmail.pathname, "/mail/");
	assert.equal(gmail.searchParams.get("view"), "cm");
	assert.equal(gmail.searchParams.get("fs"), "1");
	assert.equal(gmail.searchParams.get("body"), "");
});

test("contact actions point to webmail and the original GitHub issue page without API submission", () => {
	assert.deepEqual(
		friendContactActions.map((action) => action.label),
		["QQ 邮箱网页版", "163 邮箱", "Gmail 编写", "GitHub 留言"],
	);
	assert.equal(
		friendContactActions[3].href,
		"https://github.com/youzenghe/youzenghe.github.io/issues",
	);
	for (const action of friendContactActions)
		assert.equal(new URL(action.href).protocol, "https:");
	for (let index = 0; index < 3; index++)
		assert.equal(friendContactActions[index].href, friendContacts[index].href);
});
