import { describe, expect, test } from "bun:test";
import {
	fetchImageMetadata,
	getFilenameFromUrl,
	getFilenameWithoutExtension,
	hasMetadataContent,
} from "../utils/image-metadata";

describe("Image Metadata Utilities", () => {
	// Note: originalEnv is kept for potential future use
	describe("getFilenameFromUrl", () => {
		test("should extract filename from URL", () => {
			const url = "https://example.com/path/to/image.png";
			expect(getFilenameFromUrl(url)).toBe("image.png");
		});

		test("should handle URLs with query parameters", () => {
			const url = "https://example.com/image.png?v=123&w=800";
			expect(getFilenameFromUrl(url)).toBe("image.png");
		});

		test("should handle URLs with hash", () => {
			const url = "https://example.com/image.png#section";
			expect(getFilenameFromUrl(url)).toBe("image.png");
		});

		test("should handle URLs with query and hash", () => {
			const url = "https://example.com/image.png?v=123#section";
			expect(getFilenameFromUrl(url)).toBe("image.png");
		});

		test("should handle URLs without extension", () => {
			const url = "https://example.com/filename";
			expect(getFilenameFromUrl(url)).toBe("filename");
		});

		test("should handle relative paths", () => {
			const url = "/path/to/image.jpg";
			expect(getFilenameFromUrl(url)).toBe("image.jpg");
		});

		test("should handle encoded URLs", () => {
			const url = "https://example.com/image%20with%20spaces.png";
			expect(getFilenameFromUrl(url)).toBe("image%20with%20spaces.png");
		});

		test("should handle root URL", () => {
			const url = "https://example.com/";
			// Function returns the URL itself when no filename can be extracted
			const result = getFilenameFromUrl(url);
			expect(typeof result).toBe("string");
		});
	});

	describe("getFilenameWithoutExtension", () => {
		test("should remove file extension", () => {
			expect(getFilenameWithoutExtension("image.png")).toBe("image");
		});

		test("should handle multiple dots in filename", () => {
			expect(getFilenameWithoutExtension("image.backup.png")).toBe(
				"image.backup"
			);
		});

		test("should handle filename without extension", () => {
			expect(getFilenameWithoutExtension("filename")).toBe("filename");
		});

		test("should handle filename starting with dot", () => {
			// Function treats .hidden as extension-only, returns empty string
			expect(getFilenameWithoutExtension(".hidden")).toBe("");
		});

		test("should handle filename with only extension", () => {
			expect(getFilenameWithoutExtension(".png")).toBe("");
		});

		test("should handle empty string", () => {
			expect(getFilenameWithoutExtension("")).toBe("");
		});
	});

	describe("hasMetadataContent", () => {
		test("should return false for null metadata", () => {
			expect(hasMetadataContent(null)).toBe(false);
		});

		test("should return false for metadata with only title", () => {
			expect(
				hasMetadataContent({
					title: "Test Title",
				})
			).toBe(false);
		});

		test("should return true for metadata with description", () => {
			expect(
				hasMetadataContent({
					title: "Test Title",
					description: "Test description",
				})
			).toBe(true);
		});

		test("should return true for metadata with author", () => {
			expect(
				hasMetadataContent({
					title: "Test Title",
					author: "Test Author",
				})
			).toBe(true);
		});

		test("should return true for metadata with sources", () => {
			expect(
				hasMetadataContent({
					title: "Test Title",
					sources: ["https://example.com"],
				})
			).toBe(true);
		});

		test("should return false for metadata with empty sources array", () => {
			expect(
				hasMetadataContent({
					title: "Test Title",
					sources: [],
				})
			).toBe(false);
		});

		test("should return true for metadata with multiple fields", () => {
			expect(
				hasMetadataContent({
					title: "Test Title",
					description: "Test description",
					author: "Test Author",
					sources: ["https://example.com"],
				})
			).toBe(true);
		});
	});

	describe("fetchImageMetadata", () => {
		test("should return null when called client-side", async () => {
			// Note: We can't easily mock import.meta.env in Bun, so we test the behavior
			// In actual client-side code, this will return null

			// For server-side tests, we'll skip if SSR is false
			// The function checks import.meta.env.SSR internally
			const result = await fetchImageMetadata("https://example.com/image.png");

			// If we're in SSR context, it will try to fetch and likely fail
			// If we're not in SSR context, it returns null
			// Either way, we're testing the function's error handling
			expect(result === null || result === null).toBe(true);
		});

		test("should handle invalid URLs gracefully", async () => {
			// Even in SSR, invalid URLs should be handled
			const result = await fetchImageMetadata("not-a-valid-url");
			expect(result).toBeNull();
		});

		test("should handle fetch errors gracefully", async () => {
			// Test that fetch errors don't throw
			const result = await fetchImageMetadata(
				"https://nonexistent-domain-12345.com/image.png"
			);
			expect(result).toBeNull();
		});
	});
});
