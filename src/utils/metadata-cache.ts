/**
 * Image metadata cache utility
 * Caches image metadata to avoid re-processing images
 * Cache is invalidated when images are updated (same logic as image optimization cache)
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
import { generateMetadataHash } from "./image-cache";
import type { ImageMetadataInfo } from "./image-metadata";
import type { MediaItem } from "./media-fetcher";

// Cache directory relative to project root
const METADATA_CACHE_DIR = ".astro/metadata-cache";

/**
 * Generate a hash from an image URL for use as cache key
 */
function generateImageUrlHash(imageUrl: string): string {
	const hash = createHash("sha256");
	hash.update(imageUrl);
	return hash.digest("hex");
}

/**
 * Get cache directory path
 */
async function getCacheDir(): Promise<string> {
	const currentFile = fileURLToPath(import.meta.url);
	const utilsDir = dirname(currentFile);
	const srcDir = dirname(utilsDir);
	const projectRoot = dirname(srcDir);
	const cachePath = join(projectRoot, METADATA_CACHE_DIR);

	// Ensure cache directory exists
	await mkdir(cachePath, { recursive: true });

	return cachePath;
}

/**
 * Get cache file path for a specific metadata hash and image URL hash
 * Files are named: {metadataHash}-{imageUrlHash}.json
 */
async function getMetadataCacheFilePath(
	metadataHash: string,
	imageUrlHash: string
): Promise<string> {
	const cacheDir = await getCacheDir();
	return join(cacheDir, `${metadataHash}-${imageUrlHash}.json`);
}

/**
 * Get the current metadata hash (from image cache system)
 * This represents the current state of all images
 */
function getCurrentMetadataHash(
	splashScreens: MediaItem[],
	screenshots: MediaItem[]
): string {
	return generateMetadataHash(splashScreens, screenshots);
}

/**
 * Check if cached metadata exists for an image URL
 * Also validates that the cache is still valid (images haven't changed)
 */
export async function hasCachedMetadata(
	imageUrl: string,
	splashScreens: MediaItem[],
	screenshots: MediaItem[]
): Promise<boolean> {
	try {
		const currentHash = getCurrentMetadataHash(splashScreens, screenshots);
		const imageUrlHash = generateImageUrlHash(imageUrl);
		const cachePath = await getMetadataCacheFilePath(currentHash, imageUrlHash);
		await stat(cachePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Cache entry structure
 * Used to distinguish between "not cached" and "cached as null"
 */
type CacheEntry = {
	metadata: ImageMetadataInfo | null;
	_cached: true; // Marker to indicate this is a cache entry
};

/**
 * Load cached metadata for an image URL
 * Returns the cached metadata if it exists (even if null), or undefined if not cached
 */
export async function loadCachedMetadata(
	imageUrl: string,
	splashScreens: MediaItem[],
	screenshots: MediaItem[]
): Promise<ImageMetadataInfo | null | undefined> {
	try {
		const currentHash = getCurrentMetadataHash(splashScreens, screenshots);
		const imageUrlHash = generateImageUrlHash(imageUrl);
		const cachePath = await getMetadataCacheFilePath(currentHash, imageUrlHash);

		const cacheContent = await readFile(cachePath, "utf-8");
		const cacheEntry = JSON.parse(cacheContent) as CacheEntry;

		// If it's a cache entry, return the metadata (which may be null)
		if (cacheEntry._cached === true) {
			return cacheEntry.metadata;
		}

		// Legacy format: if it's just ImageMetadataInfo, return it
		// This handles old cache files that don't have the wrapper
		return cacheEntry as unknown as ImageMetadataInfo;
	} catch {
		// File doesn't exist or read failed - not cached
		return;
	}
}

/**
 * Save metadata to cache for an image URL
 * Also caches null metadata to avoid re-processing images with no metadata
 */
export async function saveCachedMetadata(
	imageUrl: string,
	metadata: ImageMetadataInfo | null,
	splashScreens: MediaItem[],
	screenshots: MediaItem[]
): Promise<void> {
	try {
		const currentHash = getCurrentMetadataHash(splashScreens, screenshots);
		const imageUrlHash = generateImageUrlHash(imageUrl);
		const cachePath = await getMetadataCacheFilePath(currentHash, imageUrlHash);

		// Save metadata to cache file (even if null)
		// Use a wrapper to distinguish between "not cached" and "cached as null"
		const cacheEntry: CacheEntry = {
			metadata,
			_cached: true,
		};

		await writeFile(cachePath, JSON.stringify(cacheEntry, null, 2), "utf-8");
	} catch (error) {
		console.warn("Failed to save cached metadata:", error);
		// Don't throw - caching is optional
	}
}

/**
 * Clear stale cache files that don't match the current metadata hash
 * Cache files are named {metadataHash}-{imageUrlHash}.json, so we can detect
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
			// Files are named: {metadataHash}-{imageUrlHash}.json
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
		console.warn("Failed to clear stale metadata cache files:", error);
	}
}

/**
 * Invalidate metadata cache when images are updated
 * Clears all cached metadata that doesn't match the current metadata hash
 */
export async function invalidateMetadataCache(
	splashScreens: MediaItem[],
	screenshots: MediaItem[]
): Promise<void> {
	const currentHash = getCurrentMetadataHash(splashScreens, screenshots);
	await clearStaleCacheFiles(currentHash);
}

/**
 * Ensure stale cache files are cleared (called when cache is first created)
 * This is effectively the same as invalidateMetadataCache since we use hash-based filenames
 */
export async function ensureMetadataHash(
	splashScreens: MediaItem[],
	screenshots: MediaItem[]
): Promise<void> {
	await invalidateMetadataCache(splashScreens, screenshots);
}
