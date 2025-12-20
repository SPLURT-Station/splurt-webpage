/**
 * Image metadata cache utility
 * Caches image metadata to avoid re-processing images
 * Cache is invalidated when images are updated (same logic as image optimization cache)
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
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
 * Get cache file path for a specific image URL hash
 */
async function getMetadataCacheFilePath(imageUrlHash: string): Promise<string> {
	const cacheDir = await getCacheDir();
	return join(cacheDir, `${imageUrlHash}.json`);
}

/**
 * Get the metadata hash file path that tracks the current state of images
 * This is used to invalidate metadata cache when images change
 */
async function getMetadataHashFilePath(): Promise<string> {
	const cacheDir = await getCacheDir();
	return join(cacheDir, "metadata-hash.txt");
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
 * Get the stored metadata hash from cache
 * Returns null if no hash is stored (cache needs invalidation)
 */
async function getStoredMetadataHash(): Promise<string | null> {
	try {
		const hashPath = await getMetadataHashFilePath();
		const hash = await readFile(hashPath, "utf-8");
		return hash.trim();
	} catch {
		return null;
	}
}

/**
 * Store the current metadata hash
 */
async function storeMetadataHash(hash: string): Promise<void> {
	try {
		const hashPath = await getMetadataHashFilePath();
		await writeFile(hashPath, hash, "utf-8");
	} catch (error) {
		console.warn("Failed to store metadata hash:", error);
	}
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
		// Check if metadata hash matches (images haven't changed)
		const currentHash = getCurrentMetadataHash(splashScreens, screenshots);
		const storedHash = await getStoredMetadataHash();

		// If hashes don't match, cache is invalid
		if (storedHash !== currentHash) {
			return false;
		}

		// Check if cache file exists for this image
		const imageUrlHash = generateImageUrlHash(imageUrl);
		const cachePath = await getMetadataCacheFilePath(imageUrlHash);
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
 * Returns the cached metadata if it exists (even if null), or null if not cached
 */
export async function loadCachedMetadata(
	imageUrl: string
): Promise<ImageMetadataInfo | null | undefined> {
	try {
		const imageUrlHash = generateImageUrlHash(imageUrl);
		const cachePath = await getMetadataCacheFilePath(imageUrlHash);

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
	metadata: ImageMetadataInfo | null
): Promise<void> {
	try {
		const imageUrlHash = generateImageUrlHash(imageUrl);
		const cachePath = await getMetadataCacheFilePath(imageUrlHash);

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
 * Invalidate all metadata cache when images are updated
 * This should be called when the metadata hash changes
 */
export async function invalidateMetadataCache(
	splashScreens: MediaItem[],
	screenshots: MediaItem[]
): Promise<void> {
	try {
		const currentHash = getCurrentMetadataHash(splashScreens, screenshots);
		const storedHash = await getStoredMetadataHash();

		// If hashes match, no invalidation needed
		if (storedHash === currentHash) {
			return;
		}

		// Hashes don't match - clear all cached metadata files
		const cacheDir = await getCacheDir();
		const { readdir } = await import("node:fs/promises");

		const files = await readdir(cacheDir);
		for (const file of files) {
			// Don't delete the metadata-hash.txt file itself
			if (file === "metadata-hash.txt") {
				continue;
			}

			// Delete all metadata cache files
			if (file.endsWith(".json")) {
				try {
					await unlink(join(cacheDir, file));
				} catch (error) {
					console.warn(`Failed to delete cache file ${file}:`, error);
				}
			}
		}

		// Update stored hash to current hash
		await storeMetadataHash(currentHash);
	} catch (error) {
		console.warn("Failed to invalidate metadata cache:", error);
		// Don't throw - cache invalidation is best-effort
	}
}

/**
 * Ensure metadata hash is stored (called when cache is first created)
 */
export async function ensureMetadataHash(
	splashScreens: MediaItem[],
	screenshots: MediaItem[]
): Promise<void> {
	try {
		const storedHash = await getStoredMetadataHash();
		if (!storedHash) {
			// No hash stored yet - store current hash
			const currentHash = getCurrentMetadataHash(splashScreens, screenshots);
			await storeMetadataHash(currentHash);
		}
	} catch (error) {
		console.warn("Failed to ensure metadata hash:", error);
	}
}
