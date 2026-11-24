import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { parse } from "node-html-parser";
import { getPageTOCElements, getPageTOCLabel } from "../src/utils/page-toc.ts";
import { TOCManager } from "../src/utils/tocManager.ts";

function fixture(html: string) {
	const root = parse(html);
	for (const node of root.querySelectorAll("*")) {
		Object.defineProperty(node, "parentElement", {
			get: () => (node.parentNode?.rawTagName ? node.parentNode : null),
		});
		Object.defineProperty(node, "cloneNode", {
			value: () => parse(node.outerHTML).firstChild,
		});
	}
	const previous = globalThis.getComputedStyle;
	globalThis.getComputedStyle = ((element: Element) => ({
		display: element.getAttribute("data-hidden") === "true" ? "none" : "block",
		visibility: "visible",
	})) as typeof getComputedStyle;
	return {
		scope: root.querySelector("#content-wrapper") as unknown as HTMLElement,
		restore: () => {
			globalThis.getComputedStyle = previous;
		},
	};
}
test("homepage directory uses article card titles and assigns stable fragment targets", () => {
	const f = fixture(
		'<div id="content-wrapper"><div data-page-toc="第一篇">Body</div><div id="known" data-page-toc="第二篇">Other body</div></div><h2 id="outside">Sidebar</h2>',
	);
	try {
		const entries = getPageTOCElements(f.scope);
		assert.deepEqual(entries.map(getPageTOCLabel), ["第一篇", "第二篇"]);
		assert.ok(entries[0].id);
		assert.equal(entries[1].id, "known");
		assert.deepEqual(
			getPageTOCElements(f.scope).map((e) => e.id),
			entries.map((e) => e.id),
		);
	} finally {
		f.restore();
	}
});
test("article body headings take priority without collecting sidebar or page chrome", () => {
	const f = fixture(
		'<div id="content-wrapper"><h1>Article title</h1><div class="custom-md"><h2 id="intro">Introduction<a class="anchor">#</a></h2><h3 id="body">Body</h3></div><div data-page-toc="Recommendation"></div></div>',
	);
	try {
		const entries = getPageTOCElements(f.scope);
		assert.deepEqual(
			entries.map((e) => e.id),
			["intro", "body"],
		);
		assert.equal(getPageTOCLabel(entries[0]), "Introduction");
	} finally {
		f.restore();
	}
});
test("non-article headings and explicit cards provide a fallback without duplicate nested labels", () => {
	const f = fixture(
		'<div id="content-wrapper"><h1>Games</h1><article data-page-toc="Game"><h2>Game</h2></article><h2>Downloads</h2><h2> </h2></div>',
	);
	try {
		assert.deepEqual(getPageTOCElements(f.scope).map(getPageTOCLabel), [
			"Games",
			"Game",
			"Downloads",
		]);
	} finally {
		f.restore();
	}
});
test("filtered or hidden page items do not stay in the directory", () => {
	const f = fixture(
		'<div id="content-wrapper"><div data-hidden="true"><h2>Hidden</h2></div><article data-page-toc="Visible"><h2>Nested</h2></article></div>',
	);
	try {
		assert.deepEqual(getPageTOCElements(f.scope).map(getPageTOCLabel), [
			"Visible",
		]);
	} finally {
		f.restore();
	}
});
test("card directory uses bounded internal scroll and lifecycle ownership", () => {
	const source = fs.readFileSync(
		new URL(
			"../src/components/widgets/card-toc/CardTOC.astro",
			import.meta.url,
		),
		"utf8",
	);
	assert.match(source, /height:\s*min\(/);
	assert.match(source, /overscroll-behavior:\s*contain/);
	assert.match(source, /overflow-y:\s*auto/);
	assert.match(source, /registerTOCPageLifecycle/);
	assert.match(source, /MutationObserver/);
	assert.match(source, /disconnect\(/);
});
test("requested GalGame title removes only 深思", () => {
	const body = fs.readFileSync(
		new URL("../src/content/posts/qiaoweng-galgame/index.md", import.meta.url),
		"utf8",
	);
	assert.match(body, /title: "我决定做一款关于乔瓮的 GalGame"/);
	assert.doesNotMatch(body, /title: "我深思/);
});
test("card-title directory labels and fragments are safe HTML", () => {
	const f = fixture(
		'<div id="content-wrapper"><div id="quoted&quot;id" data-page-toc="&lt;img src=x onerror=run()&gt;"></div></div>',
	);
	f.scope.querySelector("[data-page-toc]")!.id = 'quoted"id';
	const previous = globalThis.document;
	globalThis.document = { querySelector: () => f.scope } as unknown as Document;
	try {
		const html = new TOCManager({}).generateTOCHTML();
		assert.doesNotMatch(html, /<img\b|href="#quoted"id"/);
		assert.match(html, /&lt;img/);
		assert.match(html, /#quoted%22id/);
	} finally {
		globalThis.document = previous;
		f.restore();
	}
});
test('directory clicks scroll locally without also invoking the page router',()=>{
  const previousDocument=globalThis.document,previousWindow=globalThis.window;
  const calls:string[]=[];
  globalThis.document={getElementById:()=>({getBoundingClientRect:()=>({top:200})})} as unknown as Document;
  globalThis.window={pageYOffset:100,matchMedia:()=>({matches:true}),scrollTo:()=>calls.push('scroll')} as unknown as Window & typeof globalThis;
  try{new TOCManager({}).handleClick({preventDefault:()=>calls.push('prevent'),stopPropagation:()=>calls.push('stop'),currentTarget:{getAttribute:()=> '#target'}} as unknown as Event);assert.deepEqual(calls,['prevent','stop','scroll']);}finally{globalThis.document=previousDocument;globalThis.window=previousWindow;}
});
