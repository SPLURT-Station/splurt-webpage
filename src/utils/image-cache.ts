/**
 * Image optimization cache utility
 * Caches optimized images and metadata to avoid re-optimization
 */

import { createHash } from "node:crypto";
import {
	mkdir,
	readdir,
	readFile,
	stat,
	unlink,
	writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { MediaItem } from "./media-fetcher";

// Cache directory relative to project root
const CACHE_DIR = ".astro/image-cache";

/**
 * Generate a hash from media items metadata
 * This hash represents the state of the media items (names, URLs, sizes, dates)
 */
export function generateMetadataHash(
	splashScreens: MediaItem[],
	screenshots: MediaItem[]
): string {
	// Create a stable representation of the media items
	// Only include fields that represent the actual source state
	const metadata = {
		splashScreens: splashScreens.map((item) => ({
			url: item.url,
			name: item.name,
			size: item.size,
			lastModified: item.lastModified,
		})),
		screenshots: screenshots.map((item) => ({
			url: item.url,
			name: item.name,
			size: item.size,
			lastModified: item.lastModified,
		})),
	};

	// Sort to ensure consistent hashing
	const sorted = {
		splashScreens: metadata.splashScreens.sort((a, b) =>
			a.url.localeCompare(b.url)
		),
		screenshots: metadata.screenshots.sort((a, b) =>
			a.url.localeCompare(b.url)
		),
	};

	// Generate hash from stringified metadata
	const hash = createHash("sha256");
	hash.update(JSON.stringify(sorted));
	return hash.digest("hex");
}

/**
 * Generate a cache key for optimization options
 */
function generateCacheKey(options: {
	width?: number;
	quality?: number;
	format?: "webp" | "avif" | "png" | "jpg";
}): string {
	const opts = {
		width: options.width || 600,
		quality: options.quality || 80,
		format: options.format || "webp",
	};
	const hash = createHash("sha256");
	hash.update(JSON.stringify(opts));
	return hash.digest("hex").slice(0, 16);
}

/**
 * Get cache directory path
 */
async function getCacheDir(): Promise<string> {
	// Get project root (go up from src/utils to project root)
	// Convert file:// URL to filesystem path properly
	const currentFile = fileURLToPath(import.meta.url);
	const utilsDir = dirname(currentFile);
	const srcDir = dirname(utilsDir);
	const projectRoot = dirname(srcDir);
	const cachePath = join(projectRoot, CACHE_DIR);

	// Ensure cache directory exists
	await mkdir(cachePath, { recursive: true });

	return cachePath;
}

/**
 * Get cache file path for a specific metadata hash and cache key combination
 */
async function getCacheFilePath(
	metadataHash: string,
	cacheKey: string
): Promise<string> {
	const cacheDir = await getCacheDir();
	return join(cacheDir, `${metadataHash}-${cacheKey}.json`);
}

/**
 * Check if cached optimized images exist for the given metadata hash
 */
export async function hasCachedImages(
	metadataHash: string,
	cacheKey: string
): Promise<boolean> {
	try {
		const cachePath = await getCacheFilePath(metadataHash, cacheKey);
		await stat(cachePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Load cached optimized images
 */
export async function loadCachedImages(
	metadataHash: string,
	cacheKey: string,
	originalItems: { splashScreens: MediaItem[]; screenshots: MediaItem[] }
): Promise<{
	splashScreens: MediaItem[];
	screenshots: MediaItem[];
} | null> {
	try {
		const cachePath = await getCacheFilePath(metadataHash, cacheKey);

		// Read cache file
		const cacheContent = await readFile(cachePath, "utf-8");
		const cachedMetadata = JSON.parse(cacheContent) as {
			splashScreens: Array<{ originalUrl: string; optimizedUrl: string }>;
			screenshots: Array<{ originalUrl: string; optimizedUrl: string }>;
		};

		// Map cached URLs back to original items
		const mapCachedItems = (
			items: MediaItem[],
			cachedMappings: Array<{ originalUrl: string; optimizedUrl: string }>
		): MediaItem[] => {
			return items.map((item) => {
				const cached = cachedMappings.find((c) => c.originalUrl === item.url);
				if (cached) {
					return {
						...item,
						url: cached.optimizedUrl,
						originalUrl: item.url,
					};
				}
				// Fallback if mapping not found
				return {
					...item,
					originalUrl: item.url,
				};
			});
		};

		return {
			splashScreens: mapCachedItems(
				originalItems.splashScreens,
				cachedMetadata.splashScreens
			),
			screenshots: mapCachedItems(
				originalItems.screenshots,
				cachedMetadata.screenshots
			),
		};
	} catch (error) {
		console.warn("Failed to load cached images:", error);
		return null;
	}
}

/**
 * Save optimized images to cache
 */
export async function saveCachedImages(
	metadataHash: string,
	cacheKey: string,
	optimizedItems: {
		splashScreens: MediaItem[];
		screenshots: MediaItem[];
	}
): Promise<void> {
	try {
		const cachePath = await getCacheFilePath(metadataHash, cacheKey);

		// Create metadata mapping
		const metadata = {
			splashScreens: optimizedItems.splashScreens.map((item) => ({
				originalUrl: item.originalUrl || item.url,
				optimizedUrl: item.url,
			})),
			screenshots: optimizedItems.screenshots.map((item) => ({
				originalUrl: item.originalUrl || item.url,
				optimizedUrl: item.url,
			})),
		};

		// Save cache file
		await writeFile(cachePath, JSON.stringify(metadata, null, 2), "utf-8");
	} catch (error) {
		console.warn("Failed to save cached images metadata:", error);
		// Don't throw - caching is optional
	}
}

/**
 * Get cache key for optimization options
 */
export function getOptimizationCacheKey(options: {
	width?: number;
	quality?: number;
	format?: "webp" | "avif" | "png" | "jpg";
}): string {
	return generateCacheKey(options);
}

/**
 * Clear stale cache files that don't match the current metadata hash
 * Cache files are named {metadataHash}-{cacheKey}.json, so we can detect
 * stale files by checking if they start with a different hash prefix
 */
async function clearStaleCacheFiles(currentHash: string): Promise<void> {
	try {
		const cacheDir = await getCacheDir();
		const files = await readdir(cacheDir);

		for (const file of files) {
			// Only process JSON cache files
			if (!file.endsWith(".json")) {
				continue;
			}

			// Check if this file belongs to the current hash
			// Files are named: {metadataHash}-{cacheKey}.json
			if (!file.startsWith(`${currentHash}-`)) {
				// Stale cache file - delete it
				try {
					await unlink(join(cacheDir, file));
				} catch (error) {
					console.warn(`Failed to delete stale cache file ${file}:`, error);
				}
			}
		}
	} catch (error) {
		console.warn("Failed to clear stale cache files:", error);
	}
}

/**
 * Invalidate image cache when images are updated
 * Clears all cached optimization data that don't match the current metadata hash
 */
export async function invalidateImageCache(
	splashScreens: MediaItem[],
	screenshots: MediaItem[]
): Promise<void> {
	const currentHash = generateMetadataHash(splashScreens, screenshots);
	await clearStaleCacheFiles(currentHash);
}

/**
 * Ensure stale cache files are cleared (called when cache is first created)
 * This is effectively the same as invalidateImageCache since we use hash-based filenames
 */
export async function ensureImageCacheHash(
	splashScreens: MediaItem[],
	screenshots: MediaItem[]
): Promise<void> {
	await invalidateImageCache(splashScreens, screenshots);
}
