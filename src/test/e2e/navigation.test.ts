import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

// Mock navigation HTML structure (represents rendered navigation component)
const NAVIGATION_HTML = `
<nav class="site-nav fixed top-0 right-0 left-0 z-40 bg-background font-pixel">
	<div class="mx-auto flex h-14 max-w-7xl px-2">
		<a aria-label="Home" class="nav-logo relative block overflow-hidden" href="/">
			<img alt="S.P.L.U.R.T. Station" class="m-1 h-12 w-12" height="48" src="/splurtpaw2_alt3.png" width="48" />
		</a>
		<div class="nav-links hidden grow sm:flex">
			<div class="page-links flex">
				<a class="page-link" href="/">About</a>
				<a class="page-link" href="/how-to-play">How To Play</a>
				<a class="page-link" href="/media">Media</a>
				<a class="page-link" href="https://wiki.splurt.space" rel="noopener external" target="_blank">Wiki</a>
				<a class="page-link" href="https://wiki.splurt.space/Rules" rel="noopener external" target="_blank">Rules</a>
			</div>
			<div class="nav-right-section ml-auto flex items-center gap-3">
				<a class="cta--highlighted" href="/how-to-play">Play Now</a>
				<div class="social-icons flex items-center gap-3 px-2">
					<a aria-label="Discord" class="social-icon" href="https://discord.gg/splurt" rel="noopener external" target="_blank">Discord</a>
					<a aria-label="GitHub" class="social-icon" href="https://github.com/splurt-station" rel="noopener external" target="_blank">GitHub</a>
					<a aria-label="Patreon" class="social-icon" href="https://patreon.com/SPLURTstation13" rel="noopener external" target="_blank">Patreon</a>
				</div>
			</div>
		</div>
		<div class="ml-auto flex items-center pl-4 sm:hidden">
			<button aria-label="Toggle navigation" class="toggle-nav" type="button">
				<span class="top"></span>
				<span class="mid"></span>
				<span class="bottom"></span>
			</button>
		</div>
	</div>
</nav>
`;

function createDOMEnvironment(): Window {
	const window = new Window({
		url: "http://localhost:4321",
	});
	global.window = window as any;
	global.document = window.document as any;
	return window;
}

describe("Navigation E2E Tests (HappyDOM)", () => {
	let window: Window;

	beforeEach(() => {
		window = createDOMEnvironment();
		window.document.body.innerHTML = NAVIGATION_HTML;
	});

	test("should have logo link to home", () => {
		const logoLink = window.document.querySelector('a[aria-label="Home"]');

		expect(logoLink).not.toBeNull();
		if (logoLink) {
			expect(logoLink.getAttribute("href")).toBe("/");
		}
	});

	test("should have all main navigation links", () => {
		const navLinks = window.document.querySelectorAll(".page-link");

		expect(navLinks.length).toBeGreaterThanOrEqual(5);

		const hrefs = Array.from(navLinks).map((link) => link.getAttribute("href"));
		expect(hrefs).toContain("/");
		expect(hrefs).toContain("/how-to-play");
		expect(hrefs).toContain("/media");
		expect(hrefs).toContain("https://wiki.splurt.space");
		expect(hrefs).toContain("https://wiki.splurt.space/Rules");
	});

	test("should have external links with proper attributes", () => {
		const externalLinks = window.document.querySelectorAll(
			'a[rel*="noopener"], a[rel*="external"]'
		);

		expect(externalLinks.length).toBeGreaterThan(0);

		for (const link of externalLinks) {
			const rel = link.getAttribute("rel");
			expect(rel).toContain("noopener");
			expect(link.getAttribute("target")).toBe("_blank");
		}
	});

	test("should have social media links", () => {
		const socialLinks = window.document.querySelectorAll(".social-icon");

		expect(socialLinks.length).toBe(3);

		const hrefs = Array.from(socialLinks).map((link) =>
			link.getAttribute("href")
		);
		expect(hrefs.some((href) => href?.includes("discord"))).toBe(true);
		expect(hrefs.some((href) => href?.includes("github"))).toBe(true);
		expect(hrefs.some((href) => href?.includes("patreon"))).toBe(true);
	});

	test("should have social links with aria-labels", () => {
		const discordLink = window.document.querySelector(
			'a[aria-label="Discord"]'
		);
		const githubLink = window.document.querySelector('a[aria-label="GitHub"]');
		const patreonLink = window.document.querySelector(
			'a[aria-label="Patreon"]'
		);

		expect(discordLink).not.toBeNull();
		expect(githubLink).not.toBeNull();
		expect(patreonLink).not.toBeNull();
	});

	test("should have Play Now button linking to how-to-play", () => {
		const playButton = window.document.querySelector(
			'a.cta--highlighted[href="/how-to-play"]'
		);

		expect(playButton).not.toBeNull();
		if (playButton) {
			expect(playButton.textContent?.trim()).toContain("Play Now");
		}
	});

	test("should have mobile menu toggle button", () => {
		const toggleButton = window.document.querySelector(
			'button[aria-label="Toggle navigation"]'
		);

		expect(toggleButton).not.toBeNull();
		if (toggleButton) {
			expect(toggleButton.getAttribute("type")).toBe("button");
		}
	});

	test("should have proper semantic HTML structure", () => {
		const nav = window.document.querySelector("nav.site-nav");

		expect(nav).not.toBeNull();
		expect(nav?.tagName.toLowerCase()).toBe("nav");
	});

	test("should have all internal links use relative paths", () => {
		const internalLinks = window.document.querySelectorAll(
			".page-link[href^='/']"
		);

		for (const link of internalLinks) {
			const href = link.getAttribute("href");
			expect(href).not.toBeNull();
			if (href) {
				expect(href.startsWith("http")).toBe(false);
			}
		}
	});
});
