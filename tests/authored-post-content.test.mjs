import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const articles = [
	{
		slug: "shen-ben-wu-xiang",
		title: "神本无相",
		description: "我把照片发给豆包了。",
		body: `我把照片发给豆包，他说未识别到人脸，我保证我没提前说啥提示词。笑死我了，神本无相说是

![豆包对照片给出的“未识别到人脸”回复](./doubao-face-result.webp)`,
	},
	{
		slug: "qiaoweng-galgame",
		title: "我决定做一款关于乔瓮的 GalGame",
		description: "准备做个关于乔瓮的 GalGame，剧本交给乔瓮。",
		body: `准备做个关于乔瓮的 GalGame，先在这里占个坑。

![](./galgame-note.png)

2026-04-04编：目前已经上线了，要是有人看见的话，可以玩一下，我会十分感谢的，这个是链接，

<https://www.3839.com/a/196204.htm?from=hykb>

（由于没啥钱，所以用的是AI画的图。立绘是一位老师无偿提供的）`,
	},
	{
		slug: "software-copyrights",
		title: "软件著作权×2",
		description: "我去，我真吊，一下有了俩著作权，虽然没啥用，但我真吊，我都是第一作者。",
		body: `## 文智融典

![](./wenzhi-copyright.jpg)

## 一首诗词

![](./poetry-copyright.jpg)`,
	},
	{
		slug: "robot-ai-contest",
		title: "中国机器人及人工智能大赛",
		description: "我第一次拿国奖欸。",
		body: `可能这样说会显得我很自大，但其实我是负责人，由于之前比赛的教训，我怕组委会那边歧视，低年级不敢当队长，哎，拿奖了，自己不是队长，有点难受。

但队友没拖后腿给提供情绪价值了，我跑模型的时候，人家给我买奶茶，还陪我熬夜，算了不管了

![中国机器人及人工智能大赛国家一等奖证书](./national-first-certificate.webp)`,
	},
	{
		slug: "software-adoption",
		title: "软件引入证明",
		description: "有个公司人家愿意用我的架构欸，哈哈哈。",
		body: `之前另外一个拿国奖的项目，有个公司，人家瞧上了。但其实这个项目我是完完全全用AI做的，有点心虚，到时候实话给人家说。

![软件引入证明](./software-adoption-proof.webp)`,
	},
	{
		slug: "last-contest",
		title: "累死了，以后不打比赛了",
		description: "到此为止了，孩子们。",
		body: `我去我以后不打比赛了，累死我了，之后我就挂名吧，把项目传出去。

大家都是很负责的人，我很放心他们，希望项目能被更多的人看见（哈哈哈其实是摆烂了）。

![中国大学生计算机设计大赛获奖证书与荣誉证书](./last-contest-certificates.webp)`,
	},
];

for (const { slug, title, description, body } of articles) {
	test(`${slug} retains its authored title, description, and body`, () => {
		const source = readFileSync(
			new URL(`../src/content/posts/${slug}/index.md`, import.meta.url),
			"utf8",
		);
		assert.ok(source.includes(`title: ${JSON.stringify(title)}`));
		assert.ok(source.includes(`description: ${JSON.stringify(description)}`));
		assert.equal(source.replace(/^---\n[\s\S]*?\n---\n/, "").trim(), body);
	});
}
