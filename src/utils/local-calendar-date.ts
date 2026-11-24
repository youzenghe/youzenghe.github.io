export interface LocalCalendarDate {
	year: number;
	month: number;
	day: number;
}

export function localCalendarDate(date: Date): LocalCalendarDate {
	return {
		year: date.getFullYear(),
		month: date.getMonth(),
		day: date.getDate(),
	};
}

/** Follow today's month only when the user is not browsing a historical view. */
export function advanceCalendarMonth(
	view: { year: number; month: number },
	previous: LocalCalendarDate,
	current: LocalCalendarDate,
	canFollow: boolean,
) {
	return canFollow &&
		view.year === previous.year &&
		view.month === previous.month
		? { year: current.year, month: current.month }
		: view;
}
