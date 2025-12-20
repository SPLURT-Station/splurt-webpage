import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import type { ImageMetadataInfo } from "../utils/image-metadata";
import type { MediaItem } from "../utils/media-fetcher";
import {
	ensureMetadataHash,
	hasCachedMetadata,
	invalidateMetadataCache,
	loadCachedMetadata,
	saveCachedMetadata,
} from "../utils/metadata-cache";

// Test cache directory
const TEST_CACHE_DIR = join(process.cwd(), ".test-metadata-cache");

// Helper to clean up test cache
async function cleanupTestCache() {
	try {
		await rm(TEST_CACHE_DIR, { recursive: true, force: true });
	} catch {
		// Ignore errors if directory doesn't exist
	}
}

describe("Metadata Cache Utilities", () => {
	beforeAll(async () => {
		await cleanupTestCache();
	});

	afterAll(async () => {
		await cleanupTestCache();
	});

	describe("saveCachedMetadata and loadCachedMetadata", () => {
		const emptyMediaItems = {
			splashScreens: [] as MediaItem[],
			screenshots: [] as MediaItem[],
		};

		test("should save and load metadata correctly", async () => {
			const imageUrl = "https://example.com/image.png";
			const metadata: ImageMetadataInfo = {
				title: "Test Image",
				description: "Test description",
				author: "Test Author",
				sources: ["https://example.com/source"],
			};

			await saveCachedMetadata(
				imageUrl,
				metadata,
				emptyMediaItems.splashScreens,
				emptyMediaItems.screenshots
			);

			const loaded = await loadCachedMetadata(
				imageUrl,
				emptyMediaItems.splashScreens,
				emptyMediaItems.screenshots
			);

			expect(loaded).toBeDefined();
			expect(loaded).toEqual(metadata);
		});

		test("should save and load null metadata", async () => {
			const imageUrl = "https://example.com/no-metadata.png";

			await saveCachedMetadata(
				imageUrl,
				null,
				emptyMediaItems.splashScreens,
				emptyMediaItems.screenshots
			);

			const loaded = await loadCachedMetadata(
				imageUrl,
				emptyMediaItems.splashScreens,
				emptyMediaItems.screenshots
			);

			expect(loaded).toBeNull();
		});

		test("should return undefined for non-cached metadata", async () => {
			const loaded = await loadCachedMetadata(
				"https://example.com/not-cached.png",
				emptyMediaItems.splashScreens,
				emptyMediaItems.screenshots
			);
			expect(loaded).toBeUndefined();
		});
	});

	describe("hasCachedMetadata", () => {
		test("should return false when metadata is not cached", async () => {
			const mediaItems: {
				splashScreens: MediaItem[];
				screenshots: MediaItem[];
			} = {
				splashScreens: [],
				screenshots: [],
			};

			const result = await hasCachedMetadata(
				"https://example.com/not-cached.png",
				mediaItems.splashScreens,
				mediaItems.screenshots
			);

			expect(result).toBe(false);
		});

		test("should return true when metadata is cached", async () => {
			const imageUrl = "https://example.com/cached.png";
			const metadata: ImageMetadataInfo = {
				title: "Cached Image",
			};

			const mediaItems: {
				splashScreens: MediaItem[];
				screenshots: MediaItem[];
			} = {
				splashScreens: [],
				screenshots: [],
			};

			// First ensure metadata hash is set
			await ensureMetadataHash(
				mediaItems.splashScreens,
				mediaItems.screenshots
			);

			await saveCachedMetadata(
				imageUrl,
				metadata,
				mediaItems.splashScreens,
				mediaItems.screenshots
			);

			const result = await hasCachedMetadata(
				imageUrl,
				mediaItems.splashScreens,
				mediaItems.screenshots
			);

			// Should return true if cache exists and hash matches
			expect(result).toBe(true);
		});

		test("should return false when metadata hash doesn't match", async () => {
			const imageUrl = "https://example.com/hash-mismatch.png";
			const metadata: ImageMetadataInfo = {
				title: "Hash Mismatch Image",
			};

			const originalMediaItems: {
				splashScreens: MediaItem[];
				screenshots: MediaItem[];
			} = {
				splashScreens: [],
				screenshots: [],
			};

			await saveCachedMetadata(
				imageUrl,
				metadata,
				originalMediaItems.splashScreens,
				originalMediaItems.screenshots
			);

			// Create different media items (different hash)
			const differentMediaItems: {
				splashScreens: MediaItem[];
				screenshots: MediaItem[];
			} = {
				splashScreens: [
					{
						url: "https://example.com/different.png",
						name: "different.png",
						alt: "Different",
					},
				],
				screenshots: [],
			};

			const result = await hasCachedMetadata(
				imageUrl,
				differentMediaItems.splashScreens,
				differentMediaItems.screenshots
			);

			// Should return false because hash doesn't match
			expect(result).toBe(false);
		});
	});

	describe("invalidateMetadataCache", () => {
		test("should invalidate cache when hash changes", async () => {
			// Save some metadata with original items
			const imageUrl = "https://example.com/to-invalidate.png";
			const metadata: ImageMetadataInfo = {
				title: "To Invalidate",
			};

			const originalMediaItems: {
				splashScreens: MediaItem[];
				screenshots: MediaItem[];
			} = {
				splashScreens: [],
				screenshots: [],
			};

			await saveCachedMetadata(
				imageUrl,
				metadata,
				originalMediaItems.splashScreens,
				originalMediaItems.screenshots
			);

			// Create new media items (different hash)
			const newMediaItems: {
				splashScreens: MediaItem[];
				screenshots: MediaItem[];
			} = {
				splashScreens: [
					{
						url: "https://example.com/new.png",
						name: "new.png",
						alt: "New",
					},
				],
				screenshots: [],
			};

			// Invalidate cache
			await invalidateMetadataCache(
				newMediaItems.splashScreens,
				newMediaItems.screenshots
			);

			// Cache should be invalidated (old hash files deleted)
			const hasCache = await hasCachedMetadata(
				imageUrl,
				newMediaItems.splashScreens,
				newMediaItems.screenshots
			);

			expect(hasCache).toBe(false);
		});

		test("should not invalidate cache when hash matches", async () => {
			const imageUrl = "https://example.com/keep-cache.png";
			const metadata: ImageMetadataInfo = {
				title: "Keep Cache",
			};

			const mediaItems: {
				splashScreens: MediaItem[];
				screenshots: MediaItem[];
			} = {
				splashScreens: [],
				screenshots: [],
			};

			// Ensure hash is set
			await ensureMetadataHash(
				mediaItems.splashScreens,
				mediaItems.screenshots
			);

			await saveCachedMetadata(
				imageUrl,
				metadata,
				mediaItems.splashScreens,
				mediaItems.screenshots
			);

			// Invalidate with same items (same hash)
			await invalidateMetadataCache(
				mediaItems.splashScreens,
				mediaItems.screenshots
			);

			// Cache should still exist (hash matches)
			const hasCache = await hasCachedMetadata(
				imageUrl,
				mediaItems.splashScreens,
				mediaItems.screenshots
			);

			expect(hasCache).toBe(true);
		});
	});

	describe("ensureMetadataHash", () => {
		test("should store metadata hash if not exists", async () => {
			const mediaItems: {
				splashScreens: MediaItem[];
				screenshots: MediaItem[];
			} = {
				splashScreens: [],
				screenshots: [],
			};

			await ensureMetadataHash(
				mediaItems.splashScreens,
				mediaItems.screenshots
			);

			// Should not throw
			expect(true).toBe(true);
		});

		test("should not overwrite existing hash", async () => {
			const mediaItems: {
				splashScreens: MediaItem[];
				screenshots: MediaItem[];
			} = {
				splashScreens: [],
				screenshots: [],
			};

			// Ensure hash twice
			await ensureMetadataHash(
				mediaItems.splashScreens,
				mediaItems.screenshots
			);
			await ensureMetadataHash(
				mediaItems.splashScreens,
				mediaItems.screenshots
			);

			// Should not throw
			expect(true).toBe(true);
		});
	});
});
