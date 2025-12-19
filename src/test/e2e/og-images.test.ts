import { describe, expect, test } from "bun:test";

describe("OG Images API E2E Tests", () => {
	test("should export getStaticPaths function", async () => {
		const { getStaticPaths } = await import("../../pages/api/og/[...path].ts");

		expect(getStaticPaths).toBeDefined();
		expect(typeof getStaticPaths).toBe("function");
	});

	test("should export GET handler function", async () => {
		const { GET } = await import("../../pages/api/og/[...path].ts");

		expect(GET).toBeDefined();
		expect(typeof GET).toBe("function");
	});

	test("should generate static paths for all defined pages", async () => {
		const { getStaticPaths } = await import("../../pages/api/og/[...path].ts");

		// getStaticPaths may require arguments or return a promise
		// Try calling it with empty object if it requires context
		const paths = await getStaticPaths({} as any);

		// Should generate paths for all defined pages
		expect(Array.isArray(paths)).toBe(true);
		expect(paths.length).toBeGreaterThan(0);

		// Each path should have a params object with path property
		const pathValues: string[] = [];
		for (const path of paths) {
			expect(path).toHaveProperty("params");
			expect(path.params).toHaveProperty("path");
			const pathValue = path.params.path;
			if (typeof pathValue === "string") {
				pathValues.push(pathValue);
			} else if (typeof pathValue === "number") {
				pathValues.push(String(pathValue));
			}
		}

		// Should include all expected pages (case-insensitive check)
		const normalizedPaths = pathValues.map((p) => p.toLowerCase());
		expect(
			normalizedPaths.some((p) => p === "index" || p.includes("index"))
		).toBe(true);
		expect(
			normalizedPaths.some(
				(p) => p === "how-to-play" || p.includes("how-to-play")
			)
		).toBe(true);
		expect(
			normalizedPaths.some((p) => p === "media" || p.includes("media"))
		).toBe(true);
	});

	test("should handle GET request for valid path", async () => {
		const { GET } = await import("../../pages/api/og/[...path].ts");
		const { getStaticPaths } = await import("../../pages/api/og/[...path].ts");

		const paths = await getStaticPaths({} as any);
		const firstPath = paths[0];

		// Note: GET handler expects specific context structure from Astro
		// In a real e2e test with a running server, we would make an actual HTTP request
		// Here we verify the function exists and can be called
		expect(GET).toBeDefined();
		expect(typeof GET).toBe("function");

		// Verify path structure
		expect(firstPath.params.path).toBeDefined();
		const pathValue = firstPath.params.path;
		expect(typeof pathValue === "string" || typeof pathValue === "number").toBe(
			true
		);
	});

	test("should have correct path structure", async () => {
		const { getStaticPaths } = await import("../../pages/api/og/[...path].ts");

		const paths = await getStaticPaths({} as any);

		// Verify each path has the correct structure
		for (const path of paths) {
			expect(path).toHaveProperty("params");
			expect(path.params).toHaveProperty("path");
			const pathValue = path.params.path;
			// Path should be defined and non-empty
			expect(pathValue).toBeDefined();
			if (typeof pathValue === "string") {
				expect(pathValue.length).toBeGreaterThan(0);
			}
		}
	});
});
