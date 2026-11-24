import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const selected = [
	[
		"shen-ben-wu-xiang",
		"神本无相——豆包说，它识别不出我的脸",
		"2024-12-30",
		"lookme.webp",
	],
	[
		"qiaoweng-galgame",
		"我决定做一款关于乔瓮的 GalGame",
		"2025-03-02",
		"bgcbw.webp",
	],
	["software-copyrights", "软件著作权×2", "2025-06-21", "miku.webp"],
	[
		"robot-ai-contest",
		"中国机器人及人工智能大赛",
		"2025-08-22",
		"shiroko.webp",
	],
	["software-adoption", "软件引入证明", "2025-11-10", "1257649.webp"],
	["last-contest", "累死了，以后不打比赛了", "2026-05-27", "1358198.webp"],
	["muyuan-java-interview", "牧原Java面经", "2026-08-03", "1358196.webp"],
];

test("only the seven specified titles, dates and cover assignments are catalogued", () => {
	const catalog = JSON.parse(
		fs.readFileSync(new URL("src/data/post-catalog.json", root), "utf8"),
	);
	assert.deepEqual(
		catalog.posts.map((post) => [
			post.slug,
			post.title,
			post.published,
			post.cover,
		]),
		selected,
	);
	for (const [slug, title, published, cover] of selected) {
		const body = fs.readFileSync(
			new URL(`src/content/posts/${slug}/index.md`, root),
			"utf8",
		);
		assert.ok(body.includes(`title: ${JSON.stringify(title)}`));
		assert.ok(body.includes(`published: ${published}`));
		assert.ok(body.includes(`image: "./${cover}"`));
		assert.ok(body.includes('author: "超级小识"'));
	}
});

test("evidence screenshots and certificates survive the cover replacement", () => {
	const images = {
		"shen-ben-wu-xiang": ["doubao-face-result.webp"],
		"qiaoweng-galgame": ["galgame-note.png"],
		"software-copyrights": ["wenzhi-copyright.jpg", "poetry-copyright.jpg"],
		"robot-ai-contest": ["national-first-certificate.webp"],
		"software-adoption": ["software-adoption-proof.webp"],
		"last-contest": ["last-contest-certificates.webp"],
	};
	for (const [slug, names] of Object.entries(images)) {
		const body = fs.readFileSync(
			new URL(`src/content/posts/${slug}/index.md`, root),
			"utf8",
		);
		for (const name of names) {
			assert.ok(body.includes(`](./${name}`));
			assert.ok(
				fs.existsSync(new URL(`src/content/posts/${slug}/${name}`, root)),
			);
		}
	}
});

test("interview prose, technical blocks and source attribution are retained", () => {
	const body = fs.readFileSync(
		new URL("src/content/posts/muyuan-java-interview/index.md", root),
		"utf8",
	);
	assert.match(body, /## Java后端（重点）/);
	assert.match(body, /volatile/);
	assert.match(body, /Redis/);
	assert.match(body, /## HR/);
	assert.match(body, /```/);
	assert.doesNotMatch(body, /^# 牧原股份 \/ 牧原集团 Java 岗位面经汇总/m);
});
