/**
 * Astro Actions for media gallery
 * Provides type-safe, validated access to media fetching and image optimization
 */

import { ActionError, defineAction } from "astro:actions";
import { getImage, inferRemoteSize } from "astro:assets";
import { z } from "astro:schema";
import {
	generateMetadataHash,
	getOptimizationCacheKey,
	hasCachedImages,
	loadCachedImages,
	saveCachedImages,
} from "../utils/image-cache";
import { fetchImageMetadata } from "../utils/image-metadata";
import { getMediaConfig } from "../utils/media-config";
import type { MediaItem } from "../utils/media-fetcher";
import { fetchMediaItems } from "../utils/media-fetcher";
import {
	ensureMetadataHash,
	hasCachedMetadata,
	invalidateMetadataCache,
	loadCachedMetadata,
	saveCachedMetadata,
} from "../utils/metadata-cache";

/**
 * Get image dimensions, inferring from remote if needed
 */
async function getImageDimensions(
	url: string,
	providedWidth?: number,
	providedHeight?: number
): Promise<{ width: number; height: number }> {
	if (providedWidth && providedHeight) {
		return { width: providedWidth, height: providedHeight };
	}

	try {
		const dimensions = await inferRemoteSize(url);
		return {
			width: providedWidth || dimensions.width,
			height: providedHeight || dimensions.height,
		};
	} catch {
		// If inference fails, use default dimensions
		return {
			width: providedWidth || 600,
			height: providedHeight || 400,
		};
	}
}

/**
 * Normalize image URL for optimization
 */
function normalizeImageUrl(url: string): string {
	// Remote URLs are already normalized
	if (url.startsWith("http://") || url.startsWith("https://")) {
		return url;
	}

	// Local paths starting with / - construct absolute URL if origin available
	if (url.startsWith("/")) {
		const origin =
			import.meta.env.SITE || import.meta.env.PUBLIC_SITE_URL || "";
		return origin ? new URL(url, origin).href : url;
	}

	return url;
}

/**
 * Optimize a single image using Astro's image optimization
 */
async function optimizeImage(
	url: string,
	options: {
		width?: number;
		height?: number;
		quality?: number;
		format?: "webp" | "avif" | "png" | "jpg";
	} = {}
): Promise<string> {
	try {
		// Normalize URL (handle local paths)
		const normalizedUrl = normalizeImageUrl(url);

		const dimensions = await getImageDimensions(
			normalizedUrl,
			options.width,
			options.height
		);

		// Optimize the image using Astro's getImage
		const optimized = await getImage({
			src: normalizedUrl,
			width: dimensions.width,
			height: dimensions.height,
			quality: options.quality || 80,
			format: options.format || "webp",
		});

		return optimized.src;
	} catch (error) {
		// If optimization fails, return original URL
		console.warn(`Failed to optimize image ${url}:`, error);
		return url;
	}
}

/**
 * Optimize multiple images in parallel (with concurrency limit)
 */
async function optimizeImages(
	items: MediaItem[],
	options: {
		width?: number;
		quality?: number;
		format?: "webp" | "avif" | "png" | "jpg";
		maxConcurrent?: number;
	} = {}
): Promise<MediaItem[]> {
	const maxConcurrent = options.maxConcurrent || 5;
	const optimizedItems: MediaItem[] = [];

	// Process images in batches to avoid overwhelming the server
	for (let i = 0; i < items.length; i += maxConcurrent) {
		const batch = items.slice(i, i + maxConcurrent);
		const batchPromises = batch.map(async (item) => {
			const originalUrl = item.url; // Store original URL before optimization
			const optimizedUrl = await optimizeImage(originalUrl, {
				width: options.width || 600,
				quality: options.quality || 80,
				format: options.format || "webp",
			});

			return {
				...item,
				url: optimizedUrl,
				originalUrl, // Keep original URL for full-resolution zoom
			};
		});

		const batchResults = await Promise.all(batchPromises);
		optimizedItems.push(...batchResults);
	}

	return optimizedItems;
}

/**
 * Optimize media items with caching support
 */
async function optimizeMediaWithCache(
	data: { splashScreens: MediaItem[]; screenshots: MediaItem[] },
	optimizeOpts: {
		width?: number;
		quality?: number;
		format?: "webp" | "avif" | "png" | "jpg";
	}
): Promise<{
	splashScreens: MediaItem[];
	screenshots: MediaItem[];
}> {
	// Generate metadata hash to check if images have changed
	const metadataHash = generateMetadataHash(
		data.splashScreens,
		data.screenshots
	);

	// Generate cache key from optimization options
	const cacheKey = getOptimizationCacheKey(optimizeOpts);

	// Check if cached optimized images exist
	const hasCache = await hasCachedImages(metadataHash, cacheKey);

	if (hasCache) {
		// Load from cache
		const cached = await loadCachedImages(metadataHash, cacheKey, data);

		if (cached) {
			return cached;
		}
	}

	// Cache miss or invalid - optimize images
	const [optimizedSplashScreens, optimizedScreenshots] = await Promise.all([
		optimizeImages(data.splashScreens, optimizeOpts),
		optimizeImages(data.screenshots, optimizeOpts),
	]);

	const optimizedData = {
		splashScreens: optimizedSplashScreens,
		screenshots: optimizedScreenshots,
	};

	// Save to cache for future use
	await saveCachedImages(metadataHash, cacheKey, optimizedData);

	return optimizedData;
}

export const server = {
	/**
	 * Fetch media items (splashscreens and screenshots)
	 * Optionally optimizes images using Astro's image optimization
	 * Client-side handles caching - this always returns fresh data
	 */
	fetchMedia: defineAction({
		accept: "json",
		input: z.object({
			optimize: z.boolean().optional().default(true),
			optimizeOptions: z
				.object({
					width: z.number().optional(),
					quality: z.number().optional(),
					format: z.enum(["webp", "avif", "png", "jpg"]).optional(),
				})
				.optional(),
		}),
		handler: async (input) => {
			try {
				const config = getMediaConfig();

				// Validate source configurations
				const validateSource = (
					source: typeof config.splashSource,
					type: "splash" | "screenshot"
				) => {
					if (source.sourceType === "url" && !source.baseUrl) {
						throw new ActionError({
							code: "BAD_REQUEST",
							message: `${type}Source.baseUrl is required when sourceType is 'url'`,
						});
					}
					if (source.sourceType === "folder" && !source.localFolder) {
						throw new ActionError({
							code: "BAD_REQUEST",
							message: `${type}Source.localFolder is required when sourceType is 'folder'`,
						});
					}
				};

				validateSource(config.splashSource, "splash");
				validateSource(config.screenshotSource, "screenshot");

				// Always fetch fresh data to check for changes
				const data = await fetchMediaItems(config);

				// Invalidate metadata cache if images have changed
				// This ensures metadata cache stays in sync with image changes
				await invalidateMetadataCache(data.splashScreens, data.screenshots);
				// Ensure metadata hash is stored (for first-time setup)
				await ensureMetadataHash(data.splashScreens, data.screenshots);

				// If optimization is not requested, return unoptimized images
				if (!input.optimize) {
					return {
						splashScreens: data.splashScreens,
						screenshots: data.screenshots,
					};
				}

				// Optimize with caching
				const optimizeOpts = input.optimizeOptions || {
					width: 600,
					quality: 80,
					format: "webp" as const,
				};

				return await optimizeMediaWithCache(data, optimizeOpts);
			} catch (error) {
				console.error("Error fetching media:", error);

				if (error instanceof ActionError) {
					throw error;
				}

				throw new ActionError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						error instanceof Error ? error.message : "Failed to fetch media",
				});
			}
		},
	}),

	/**
	 * Optimize a single image URL
	 * Useful for on-demand optimization
	 */
	optimizeImage: defineAction({
		accept: "json",
		input: z.object({
			url: z.string().url(),
			width: z.number().optional(),
			height: z.number().optional(),
			quality: z.number().min(1).max(100).optional(),
			format: z.enum(["webp", "avif", "png", "jpg"]).optional(),
		}),
		handler: async (input) => {
			try {
				const optimizedUrl = await optimizeImage(input.url, {
					width: input.width,
					height: input.height,
					quality: input.quality,
					format: input.format,
				});

				return { url: optimizedUrl };
			} catch (error) {
				console.error("Error optimizing image:", error);

				throw new ActionError({
					code: "INTERNAL_SERVER_ERROR",
					message:
						error instanceof Error ? error.message : "Failed to optimize image",
				});
			}
		},
	}),

	/**
	 * Fetch image metadata on-demand
	 * Used for lazy loading metadata when user opens zoom modal
	 * Uses caching to avoid re-processing images
	 */
	fetchImageMetadata: defineAction({
		accept: "json",
		input: z.object({
			imageUrl: z.string(),
		}),
		handler: async (input) => {
			try {
				// Get current media items to validate cache
				// This is needed to check if cache is still valid
				const config = getMediaConfig();
				const data = await fetchMediaItems(config);

				// Check if cached metadata exists and is valid
				const hasCache = await hasCachedMetadata(
					input.imageUrl,
					data.splashScreens,
					data.screenshots
				);

				if (hasCache) {
					const cachedMetadata = await loadCachedMetadata(input.imageUrl);
					// cachedMetadata can be:
					// - undefined: not cached (shouldn't happen if hasCache is true, but handle it)
					// - null: cached as "no metadata found"
					// - ImageMetadataInfo: cached metadata
					if (cachedMetadata !== undefined) {
						return { metadata: cachedMetadata };
					}
				}

				// Cache miss or invalid - fetch metadata from image
				const metadata = await fetchImageMetadata(input.imageUrl);

				// Save to cache for future use (even if null - to avoid re-processing)
				await saveCachedMetadata(input.imageUrl, metadata);

				return { metadata: metadata || null };
			} catch (error) {
				console.error("Error fetching image metadata:", error);
				// Return null on error instead of throwing - metadata is optional
				return { metadata: null };
			}
		},
	}),
};
