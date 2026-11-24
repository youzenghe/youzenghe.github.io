import type { APIRoute } from "astro";
import { buildRobots } from "../utils/crawler-policy.mjs";

export const GET: APIRoute = () => {
	return new Response(buildRobots(import.meta.env.SITE), {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
};
