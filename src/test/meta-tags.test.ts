import { describe, expect, test } from "bun:test";
import { generateOGImageUrl, generateTwitterImageUrl } from "./meta-tags";

describe("Meta Tags Utilities", () => {
	const mockSite = "https://splurt.space";
	const mockOrigin = "https://splurt.space";

	describe("generateOGImageUrl", () => {
		test("should generate absolute URL from relative path", () => {
			const result = generateOGImageUrl(undefined, mockSite, mockOrigin);
			expect(result).toBe("https://splurt.space/splurtpaw2_alt3.png");
		});

		test("should use provided image if available", () => {
			const customImage = "/custom-image.png";
			const result = generateOGImageUrl(customImage, mockSite, mockOrigin);
			expect(result).toBe("https://splurt.space/custom-image.png");
		});

		test("should handle absolute image URLs", () => {
			const absoluteImage = "https://example.com/image.png";
			const result = generateOGImageUrl(absoluteImage, mockSite, mockOrigin);
			expect(result).toBe(absoluteImage);
		});

		test("should fall back to origin when site is not provided", () => {
			const result = generateOGImageUrl(undefined, undefined, mockOrigin);
			expect(result).toBe("https://splurt.space/splurtpaw2_alt3.png");
		});
	});

	describe("generateTwitterImageUrl", () => {
		test("should use logo strategy for Twitter", () => {
			const result = generateTwitterImageUrl(
				undefined,
				mockSite,
				mockOrigin,
				"logo"
			);
			expect(result).toBe("https://splurt.space/splurtpaw2_alt3.png");
		});

		test("should use provided image in logo strategy", () => {
			const customImage = "/custom-logo.png";
			const result = generateTwitterImageUrl(
				customImage,
				mockSite,
				mockOrigin,
				"logo"
			);
			expect(result).toBe("https://splurt.space/custom-logo.png");
		});

		test("should handle auto strategy", () => {
			const result = generateTwitterImageUrl(
				undefined,
				mockSite,
				mockOrigin,
				"auto"
			);
			expect(result).toBe("https://splurt.space/splurtpaw2_alt3.png");
		});
	});
});
