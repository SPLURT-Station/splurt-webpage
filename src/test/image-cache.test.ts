import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	generateMetadataHash,
	getOptimizationCacheKey,
	hasCachedImages,
	loadCachedImages,
	saveCachedImages,
} from "../utils/image-cache";
import type { MediaItem } from "../utils/media-fetcher";

// Top-level regex pattern for performance
const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/u;
const CACHE_KEY_HEX_REGEX = /^[a-f0-9]{16}$/u;

// Test cache directory
const TEST_CACHE_DIR = join(process.cwd(), ".test-image-cache");

// Helper to clean up test cache
async function cleanupTestCache() {
	try {
		await rm(TEST_CACHE_DIR, { recursive: true, force: true });
	} catch {
		// Ignore errors if directory doesn't exist
	}
}

describe("Image Cache Utilities", () => {
	beforeAll(async () => {
		await cleanupTestCache();
	});

	afterAll(async () => {
		await cleanupTestCache();
	});

	describe("generateMetadataHash", () => {
		test("should generate consistent hash for same input", () => {
			const items1: MediaItem[] = [
				{
					url: "https://example.com/image1.png",
					name: "image1.png",
					alt: "Image 1",
					size: 1000,
					lastModified: "2024-01-01T00:00:00Z",
				},
			];
			const items2: MediaItem[] = [];

			const hash1 = generateMetadataHash(items1, items2);
			const hash2 = generateMetadataHash(items1, items2);

			expect(hash1).toBe(hash2);
			expect(hash1).toMatch(SHA256_HEX_REGEX); // SHA256 hex
		});

		test("should generate different hash for different inputs", () => {
			const items1: MediaItem[] = [
				{
					url: "https://example.com/image1.png",
					name: "image1.png",
					alt: "Image 1",
				},
			];
			const items2: MediaItem[] = [
				{
					url: "https://example.com/image2.png",
					name: "image2.png",
					alt: "Image 2",
				},
			];

			const hash1 = generateMetadataHash(items1, []);
			const hash2 = generateMetadataHash([], items2);

			expect(hash1).not.toBe(hash2);
		});

		test("should be order-independent (sorts internally)", () => {
			const items1: MediaItem[] = [
				{
					url: "https://example.com/a.png",
					name: "a.png",
					alt: "A",
				},
				{
					url: "https://example.com/b.png",
					name: "b.png",
					alt: "B",
				},
			];
			const items2: MediaItem[] = [
				{
					url: "https://example.com/b.png",
					name: "b.png",
					alt: "B",
				},
				{
					url: "https://example.com/a.png",
					name: "a.png",
					alt: "A",
				},
			];

			const hash1 = generateMetadataHash(items1, []);
			const hash2 = generateMetadataHash(items2, []);

			expect(hash1).toBe(hash2);
		});

		test("should include relevant metadata fields", () => {
			const items1: MediaItem[] = [
				{
					url: "https://example.com/image1.png",
					name: "image1.png",
					alt: "Image 1",
					size: 1000,
					lastModified: "2024-01-01T00:00:00Z",
				},
			];
			const items2: MediaItem[] = [
				{
					url: "https://example.com/image1.png",
					name: "image1.png",
					alt: "Image 1",
					size: 2000, // Different size
					lastModified: "2024-01-01T00:00:00Z",
				},
			];

			const hash1 = generateMetadataHash(items1, []);
			const hash2 = generateMetadataHash(items2, []);

			expect(hash1).not.toBe(hash2);
		});
	});

	describe("getOptimizationCacheKey", () => {
		test("should generate consistent key for same options", () => {
			const key1 = getOptimizationCacheKey({
				width: 600,
				quality: 80,
				format: "webp",
			});
			const key2 = getOptimizationCacheKey({
				width: 600,
				quality: 80,
				format: "webp",
			});

			expect(key1).toBe(key2);
			expect(key1).toMatch(CACHE_KEY_HEX_REGEX); // 16 hex chars
		});

		test("should generate different keys for different options", () => {
			const key1 = getOptimizationCacheKey({ width: 600 });
			const key2 = getOptimizationCacheKey({ width: 800 });

			expect(key1).not.toBe(key2);
		});

		test("should use defaults for missing options", () => {
			const key1 = getOptimizationCacheKey({});
			const key2 = getOptimizationCacheKey({
				width: 600,
				quality: 80,
				format: "webp",
			});

			expect(key1).toBe(key2);
		});
	});

	describe("hasCachedImages", () => {
		test("should return false when cache doesn't exist", async () => {
			const result = await hasCachedImages(
				"nonexistent-hash",
				"nonexistent-key"
			);
			expect(result).toBe(false);
		});
	});

	describe("saveCachedImages and loadCachedImages", () => {
		test("should save and load cached images correctly", async () => {
			const metadataHash = "test-hash-123";
			const cacheKey = "test-key-456";

			const originalItems = {
				splashScreens: [
					{
						url: "https://example.com/splash1.png",
						name: "splash1.png",
						alt: "Splash 1",
					},
				] as MediaItem[],
				screenshots: [
					{
						url: "https://example.com/screenshot1.png",
						name: "screenshot1.png",
						alt: "Screenshot 1",
					},
				] as MediaItem[],
			};

			const optimizedItems = {
				splashScreens: [
					{
						...originalItems.splashScreens[0],
						url: "https://example.com/optimized/splash1.webp",
						originalUrl: originalItems.splashScreens[0].url,
					},
				] as MediaItem[],
				screenshots: [
					{
						...originalItems.screenshots[0],
						url: "https://example.com/optimized/screenshot1.webp",
						originalUrl: originalItems.screenshots[0].url,
					},
				] as MediaItem[],
			};

			// Save cache
			await saveCachedImages(metadataHash, cacheKey, optimizedItems);

			// Check cache exists
			const exists = await hasCachedImages(metadataHash, cacheKey);
			expect(exists).toBe(true);

			// Load cache
			const loaded = await loadCachedImages(
				metadataHash,
				cacheKey,
				originalItems
			);

			expect(loaded).not.toBeNull();
			if (loaded) {
				expect(loaded.splashScreens).toHaveLength(1);
				expect(loaded.splashScreens[0].url).toBe(
					optimizedItems.splashScreens[0].url
				);
				expect(loaded.splashScreens[0].originalUrl).toBe(
					originalItems.splashScreens[0].url
				);
				expect(loaded.screenshots).toHaveLength(1);
				expect(loaded.screenshots[0].url).toBe(
					optimizedItems.screenshots[0].url
				);
			}
		});

		test("should return null when cache file is corrupted", async () => {
			// Create a corrupted cache file
			const metadataHash = "corrupted-hash";
			const cacheKey = "corrupted-key";

			// Manually create a corrupted cache file
			const { fileURLToPath } = await import("node:url");
			const { dirname } = await import("node:path");
			const currentFile = fileURLToPath(import.meta.url);
			const utilsDir = dirname(currentFile);
			const srcDir = dirname(utilsDir);
			const projectRoot = dirname(srcDir);
			const cachePath = join(projectRoot, ".astro/image-cache");
			await mkdir(cachePath, { recursive: true });
			const cacheFilePath = join(cachePath, `${metadataHash}-${cacheKey}.json`);

			await writeFile(cacheFilePath, "invalid json", "utf-8");

			const originalItems = {
				splashScreens: [] as MediaItem[],
				screenshots: [] as MediaItem[],
			};

			// Try to load - should return null due to invalid JSON
			const loaded = await loadCachedImages(
				metadataHash,
				cacheKey,
				originalItems
			);

			// Clean up
			try {
				await rm(cacheFilePath, { force: true });
			} catch {
				// Ignore
			}

			// Should handle error gracefully
			expect(loaded).toBeNull();
		});

		test("should handle missing mappings gracefully", async () => {
			const metadataHash = "missing-mapping-hash";
			const cacheKey = "missing-mapping-key";

			// Create cache with different URLs than original items
			const optimizedItems = {
				splashScreens: [
					{
						url: "https://example.com/optimized/different.png",
						originalUrl: "https://example.com/different.png",
						name: "different.png",
						alt: "Different",
					},
				] as MediaItem[],
				screenshots: [] as MediaItem[],
			};

			await saveCachedImages(metadataHash, cacheKey, optimizedItems);

			const originalItems = {
				splashScreens: [
					{
						url: "https://example.com/original.png",
						name: "original.png",
						alt: "Original",
					},
				] as MediaItem[],
				screenshots: [] as MediaItem[],
			};

			// Load should handle missing mapping
			const loaded = await loadCachedImages(
				metadataHash,
				cacheKey,
				originalItems
			);

			expect(loaded).not.toBeNull();
			if (loaded) {
				// Should fall back to original URL if mapping not found
				expect(loaded.splashScreens[0].url).toBe(
					originalItems.splashScreens[0].url
				);
				expect(loaded.splashScreens[0].originalUrl).toBe(
					originalItems.splashScreens[0].url
				);
			}
		});
	});
});
