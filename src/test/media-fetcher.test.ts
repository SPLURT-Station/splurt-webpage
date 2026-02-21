import { describe, expect, mock, test } from "bun:test";
import type { MediaConfig } from "../utils/media-config";
import { fetchImagesFromUrl, fetchMediaItems } from "../utils/media-fetcher";

// Top-level regex pattern for performance
const TXT_FILE_REGEX = /\.txt$/iu;

// Mock HTML directory listing
const mockDirectoryListing = `
<!DOCTYPE html>
<html>
<head><title>Index of /images</title></head>
<body>
<h1>Index of /images</h1>
<ul>
<li><a href="splashscreen1.png">splashscreen1.png</a> 02-Jan-2024 12:00 100000</li>
<li><a href="splashscreen2.png">splashscreen2.png</a> 03-Jan-2024 12:00 200000</li>
<li><a href="screenshot1.png">screenshot1.png</a> 04-Jan-2024 12:00 150000</li>
<li><a href="screenshot2.jpg">screenshot2.jpg</a> 05-Jan-2024 12:00 250000</li>
<li><a href="../">../</a></li>
<li><a href="other-file.txt">other-file.txt</a> 06-Jan-2024 12:00 5000</li>
</ul>
</body>
</html>
`;

describe("Media Fetcher Utilities", () => {
	describe("fetchImagesFromUrl", () => {
		test("should parse directory listing and extract images", async () => {
			// Mock global fetch
			global.fetch = mock((url: string | Request) => {
				let urlStr = "";
				if (typeof url === "string") {
					urlStr = url;
				} else if (url instanceof Request) {
					urlStr = url.url;
				}
				try {
					const parsedUrl = new URL(urlStr);
					if (parsedUrl.hostname === "example.com") {
						return Promise.resolve(
							new Response(mockDirectoryListing, {
								status: 200,
								headers: { "Content-Type": "text/html" },
							})
						);
					}
				} catch {
					// If URL parsing fails, fall through to rejection below.
				}
				return Promise.reject(new Error("Unexpected URL"));
			}) as unknown as typeof fetch;

			const items = await fetchImagesFromUrl(
				"https://example.com/images",
				["*.png", "*.jpg"],
				10
			);

			expect(items).toBeInstanceOf(Array);
			expect(items.length).toBeGreaterThan(0);

			// Check that all items have required fields
			for (const item of items) {
				expect(item).toHaveProperty("url");
				expect(item).toHaveProperty("name");
				expect(item).toHaveProperty("alt");
				expect(typeof item.url).toBe("string");
				expect(typeof item.name).toBe("string");
				expect(typeof item.alt).toBe("string");
			}
		});

		test("should filter by patterns", async () => {
			global.fetch = mock(
				async () =>
					new Response(mockDirectoryListing, {
						status: 200,
						headers: { "Content-Type": "text/html" },
					})
			) as unknown as typeof fetch;

			const items = await fetchImagesFromUrl(
				"https://example.com/images",
				["*splashscreen*"],
				10
			);

			// Should only include splashscreen files
			for (const item of items) {
				expect(item.name.toLowerCase()).toContain("splashscreen");
			}
		});

		test("should limit results by maxImages", async () => {
			global.fetch = mock(
				async () =>
					new Response(mockDirectoryListing, {
						status: 200,
						headers: { "Content-Type": "text/html" },
					})
			) as unknown as typeof fetch;

			const items = await fetchImagesFromUrl(
				"https://example.com/images",
				["*.png", "*.jpg"],
				2
			);

			expect(items.length).toBeLessThanOrEqual(2);
		});

		test("should handle fetch errors", () => {
			global.fetch = mock(
				async () => new Response("Not Found", { status: 404 })
			) as unknown as typeof fetch;

			return expect(
				fetchImagesFromUrl("https://example.com/images", ["*.png"], 10)
			).rejects.toThrow();
		});

		test("should exclude directories", async () => {
			global.fetch = mock(
				async () =>
					new Response(mockDirectoryListing, {
						status: 200,
						headers: { "Content-Type": "text/html" },
					})
			) as unknown as typeof fetch;

			const items = await fetchImagesFromUrl(
				"https://example.com/images",
				["*"],
				10
			);

			// Should not include directory links
			for (const item of items) {
				expect(item.url).not.toContain("../");
				expect(item.name).not.toBe("../");
			}
		});

		test("should exclude non-image files", async () => {
			global.fetch = mock(
				async () =>
					new Response(mockDirectoryListing, {
						status: 200,
						headers: { "Content-Type": "text/html" },
					})
			) as unknown as typeof fetch;

			const items = await fetchImagesFromUrl(
				"https://example.com/images",
				["*.png", "*.jpg"],
				10
			);

			// Should not include .txt files
			for (const item of items) {
				expect(item.name).not.toMatch(TXT_FILE_REGEX);
			}
		});
	});

	describe("fetchMediaItems", () => {
		test("should fetch from URL source", async () => {
			global.fetch = mock(
				async () =>
					new Response(mockDirectoryListing, {
						status: 200,
						headers: { "Content-Type": "text/html" },
					})
			) as unknown as typeof fetch;

			const config: MediaConfig = {
				splashSource: {
					sourceType: "url",
					baseUrl: "https://example.com/splash",
					patterns: ["*splashscreen*"],
				},
				screenshotSource: {
					sourceType: "url",
					baseUrl: "https://example.com/screenshots",
					patterns: ["*.png", "*.jpg"],
				},
				maxImages: 10,
				cacheDuration: 3600,
			};

			const result = await fetchMediaItems(config);

			expect(result).toHaveProperty("splashScreens");
			expect(result).toHaveProperty("screenshots");
			expect(Array.isArray(result.splashScreens)).toBe(true);
			expect(Array.isArray(result.screenshots)).toBe(true);
		});

		test("should throw error when baseUrl is missing for url source", () => {
			const config = {
				splashSource: {
					sourceType: "url" as const,
					patterns: ["*.png"],
				},
				screenshotSource: {
					sourceType: "url" as const,
					baseUrl: "https://example.com/screenshots",
					patterns: ["*.png"],
				},
				maxImages: 10,
				cacheDuration: 3600,
			} as MediaConfig;

			return expect(fetchMediaItems(config)).rejects.toThrow();
		});

		test("should throw error when localFolder is missing for folder source", () => {
			// This will only work server-side
			// We test that it throws the expected error
			const config = {
				splashSource: {
					sourceType: "folder" as const,
					patterns: ["*.png"],
				},
				screenshotSource: {
					sourceType: "folder" as const,
					patterns: ["*.png"],
				},
				maxImages: 10,
				cacheDuration: 3600,
			} as MediaConfig;

			return expect(fetchMediaItems(config)).rejects.toThrow();
		});

		test("should handle unknown source type", () => {
			const config = {
				splashSource: {
					sourceType: "unknown" as "url" | "folder",
					patterns: ["*.png"],
				},
				screenshotSource: {
					sourceType: "url" as "url" | "folder",
					baseUrl: "https://example.com/screenshots",
					patterns: ["*.png"],
				},
				maxImages: 10,
				cacheDuration: 3600,
			} as MediaConfig;

			return expect(fetchMediaItems(config)).rejects.toThrow();
		});
	});
});
