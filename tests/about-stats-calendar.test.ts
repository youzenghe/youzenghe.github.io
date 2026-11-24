import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import {
	advanceCalendarMonth,
	localCalendarDate,
} from "../src/utils/local-calendar-date.ts";

test("about-me represents the requested owner, not the original theme author", () => {
	const copy = fs.readFileSync(
		new URL("../src/content/spec/about-me.md", import.meta.url),
		"utf8",
	);
	for (const text of [
		"你好",
		"AAA乔瓮批发宝哥",
		"生活",
		"游戏",
		"Gal",
		"懒蛋",
		"纯前端",
		"GitHub",
		"后端",
		"AI",
		"汗颜",
	])
		assert.ok(copy.includes(text), text);
	assert.doesNotMatch(copy, /cv 方向|melodyecho|aicorein|律姐姐/);
});

test("statistics remove unsupported uptime and clearly identify the latest article date", () => {
	const source = fs.readFileSync(
		new URL(
			"../src/components/widgets/site-stats/SiteStats.astro",
			import.meta.url,
		),
		"utf8",
	);
	assert.doesNotMatch(
		source,
		/siteStartDate|running-days|Math\.abs|setInterval|siteStatsRunningDays/,
	);
	assert.match(source, /latest-post-date/);
	assert.match(source, /value: lastPostDate/);
	const config = fs.readFileSync(
		new URL("../src/config/siteConfig.ts", import.meta.url),
		"utf8",
	);
	assert.doesNotMatch(config, /siteStartDate/);
	const translation = fs.readFileSync(
		new URL("../src/i18n/languages/zh_CN.ts", import.meta.url),
		"utf8",
	);
	assert.match(translation, /\[Key\.siteStatsLastUpdate\]: "最新文章"/);
});

test("browser local date and following month advance across day/month/year boundaries", () => {
	assert.deepEqual(localCalendarDate(new Date(2026, 10, 30, 23, 59)), {
		year: 2026,
		month: 10,
		day: 30,
	});
	assert.deepEqual(
		advanceCalendarMonth(
			{ year: 2026, month: 10 },
			{ year: 2026, month: 10, day: 30 },
			{ year: 2026, month: 11, day: 1 },
			true,
		),
		{ year: 2026, month: 11 },
	);
	assert.deepEqual(
		advanceCalendarMonth(
			{ year: 2026, month: 11 },
			{ year: 2026, month: 11, day: 31 },
			{ year: 2027, month: 0, day: 1 },
			true,
		),
		{ year: 2027, month: 0 },
	);
	assert.deepEqual(
		advanceCalendarMonth(
			{ year: 2025, month: 2 },
			{ year: 2026, month: 10, day: 30 },
			{ year: 2026, month: 11, day: 1 },
			true,
		),
		{ year: 2025, month: 2 },
	);
	assert.deepEqual(
		advanceCalendarMonth(
			{ year: 2026, month: 10 },
			{ year: 2026, month: 10, day: 30 },
			{ year: 2026, month: 11, day: 1 },
			false,
		),
		{ year: 2026, month: 10 },
	);
});

test("calendar rechecks dates after focus and visibility changes with owned cleanup", () => {
	const source = fs.readFileSync(
		new URL(
			"../src/components/widgets/calendar/Calendar.svelte",
			import.meta.url,
		),
		"utf8",
	);
	assert.match(source, /advanceCalendarMonth/);
	for (const event of ["focus", "pageshow", "visibilitychange"]) {
		assert.ok(source.includes(`addEventListener("${event}"`), event);
		assert.ok(source.includes(`removeEventListener("${event}"`), event);
	}
});
