/**
 * Media fetcher utility functions
 * Handles fetching image lists from URLs or local folders
 */

// Top-level regex patterns for performance
const LINK_REGEX =
	/<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>\s*(\d{2}-[A-Z][a-z]{2}-\d{4}\s+\d{2}:\d{2})?\s*(\d+(?:,\d+)*)?/gi;
const IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
const FILE_EXT_REGEX = /\.[^/.]+$/;
const REPLACE_UNDERSCORE_REGEX = /[_-]/g;
const PUBLIC_FOLDER_REGEX = /^\.\/public\//;
const PUBLIC_FOLDER_REGEX_2 = /^public\//;

// Import and re-export types from media-config for backward compatibility
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { MediaConfig, MediaSourceConfig } from "./media-config";

export type {
	MediaConfig,
	MediaSourceConfig,
	MediaSourceType,
} from "./media-config";

import type { ImageMetadataInfo } from "./image-metadata";

export type MediaItem = {
	url: string;
	originalUrl?: string; // Original URL before optimization
	name: string;
	alt: string;
	size?: number;
	lastModified?: string;
	metadata?: ImageMetadataInfo; // Optional image metadata
};

/**
 * Convert a glob pattern to a regex pattern
 */
function patternToRegex(pattern: string): RegExp {
	// Escape special regex characters except * and ?
	const escaped = pattern
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, ".*")
		.replace(/\?/g, ".");

	return new RegExp(`^${escaped}$`, "i");
}

/**
 * Check if a filename matches any of the given patterns
 */
function matchesPattern(filename: string, patterns: string[]): boolean {
	if (patterns.length === 0) {
		return true;
	}

	return patterns.some((pattern) => {
		const regex = patternToRegex(pattern.trim());
		return regex.test(filename);
	});
}

/**
 * Parse HTML directory listing to extract file information
 * Handles Apache-style directory listings
 */
function isDirectory(href: string): boolean {
	return href === "../" || href === "/" || href.endsWith("/");
}

function isImageFile(href: string, filename: string): boolean {
	const hasImageExt = IMAGE_EXT_REGEX.test(href);
	const hasExtension = filename.includes(".");
	return hasImageExt || hasExtension;
}

function parseSize(sizeStr: string | undefined): number | undefined {
	if (!sizeStr) {
		return;
	}
	const cleanedSize = sizeStr.replace(/,/g, "");
	const sizeNum = Number.parseInt(cleanedSize, 10);
	if (Number.isNaN(sizeNum)) {
		return;
	}
	return sizeNum;
}

function createAltText(decodedHref: string): string {
	return decodedHref
		.replace(FILE_EXT_REGEX, "")
		.replace(REPLACE_UNDERSCORE_REGEX, " ")
		.replace(/%20/g, " ")
		.trim();
}

function parseMatchToItem(
	currentMatch: RegExpExecArray,
	baseUrl: string
): MediaItem | null {
	const href = currentMatch[1];
	const filename = currentMatch[2]?.trim() || "";
	const dateStr = currentMatch[3]?.trim();
	const sizeStr = currentMatch[4]?.trim();

	if (isDirectory(href)) {
		return null;
	}

	if (!isImageFile(href, filename)) {
		return null;
	}

	const decodedHref = decodeURIComponent(href);
	const fullUrl = new URL(decodedHref, baseUrl).href;
	const size = parseSize(sizeStr);
	const altText = createAltText(decodedHref);

	return {
		url: fullUrl,
		name: decodedHref,
		alt: altText,
		size,
		lastModified: dateStr,
	};
}

function parseWithDOM(html: string, baseUrl: string): MediaItem[] {
	if (typeof DOMParser === "undefined") {
		return [];
	}

	const parser = new DOMParser();
	const doc = parser.parseFromString(html, "text/html");
	const links = doc.querySelectorAll("a");
	const items: MediaItem[] = [];

	for (const link of links) {
		const href = link.getAttribute("href");
		if (!href || isDirectory(href)) {
			continue;
		}

		const decodedHref = decodeURIComponent(href);
		const fullUrl = new URL(decodedHref, baseUrl).href;
		const altText = decodedHref
			.replace(FILE_EXT_REGEX, "")
			.replace(REPLACE_UNDERSCORE_REGEX, " ");

		items.push({
			url: fullUrl,
			name: decodedHref,
			alt: altText,
		});
	}

	return items;
}

function parseDirectoryListing(html: string, baseUrl: string): MediaItem[] {
	const items: MediaItem[] = [];

	// Use regex to parse the directory listing format
	const matches: RegExpExecArray[] = [];
	LINK_REGEX.lastIndex = 0;

	let match = LINK_REGEX.exec(html);
	while (match !== null) {
		matches.push(match);
		match = LINK_REGEX.exec(html);
	}

	for (const currentMatch of matches) {
		const item = parseMatchToItem(currentMatch, baseUrl);
		if (item) {
			items.push(item);
		}
	}

	// Fallback: try DOM parsing if regex didn't work
	if (items.length === 0) {
		const domItems = parseWithDOM(html, baseUrl);
		items.push(...domItems);
	}

	return items;
}

/**
 * Fetch images from a URL directory listing
 */
export async function fetchImagesFromUrl(
	baseUrl: string,
	patterns: string[],
	maxImages?: number
): Promise<MediaItem[]> {
	try {
		const response = await fetch(baseUrl, {
			headers: {
				Accept: "text/html",
			},
		});

		if (!response.ok) {
			throw new Error(
				`Failed to fetch directory listing: ${response.statusText}`
			);
		}

		const html = await response.text();
		const allItems = parseDirectoryListing(html, baseUrl);

		// Filter by patterns
		const filtered = allItems.filter((item) =>
			matchesPattern(item.name, patterns)
		);

		// Sort by name (or lastModified if available) and limit
		const sorted = filtered.sort((a, b) => {
			if (a.lastModified && b.lastModified) {
				return (
					new Date(b.lastModified).getTime() -
					new Date(a.lastModified).getTime()
				);
			}
			return a.name.localeCompare(b.name);
		});

		return maxImages && maxImages > 0 ? sorted.slice(0, maxImages) : sorted;
	} catch (error) {
		console.error("Error fetching images from URL:", error);
		throw error;
	}
}

// Top-level regex for path cleaning
const LEADING_DOT_SLASH_REGEX = /^\.\//;

/**
 * Resolve folder path to absolute path
 */
function resolveFolderPath(folderPath: string): string {
	if (folderPath.startsWith("/")) {
		return folderPath;
	}

	// Get project root (go up from src/utils to project root)
	// Convert file:// URL to filesystem path properly
	const currentFile = fileURLToPath(import.meta.url);
	const utilsDir = dirname(currentFile);
	const srcDir = dirname(utilsDir);
	const projectRoot = dirname(srcDir);

	return join(projectRoot, folderPath.replace(LEADING_DOT_SLASH_REGEX, ""));
}

/**
 * Create URL path for an image file
 */
function createImageUrlPath(folderPath: string, fileName: string): string {
	if (folderPath.startsWith("/")) {
		return `${folderPath}/${fileName}`;
	}

	const cleanedPath = folderPath
		.replace(PUBLIC_FOLDER_REGEX, "")
		.replace(PUBLIC_FOLDER_REGEX_2, "");
	return `/${cleanedPath}/${fileName}`;
}

/**
 * Process a file and create a MediaItem if it matches
 */
function processFile(
	file: string,
	folderPath: string,
	patterns: string[]
): MediaItem | null {
	// Check if file matches patterns
	if (!matchesPattern(file, patterns)) {
		return null;
	}

	const urlPath = createImageUrlPath(folderPath, file);
	const altText = file
		.replace(FILE_EXT_REGEX, "")
		.replace(REPLACE_UNDERSCORE_REGEX, " ");

	return {
		url: urlPath,
		name: file,
		alt: altText,
	};
}

/**
 * Fetch images from a local folder (server-side only)
 * Uses Bun's optimized file system APIs
 * Note: Uses node:fs/promises which runs on Bun's optimized runtime when served with Bun
 */
export async function fetchImagesFromFolder(
	folderPath: string,
	patterns: string[],
	maxImages?: number
): Promise<MediaItem[]> {
	// This can only be called server-side in Astro
	if (typeof import.meta.env.SSR === "undefined" || !import.meta.env.SSR) {
		throw new Error("fetchImagesFromFolder can only be called server-side");
	}

	try {
		const resolvedPath = resolveFolderPath(folderPath);

		// Use Bun's optimized fs module (Node.js-compatible API, but runs on Bun's runtime)
		// When served with Bun, this uses Bun's optimized file system implementation
		const fs = await import("node:fs/promises");
		const files = await fs.readdir(resolvedPath);
		const items: MediaItem[] = [];

		for (const file of files) {
			// Check if it's a file (not a directory)
			const filePath = `${resolvedPath}/${file}`;
			const fileStat = await fs.stat(filePath);

			if (fileStat.isDirectory()) {
				continue;
			}

			const item = processFile(file, folderPath, patterns);
			if (item) {
				// Add file stats
				items.push({
					...item,
					size: fileStat.size,
					lastModified: fileStat.mtime.toISOString(),
				});
			}
		}

		// Sort by lastModified (newest first) or name
		const sorted = items.sort((a, b) => {
			if (a.lastModified && b.lastModified) {
				return (
					new Date(b.lastModified).getTime() -
					new Date(a.lastModified).getTime()
				);
			}
			return a.name.localeCompare(b.name);
		});

		return maxImages && maxImages > 0 ? sorted.slice(0, maxImages) : sorted;
	} catch (error) {
		console.error("Error reading folder:", error);
		throw error;
	}
}

// Metadata is now loaded lazily via Astro actions when user opens zoom modal
// This significantly improves initial page load performance

/**
 * Fetch media items from a source configuration
 */
async function fetchFromSource(
	source: MediaSourceConfig,
	maxImages?: number
): Promise<MediaItem[]> {
	let items: MediaItem[];

	if (source.sourceType === "url") {
		if (!source.baseUrl) {
			throw new Error("baseUrl is required when sourceType is 'url'");
		}
		items = await fetchImagesFromUrl(
			source.baseUrl,
			source.patterns,
			maxImages
		);
	} else if (source.sourceType === "folder") {
		if (!source.localFolder) {
			throw new Error("localFolder is required when sourceType is 'folder'");
		}
		items = await fetchImagesFromFolder(
			source.localFolder,
			source.patterns,
			maxImages
		);
	} else {
		throw new Error(`Unknown source type: ${source.sourceType}`);
	}

	// Metadata is now loaded lazily when needed (when user opens zoom modal)
	// This significantly improves initial page load performance
	return items;
}

/**
 * Fetch media items based on configuration
 * Supports separate sources for splashscreens and screenshots
 */
export async function fetchMediaItems(config: MediaConfig): Promise<{
	splashScreens: MediaItem[];
	screenshots: MediaItem[];
}> {
	const { splashSource, screenshotSource, maxImages } = config;

	// Fetch from separate sources in parallel
	const [splashScreens, screenshots] = await Promise.all([
		fetchFromSource(splashSource, maxImages),
		fetchFromSource(screenshotSource, maxImages),
	]);

	return { splashScreens, screenshots };
}
