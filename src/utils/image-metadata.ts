/**
 * Image metadata utility functions
 * Handles reading and writing image metadata embedded in EXIF UserComment field
 */

import ExifReader from "exifreader";

// Top-level regex for path cleaning
const LEADING_SLASH_REGEX = /^\//;
const QUERY_PARAMS_REGEX = /[?#].*$/;
const AT_FS_PREFIX_REGEX = /^.*?@fs[\\/]/;
const WINDOWS_ABSOLUTE_PATH_REGEX = /^[A-Za-z]:[\\/]/;

export type ImageMetadataInfo = {
	/** Title of the image (required, falls back to filename) */
	title?: string;
	/** Description of the image */
	description?: string;
	/** Author information - can be plain text or HTML link */
	author?: string;
	/** List of source URLs where the image is posted */
	sources?: string[];
};

/**
 * Extract filename from URL or path
 */
export function getFilenameFromUrl(url: string): string {
	const urlWithoutQuery = url.split("?")[0].split("#")[0];
	const parts = urlWithoutQuery.split("/");
	const filename = parts.at(-1) || urlWithoutQuery;
	return filename;
}

/**
 * Get filename without extension for use as fallback title
 */
export function getFilenameWithoutExtension(filename: string): string {
	const lastDot = filename.lastIndexOf(".");
	if (lastDot === -1) {
		return filename;
	}
	return filename.substring(0, lastDot);
}

/**
 * Extract base64-encoded JSON from EXIF UserComment field
 * ExifReader.load() expects the full image buffer, not just the EXIF buffer
 */
function extractUserCommentFromImage(imageBuffer: Buffer): string | null {
	try {
		// ExifReader.load() expects the full image file buffer
		const tags = ExifReader.load(imageBuffer);

		// Access UserComment tag directly
		// biome-ignore lint/suspicious/noExplicitAny: ExifReader tag structure varies
		const userCommentTag = tags.UserComment as any;

		if (!userCommentTag) {
			return null;
		}

		// ExifReader provides .description which already contains the processed string
		// This is the base64-encoded JSON without the 8-byte header
		if (
			userCommentTag.description &&
			typeof userCommentTag.description === "string"
		) {
			return userCommentTag.description.trim();
		}

		// Fallback: if .description is not available, use .value
		// .value is an array of bytes that includes the 8-byte encoding header
		if (userCommentTag.value) {
			// Convert array to Buffer if needed
			let valueBuffer: Buffer | null = null;
			if (Array.isArray(userCommentTag.value)) {
				valueBuffer = Buffer.from(userCommentTag.value);
			} else if (Buffer.isBuffer(userCommentTag.value)) {
				valueBuffer = userCommentTag.value;
			}

			if (valueBuffer) {
				// UserComment format: "ASCII\0\0\0" (8 bytes) + actual data
				return valueBuffer.slice(8).toString("utf8").trim();
			}
		}

		return null;
	} catch {
		// EXIF parsing failed
		return null;
	}
}

/**
 * Read metadata from image buffer using ExifReader
 * ExifReader.load() expects the full image buffer, not just EXIF data
 */
function readMetadataWithSharp(
	buffer: Buffer
): Promise<ImageMetadataInfo | null> {
	try {
		// ExifReader.load() expects the full image buffer
		const base64Data = extractUserCommentFromImage(buffer);
		if (!base64Data) {
			return Promise.resolve(null);
		}

		// Decode base64 to get JSON string
		const jsonString = Buffer.from(base64Data, "base64").toString("utf8");
		const decodedMetadata = JSON.parse(jsonString) as ImageMetadataInfo;

		// Return if we have any metadata
		if (decodedMetadata.title) {
			return Promise.resolve(decodedMetadata);
		}
		if (decodedMetadata.description) {
			return Promise.resolve(decodedMetadata);
		}
		if (decodedMetadata.author) {
			return Promise.resolve(decodedMetadata);
		}
		if (decodedMetadata.sources && decodedMetadata.sources.length > 0) {
			return Promise.resolve(decodedMetadata);
		}

		return Promise.resolve(null);
	} catch {
		return Promise.resolve(null);
	}
}

/**
 * Read image metadata from a file path (server-side only)
 */
export async function readImageMetadataFromFile(
	filePath: string
): Promise<ImageMetadataInfo | null> {
	try {
		const { readFileSync } = await import("node:fs");
		const buffer = readFileSync(filePath);
		return await readMetadataWithSharp(buffer);
	} catch {
		return null;
	}
}

/**
 * Normalize image URL to extract the actual file path
 * Handles:
 * - Query parameters (strips them)
 * - @fs prefix (extracts path after @fs)
 * - Windows paths (handles backslashes)
 * - Relative paths starting with /
 */
function normalizeImagePath(imageUrl: string): string {
	// Strip query parameters and hash
	let path = imageUrl.replace(QUERY_PARAMS_REGEX, "");

	// Handle @fs prefix (Vite/Astro file system access)
	// Format: /@fs/F:/path/to/file or /@fs/F:\path\to\file
	if (path.includes("@fs")) {
		const match = path.match(AT_FS_PREFIX_REGEX);
		if (match) {
			// Extract everything after @fs/
			path = path.replace(AT_FS_PREFIX_REGEX, "");
		}
	}

	// Normalize path separators (handle both / and \)
	path = path.replace(/\\/g, "/");

	// Remove leading slash if present (for relative paths)
	path = path.replace(LEADING_SLASH_REGEX, "");

	return path;
}

/**
 * Check if a path is an absolute Windows path (e.g., F:\path or F:/path)
 */
function isWindowsAbsolutePath(path: string): boolean {
	// Match Windows drive letter pattern: C:, D:, F:, etc.
	return WINDOWS_ABSOLUTE_PATH_REGEX.test(path);
}

/**
 * Try to read metadata from a local file path
 * Returns the file path if it exists, null otherwise
 */
async function tryLocalFilePaths(
	normalizedPath: string
): Promise<string | null> {
	const { fileURLToPath } = await import("node:url");
	const { dirname, join, normalize } = await import("node:path");
	const { existsSync } = await import("node:fs");

	// If it's an absolute Windows path, use it directly
	if (isWindowsAbsolutePath(normalizedPath)) {
		const filePath = normalize(normalizedPath);
		if (existsSync(filePath)) {
			return filePath;
		}
		return null;
	}

	// Get project root
	const currentFile = fileURLToPath(import.meta.url);
	const utilsDir = dirname(currentFile);
	const srcDir = dirname(utilsDir);
	const projectRoot = dirname(srcDir);

	// Try multiple locations:
	// 1. Direct path from project root (for src/assets/images/...)
	// 2. public/urlPath (for files in public folder)
	// 3. urlPath (for files in project root, like screenshots/)
	const directPath = join(projectRoot, normalizedPath);
	const publicPath = join(projectRoot, "public", normalizedPath);
	const rootPath = join(projectRoot, normalizedPath);

	// Check which path exists and use that
	if (existsSync(directPath)) {
		return directPath;
	}
	if (existsSync(publicPath)) {
		return publicPath;
	}
	if (existsSync(rootPath)) {
		return rootPath;
	}

	return null;
}

/**
 * Fetch image metadata from embedded EXIF UserComment field
 * Optimized for local files - reads directly from filesystem when possible
 */
export async function fetchImageMetadata(
	imageUrl: string
): Promise<ImageMetadataInfo | null> {
	// Only works server-side
	if (typeof import.meta.env.SSR === "undefined" || !import.meta.env.SSR) {
		return null;
	}

	try {
		// Normalize the URL to extract the actual file path
		const normalizedPath = normalizeImagePath(imageUrl);

		// Check if it's a local file path (not http/https)
		if (!imageUrl.startsWith("http")) {
			const filePath = await tryLocalFilePaths(normalizedPath);
			if (filePath) {
				try {
					return await readImageMetadataFromFile(filePath);
				} catch {
					// If local file read fails, fall through to fetch
				}
			}
		}

		// For remote URLs or if local read failed, fetch the image
		// Use the original URL (with query params) for fetching
		const response = await fetch(imageUrl);
		if (!response.ok) {
			return null;
		}

		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		return await readMetadataWithSharp(buffer);
	} catch {
		return null;
	}
}

/**
 * Check if metadata has any content (excluding title which always shows)
 */
export function hasMetadataContent(
	metadata: ImageMetadataInfo | null
): boolean {
	if (!metadata) {
		return false;
	}
	return !!(
		metadata.description ||
		metadata.author ||
		(metadata.sources && metadata.sources.length > 0)
	);
}
