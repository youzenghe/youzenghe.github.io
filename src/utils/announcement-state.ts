interface AnnouncementStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): unknown;
}

function storageKey(content: string): string {
	return `announcementClosed:${encodeURIComponent(content)}`;
}

export function isAnnouncementDismissed(
	storage: AnnouncementStorage,
	content: string,
): boolean {
	try {
		return storage.getItem(storageKey(content)) === "true";
	} catch {
		return false;
	}
}

export function dismissAnnouncement(
	storage: AnnouncementStorage,
	content: string,
): void {
	try {
		storage.setItem(storageKey(content), "true");
	} catch {
		/* Closing still works without persistence. */
	}
}
