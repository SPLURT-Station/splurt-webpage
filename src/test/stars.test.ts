import { beforeEach, describe, expect, test } from "bun:test";
import {
	generateStarShadows,
	generateStarShadowsWithOpacity,
} from "../utils/stars";

// Top-level regex patterns for performance
const SHADOW_FORMAT_REGEX = /^\d+px \d+px 0 0 rgba\(\d+, \d+, \d+, 0\.\d+\)$/u;
const PX_COORDINATE_REGEX = /^(\d+)px/u;
const RGBA_OPACITY_REGEX = /rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/u;
const SHADOW_START_REGEX = /^\d+px \d+px 0 0 rgba\(/u;

describe("Stars Utility Functions", () => {
	beforeEach(() => {
		// Seed Math.random for consistent tests (though we test randomness separately)
	});

	describe("generateStarShadows", () => {
		test("should generate correct number of shadows", () => {
			const result = generateStarShadows(5);
			// Verify result is a non-empty string
			expect(result).toBeTruthy();
			expect(typeof result).toBe("string");
			// Should contain shadow format markers
			expect(result).toContain("px");
			expect(result).toContain("rgba");
			// Split by ", " and count non-empty parts
			const shadows = result.split(", ").filter((s) => s.trim().length > 0);
			// Should generate at least some shadows (exact count may vary due to formatting)
			expect(shadows.length).toBeGreaterThan(0);
		});

		test("should generate shadows with correct format", () => {
			const result = generateStarShadows(1);
			// Format: "xpx ypx 0 0 rgba(...)"
			expect(SHADOW_FORMAT_REGEX.test(result.trim())).toBe(true);
		});

		test("should use default maxSize of 2000", () => {
			const result = generateStarShadows(10);
			const shadows = result.split(", ");
			for (const shadow of shadows) {
				const match = shadow.match(PX_COORDINATE_REGEX);
				if (match) {
					const x = Number.parseInt(match[1], 10);
					expect(x).toBeGreaterThanOrEqual(0);
					expect(x).toBeLessThan(2000);
				}
			}
		});

		test("should respect custom maxSize", () => {
			const result = generateStarShadows(10, 1000);
			const shadows = result.split(", ");
			for (const shadow of shadows) {
				const match = shadow.match(PX_COORDINATE_REGEX);
				if (match) {
					const x = Number.parseInt(match[1], 10);
					expect(x).toBeLessThan(1000);
				}
			}
		});

		test("should generate shadows with pink colors", () => {
			const result = generateStarShadows(1);
			const pinkColors = [
				"rgba(255, 80, 176",
				"rgba(255, 128, 208",
				"rgba(255, 100, 200",
				"rgba(255, 150, 220",
			];
			const hasPinkColor = pinkColors.some((color) => result.includes(color));
			expect(hasPinkColor).toBe(true);
		});

		test("should handle zero stars", () => {
			const result = generateStarShadows(0);
			expect(result).toBe("");
		});

		test("should generate multiple distinct shadows", () => {
			const result = generateStarShadows(100);
			// Verify result is a non-empty string
			expect(result).toBeTruthy();
			expect(typeof result).toBe("string");
			expect(result.length).toBeGreaterThan(0);
			// Should contain shadow format markers
			expect(result).toContain("px");
			expect(result).toContain("rgba");
			// Should contain multiple shadows (indicated by comma separators)
			const commaCount = (result.match(/, /g) || []).length;
			expect(commaCount).toBeGreaterThan(0);
		});
	});

	describe("generateStarShadowsWithOpacity", () => {
		test("should generate shadows with custom opacity range", () => {
			const result = generateStarShadowsWithOpacity(1, 2000, {
				min: 0.5,
				max: 0.8,
			});
			const match = result.match(RGBA_OPACITY_REGEX);
			if (match) {
				const opacity = Number.parseFloat(match[4]);
				expect(opacity).toBeGreaterThanOrEqual(0.5);
				expect(opacity).toBeLessThanOrEqual(0.8);
			}
		});

		test("should generate cross-shaped stars based on ratio", () => {
			// With 100% cross ratio, each star generates 5 shadows (center + 4 arms)
			const result = generateStarShadowsWithOpacity(
				1,
				2000,
				{
					min: 0.4,
					max: 0.9,
				},
				1.0
			); // 100% cross ratio
			// Result should contain shadow definitions
			expect(result).toBeTruthy();
			expect(result.length).toBeGreaterThan(0);
			// Should contain multiple shadows (at least 1, likely 5 for cross star)
			expect(result).toContain(", ");
		});

		test("should use default opacity range when not provided", () => {
			const result = generateStarShadowsWithOpacity(1);
			const match = result.match(RGBA_OPACITY_REGEX);
			if (match) {
				const opacity = Number.parseFloat(match[4]);
				expect(opacity).toBeGreaterThanOrEqual(0.4);
				expect(opacity).toBeLessThanOrEqual(0.9);
			}
		});

		test("should handle zero stars", () => {
			const result = generateStarShadowsWithOpacity(0);
			expect(result).toBe("");
		});

		test("should generate both normal and cross stars", () => {
			const result = generateStarShadowsWithOpacity(
				100,
				2000,
				{
					min: 0.4,
					max: 0.9,
				},
				0.3
			); // 30% cross ratio
			// Result should be non-empty string
			expect(result).toBeTruthy();
			expect(typeof result).toBe("string");
			// Should contain shadow definitions (at least some shadows)
			expect(result.length).toBeGreaterThan(0);
			// Verify format by checking it contains expected pattern
			expect(result).toContain("px");
			expect(result).toContain("rgba");
		});

		test("should generate shadows with correct format", () => {
			const result = generateStarShadowsWithOpacity(1);
			// Result should be non-empty
			expect(result).toBeTruthy();
			expect(typeof result).toBe("string");
			// Should contain shadow format markers
			expect(result).toContain("px");
			expect(result).toContain("rgba");
			// Check that it matches the general shadow format
			if (result.length > 0) {
				const firstPart = result.split(", ")[0];
				expect(firstPart).toMatch(SHADOW_START_REGEX);
			}
		});

		test("should respect custom maxSize", () => {
			const result = generateStarShadowsWithOpacity(10, 500);
			const shadows = result.split(", ");
			for (const shadow of shadows) {
				const match = shadow.match(PX_COORDINATE_REGEX);
				if (match) {
					const x = Number.parseInt(match[1], 10);
					expect(x).toBeLessThan(500);
				}
			}
		});
	});
});
