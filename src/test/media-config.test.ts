import { beforeEach, describe, expect, test } from "bun:test";

describe("Media Config Utilities", () => {
	beforeEach(() => {
		// Reset environment variables
		for (const key of Object.keys(process.env)) {
			if (key.startsWith("PUBLIC_MEDIA_") || key.startsWith("MEDIA_")) {
				delete process.env[key];
			}
		}
	});

	test("should parse patterns correctly", async () => {
		// This test is more of an integration test
		// Since getMediaConfig uses import.meta.env which is set at build time,
		// we test the behavior indirectly through the exported types

		// Import dynamically to avoid issues with import.meta.env
		const { getMediaConfig } = await import("../utils/media-config");

		// Test with default values (no env vars set)
		const config = getMediaConfig();

		expect(config).toBeDefined();
		expect(config.splashSource).toBeDefined();
		expect(config.screenshotSource).toBeDefined();
		expect(config.splashSource.patterns).toBeInstanceOf(Array);
		expect(config.screenshotSource.patterns).toBeInstanceOf(Array);
		expect(config.splashSource.patterns.length).toBeGreaterThan(0);
		expect(config.screenshotSource.patterns.length).toBeGreaterThan(0);
	});

	test("should have correct default patterns for splashscreens", async () => {
		const { getMediaConfig } = await import("../utils/media-config");
		const config = getMediaConfig();

		// Default patterns should include splashscreen keywords
		const hasSplashPattern = config.splashSource.patterns.some((p) =>
			p.toLowerCase().includes("splash")
		);
		expect(hasSplashPattern).toBe(true);
	});

	test("should have correct default patterns for screenshots", async () => {
		const { getMediaConfig } = await import("../utils/media-config");
		const config = getMediaConfig();

		// Default patterns should include image extensions
		const hasImageExt = config.screenshotSource.patterns.some((p) =>
			[".png", ".jpg", ".jpeg"].some((ext) => p.includes(ext))
		);
		expect(hasImageExt).toBe(true);
	});

	test("should have default maxImages", async () => {
		const { getMediaConfig } = await import("../utils/media-config");
		const config = getMediaConfig();

		expect(config.maxImages).toBeDefined();
		expect(typeof config.maxImages).toBe("number");
		expect(config.maxImages).toBeGreaterThan(0);
	});

	test("should have default cacheDuration", async () => {
		const { getMediaConfig } = await import("../utils/media-config");
		const config = getMediaConfig();

		expect(config.cacheDuration).toBeDefined();
		expect(typeof config.cacheDuration).toBe("number");
		expect(config.cacheDuration).toBeGreaterThan(0);
	});

	test("should return sourceType", async () => {
		const { getMediaConfig } = await import("../utils/media-config");
		const config = getMediaConfig();

		expect(config.splashSource.sourceType).toBeDefined();
		expect(["url", "folder"]).toContain(config.splashSource.sourceType);
		expect(config.screenshotSource.sourceType).toBeDefined();
		expect(["url", "folder"]).toContain(config.screenshotSource.sourceType);
	});
});
