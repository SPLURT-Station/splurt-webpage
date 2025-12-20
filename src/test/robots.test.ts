import { describe, expect, test } from "bun:test";
import type { APIContext } from "astro";

// Import the GET handler
const { GET } = await import("../pages/robots.txt.ts");

describe("robots.txt API Route", () => {
	test("should generate correct robots.txt content", async () => {
		const mockSite = new URL("https://splurt.space");
		const context = {
			site: mockSite,
			generator: "test",
			url: new URL("https://splurt.space/robots.txt"),
			params: {},
			props: {},
			request: new Request("https://splurt.space/robots.txt"),
			redirect: () => new Response(),
			locals: {},
		} as unknown as APIContext;

		const response = await GET(context);
		const text = await response.text();

		expect(text).toContain("User-agent: *");
		expect(text).toContain("Allow: /");
		expect(text).toContain("Sitemap:");
		expect(text).toContain("sitemap-index.xml");
		expect(text).toContain("https://splurt.space");
	});

	test("should include correct sitemap URL", async () => {
		const mockSite = new URL("https://example.com");
		const context = {
			site: mockSite,
			generator: "test",
			url: new URL("https://example.com/robots.txt"),
			params: {},
			props: {},
			request: new Request("https://example.com/robots.txt"),
			redirect: () => new Response(),
			locals: {},
		} as unknown as APIContext;

		const response = await GET(context);
		const text = await response.text();

		expect(text).toContain("https://example.com/sitemap-index.xml");
	});

	test("should return text/plain content type", async () => {
		const mockSite = new URL("https://splurt.space");
		const context = {
			site: mockSite,
			generator: "test",
			url: new URL("https://splurt.space/robots.txt"),
			params: {},
			props: {},
			request: new Request("https://splurt.space/robots.txt"),
			redirect: () => new Response(),
			locals: {},
		} as unknown as APIContext;

		const response = await GET(context);

		expect(response).toBeInstanceOf(Response);
	});

	test("should format robots.txt correctly", async () => {
		const mockSite = new URL("https://splurt.space");
		const context = {
			site: mockSite,
			generator: "test",
			url: new URL("https://splurt.space/robots.txt"),
			params: {},
			props: {},
			request: new Request("https://splurt.space/robots.txt"),
			redirect: () => new Response(),
			locals: {},
		} as unknown as APIContext;

		const response = await GET(context);
		const text = await response.text();

		// Should have proper line breaks
		const lines = text.split("\n").filter((line) => line.trim() !== "");
		expect(lines.length).toBeGreaterThanOrEqual(3); // User-agent, Allow, Sitemap

		// Should start with User-agent
		expect(lines[0].trim()).toContain("User-agent");
		// Should have Allow directive
		expect(lines.some((line) => line.includes("Allow"))).toBe(true);
		// Should have Sitemap directive
		expect(lines.some((line) => line.includes("Sitemap"))).toBe(true);
	});
});
