/** Only user-supplied HTTP(S) destinations are actionable game links. */
export function resolveGameDestination(value: string): string | null {
	if (
		!value ||
		!/^https?:\/\//i.test(value) ||
		/[\u0000-\u0020\u007f]/.test(value) ||
		/%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(value)
	)
		return null;
	try {
		const url = new URL(value);
		if (
			!["http:", "https:"].includes(url.protocol) ||
			!url.hostname ||
			url.username ||
			url.password
		)
			return null;
		return url.href;
	} catch {
		return null;
	}
}
