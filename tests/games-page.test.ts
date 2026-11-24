import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { games } from "../src/data/games.ts";
import { resolveGameDestination } from "../src/utils/game-links.ts";
import { navBarConfig } from "../src/config/navBarConfig.ts";
import { LinkPreset } from "../src/types/config.ts";

const read = (name: string) =>
	fs.readFileSync(new URL("../" + name, import.meta.url), "utf8");
test("six original collection games retain titles and local covers without extra descriptions", () => {
	assert.deepEqual(
		games.map((g) => g.title),
		[
			"常轨脱离 Creative",
			"夏日口袋",
			"甜蜜女友 2",
			"与你心相连",
			"妹相随",
		"妹同居",
		],
	);
	assert.equal(new Set(games.map((g) => g.id)).size, 6);
	for (const game of games) {
		assert.match(game.cover, /^\/assets\/games\/[^/]+\.webp$/);
		assert.ok(
			fs.statSync(new URL("../public" + game.cover, import.meta.url)).isFile(),
		);
		assert.ok(game.width > 0 && game.height > 0);
		assert.ok(resolveGameDestination(game.url));
		for (const key of [
			"description",
			"score",
			"status",
			"releaseDate",
			"downloadLink",
		])
			assert.ok(!(key in game));
	}
	assert.ok(!games.some((g) => g.title === "和这样的我恋爱吧"));
});
test("game links exactly match the supplied cloud-drive destinations",()=>{
	assert.deepEqual(games.map(game=>[game.id,game.url]),[
		['galgame-01','https://pan.baidu.com/s/1_QTtIxtK_KBREiUiaacEGw?pwd=kyin'],
		['galgame-02','https://pan.baidu.com/s/1WJEfTW0u1nHjAufNErG6-A?pwd=14a8'],
		['galgame-03','https://pan.baidu.com/s/1o3j2bE5iuQN__E_PH3-Chw?pwd=92ug'],
		['galgame-04','https://pan.baidu.com/s/1cHfmriNprrnn8COW8nOhQA?pwd=3276'],
		['galgame-05','https://pan.baidu.com/s/1PVNv_hKBuS68UMwEKbcxyQ?pwd=a56e'],
		['galgame-06','https://pan.baidu.com/s/1tstrC00n2GXWh9RXScnXHw?pwd=fmhp'],
	]);
});
test("a shared extraction note is below the cards and distinguishes drive codes from archive passwords",()=>{
	const page=read('src/pages/games.astro');
	assert.ok(page.indexOf('id="game-download-notes"')>page.indexOf('<GameCard'));
	for(const text of ['点击卡片','网盘','括号','解压密码','忘记','解压缩全能王','解压专家','伪装工具','后缀','教程','提取码','正确密码'])assert.ok(page.includes(text),text);
	assert.doesNotMatch(page,/保证.*解压|无需.*密码.*破解/);
});
test("games navigation sits between archive and albums", () => {
	const index = navBarConfig.links.findIndex(
		(l) => typeof l !== "number" && l.url === "/games/",
	);
	assert.ok(index > 0);
	assert.equal(navBarConfig.links[index - 1], LinkPreset.Archive);
	assert.equal(navBarConfig.links[index + 1], LinkPreset.Albums);
	const entry = navBarConfig.links[index];
	assert.ok(typeof entry !== "number");
	assert.equal(entry.name, "游戏");
	assert.ok(!entry.external);
});
test("game destinations remain unset until supplied and reject unsafe external schemes", () => {
	for (const value of [
		"",
		" ",
		"#",
		"/games/",
		"javascript:alert(1)",
		"data:text/html,test",
		"//example.com",
		"https://user:password@example.com",
		"https://example.com/\nfile",
		"https://example.com/%0afoo",
		"not a url",
	])
		assert.equal(resolveGameDestination(value), null, value);
	assert.equal(
		resolveGameDestination("https://pan.example.com/share?password=code"),
		"https://pan.example.com/share?password=code",
	);
	assert.equal(
		resolveGameDestination("http://example.com/file"),
		"http://example.com/file",
	);
});
test("cards have only a cover and title, not fake links or modal/details UI", () => {
	const card = read("src/components/features/games/GameCard.astro");
	assert.match(card, /resolveGameDestination/);
	assert.match(card, /href\s*\?\s*["']a["']\s*:\s*["']article["']/);
	assert.match(card, /<img/);
	assert.match(card, /<h2/);
	assert.match(card, /loading="lazy"/);
	assert.doesNotMatch(
		card,
		/href=["']#["']|<p\b|<button\b|modal|description|score|status|downloadLink/,
	);
	const page = read("src/pages/games.astro");
	assert.match(page, /<MainGridLayout/);
	assert.match(page, /<GameCard/);
	assert.doesNotMatch(page, /FilterTabs|game-modal/);
});
test("game titles use the existing theme-aware text colors",()=>{
	const source=read("src/components/features/games/GameCard.astro");
	assert.match(source,/class="game-card text-90"/);
	assert.doesNotMatch(source,/color:var\(--deep-text\)/);
});
