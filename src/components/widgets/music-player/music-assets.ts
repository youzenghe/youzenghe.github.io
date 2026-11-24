export function isLocalMusicAssetPath(path: unknown): path is string {
	if (typeof path !== "string" || !path.trim()) return false;
	for (const character of path) {
		const code = character.charCodeAt(0);
		if (code < 32 || code === 127 || character === "\\") return false;
	}
	const value = path.trim();
	return (
		!value.startsWith("//") &&
		!/^[a-z][a-z\d+.-]*:/i.test(value) &&
		value !== "/"
	);
}

export function resolveLocalMusicAssetPath(path: string): string {
	if (!isLocalMusicAssetPath(path)) return "";
	const value = path.trim();
	return value.startsWith("/") ? value : `/${value}`;
}
