import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { test } from "node:test";

const root = new URL("../", import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), "utf8");
const catalog = () => JSON.parse(read("src/data/post-catalog.json"));

test("article collection contains only catalogued selections", () => {
	const collection = new URL("src/content/posts/", root);
	const folders = fs
		.readdirSync(collection, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
	assert.deepEqual(
		folders,
		catalog()
			.posts.map((post) => post.slug)
			.sort(),
	);
	assert.equal(
		fs
			.readdirSync(collection, { withFileTypes: true })
			.some((entry) => entry.isFile()),
		false,
	);
});

test("catalogued metadata and image bytes match each migrated article", () => {
	for (const post of catalog().posts) {
		const file = `src/content/posts/${post.slug}/index.md`;
		const text = read(file);
		assert.ok(text.includes(`title: ${JSON.stringify(post.title)}`));
		assert.ok(text.includes(`published: ${post.published}`));
		assert.ok(text.includes(`image: "./${post.cover}"`));
		for (const image of post.assets) {
			const bytes = fs.readFileSync(
				new URL(`src/content/posts/${post.slug}/${image.file}`, root),
			);
			assert.equal(
				createHash("sha256").update(bytes).digest("hex"),
				image.sha256,
			);
		}
	}
});

test("the first article has its original evidence screenshot inside the body", () => {
	const text = read("src/content/posts/shen-ben-wu-xiang/index.md");
	assert.match(
		text,
		/!\[豆包对照片给出的“未识别到人脸”回复\]\(\.\/doubao-face-result\.webp\)/,
	);
	assert.match(text, /category: "趣味生活"/);
	assert.match(text, /author: "超级小识"/);
	assert.match(text, /未识别到人脸/);
	assert.doesNotMatch(text, /https?:\/\/|images\/albums/);
});
