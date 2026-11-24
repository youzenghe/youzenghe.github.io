import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const read = (name) =>
	fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
test("device showcase implementation and public assets are removed", () => {
	for (const name of [
		"src/pages/devices.astro",
		"src/data/devices.ts",
		"src/components/features/devices/DeviceCard.astro",
		"public/js/devices-page-handler.js",
		"public/images/device",
	]) {
		assert.equal(
			fs.existsSync(new URL(`../${name}`, import.meta.url)),
			false,
			name,
		);
	}
});
test("navigation and feature flags do not expose a devices destination", () => {
	for (const name of [
		"src/config/navBarConfig.ts",
		"src/config/siteConfig.ts",
		"src/types/config.ts",
		"src/components/organisms/navigation/Navbar.astro",
		"src/components/organisms/navigation/DropdownMenu.astro",
		"src/components/organisms/navigation/NavMenuPanel.astro",
	]) {
		assert.doesNotMatch(
			read(name),
			/\/devices\/|\bDevices:\s*I18nKey|\bdevices:\s*(?:true|false|boolean)/,
			name,
		);
	}
});
