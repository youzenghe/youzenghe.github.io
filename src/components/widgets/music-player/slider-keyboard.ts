export function sliderKeyboardValue(
	key: string,
	current: number,
	min: number,
	max: number,
	step: number,
): number | null {
	if (
		![current, min, max, step].every(Number.isFinite) ||
		max <= min ||
		step <= 0
	)
		return null;
	let value: number;
	switch (key) {
		case "ArrowLeft":
		case "ArrowDown":
			value = current - step;
			break;
		case "ArrowRight":
		case "ArrowUp":
			value = current + step;
			break;
		case "PageDown":
			value = current - step * 10;
			break;
		case "PageUp":
			value = current + step * 10;
			break;
		case "Home":
			value = min;
			break;
		case "End":
			value = max;
			break;
		default:
			return null;
	}
	return Math.max(min, Math.min(max, value));
}
