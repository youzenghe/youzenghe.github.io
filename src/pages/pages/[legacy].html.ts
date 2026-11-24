import type { APIRoute } from "astro";
import { legacyRoutes } from "../../utils/legacy-navigation.mjs";
import legacySource from "../../utils/legacy-navigation.mjs?raw";

export function getStaticPaths() {
	return Object.entries(legacyRoutes).map(([legacy, route]) => ({
		params: { legacy },
		props: { route },
	}));
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export const GET: APIRoute = ({ params, props }) => {
	const route = props.route as {
		fallback: string;
		ids?: Record<string, string>;
	};
	const links = Object.entries(route.ids || {})
		.map(
			([id, href]) =>
				`<li><a href="${escapeHtml(href)}">查看原编号 ${escapeHtml(id)} 的文章</a></li>`,
		)
		.join("");
	const kind = JSON.stringify(params.legacy).replace(/</g, "\\u003c");
	const script = legacySource.replace(/<\/script/gi, "<\\/script");
	return new Response(
		`<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, follow"><title>正在进入次元日记</title>
</head><body>
<p>此页面的地址已更新，正在跳转。</p>
<p><a href="${escapeHtml(route.fallback)}">查看当前页面</a></p>
${links ? `<ul>${links}</ul>` : ""}
<script type="module">${script}
location.replace(resolveLegacyDestination(${kind}, location.search, location.hash));</script>
</body></html>`,
		{ headers: { "Content-Type": "text/html; charset=utf-8" } },
	);
};
