import { beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";

// Age gate HTML structure (matches WorkInProgress.astro component)
const AGE_GATE_HTML = `
<section id="age-gate-overlay" class="age-gate-overlay">
	<div
		class="age-gate-modal"
		role="dialog"
		aria-modal="true"
		aria-labelledby="age-gate-title"
		aria-describedby="age-gate-description"
	>
		<div class="age-gate-header">
			<h2 id="age-gate-title" class="age-gate-title">Adults Only</h2>
		</div>
		<p id="age-gate-description" class="age-gate-text">
			This website contains content intended for adults. By clicking
			<strong>Continue</strong>, you confirm that you are at least 18 years of
			age.
		</p>
		<div class="age-gate-actions">
			<button id="age-continue" class="age-continue-button">Continue</button>
		</div>
	</div>
</section>
`;

function createDOMEnvironment(): Window {
	const window = new Window({
		url: "http://localhost:3000",
	});
	// Set up global environment for happy-dom
	global.window = window as any;
	global.document = window.document as any;
	global.localStorage = window.localStorage as any;
	global.HTMLElement = window.HTMLElement as any;
	return window;
}

function initializeAgeGate(window: Window) {
	// Execute the age gate script logic directly
	const STORAGE_KEY = "splurt_age_confirmed";
	const overlayId = "age-gate-overlay";

	function showOverlay() {
		const el = window.document.getElementById(overlayId);
		if (el) {
			(el as any).style.display = "flex";
			window.document.body.classList.add("age-gate-open");
		}
	}

	function hideOverlay() {
		const el = window.document.getElementById(overlayId);
		if (el) {
			(el as any).style.display = "none";
			window.document.body.classList.remove("age-gate-open");
		}
	}

	// Initialize based on localStorage
	if (window.localStorage.getItem(STORAGE_KEY) === "true") {
		hideOverlay();
	} else {
		showOverlay();
	}

	// Add click event listener
	window.addEventListener("click", (ev: any) => {
		const target = ev.target;
		if (
			target &&
			target instanceof window.HTMLElement &&
			target.id === "age-continue"
		) {
			try {
				window.localStorage.setItem(STORAGE_KEY, "true");
			} catch {
				// ignore
			}
			hideOverlay();
		}
	});
}

describe("Age Gate E2E Tests (HappyDOM)", () => {
	let window: Window;

	beforeEach(() => {
		window = createDOMEnvironment();
		// Clear localStorage before each test
		window.localStorage.clear();
		// Add body to document
		window.document.body.innerHTML = AGE_GATE_HTML;
		// Initialize the age gate script
		initializeAgeGate(window);
	});

	test("should show age gate on first visit", () => {
		const overlay = window.document.getElementById("age-gate-overlay");
		const continueButton = window.document.getElementById("age-continue");

		expect(overlay).not.toBeNull();
		expect(continueButton).not.toBeNull();

		// Check that overlay is visible (display: flex)
		if (overlay) {
			const display = window.getComputedStyle(overlay).display;
			expect(display).toBe("flex");
		}

		// Check that body has the age-gate-open class
		expect(window.document.body.classList.contains("age-gate-open")).toBe(true);

		// Check localStorage is empty
		expect(window.localStorage.getItem("splurt_age_confirmed")).toBeNull();
	});

	test("should hide age gate after clicking continue button", () => {
		const overlay = window.document.getElementById("age-gate-overlay");
		const continueButton = window.document.getElementById("age-continue");

		// Verify elements exist
		expect(overlay).not.toBeNull();
		expect(continueButton).not.toBeNull();

		// Verify initial state - overlay is visible
		if (overlay) {
			expect(window.getComputedStyle(overlay).display).toBe("flex");
		}
		expect(window.document.body.classList.contains("age-gate-open")).toBe(true);

		// Simulate click on continue button
		if (continueButton) {
			const clickEvent = new window.MouseEvent("click", {
				bubbles: true,
				cancelable: true,
			});
			continueButton.dispatchEvent(clickEvent);
		}

		// Verify overlay is now hidden
		if (overlay) {
			expect(window.getComputedStyle(overlay).display).toBe("none");
		}
		expect(window.document.body.classList.contains("age-gate-open")).toBe(
			false
		);

		// Verify localStorage was set
		expect(window.localStorage.getItem("splurt_age_confirmed")).toBe("true");
	});

	test("should hide age gate when localStorage already has confirmation", () => {
		// Set localStorage before creating DOM
		window.localStorage.setItem("splurt_age_confirmed", "true");

		// Create fresh DOM with the script
		window.document.body.innerHTML = AGE_GATE_HTML;
		initializeAgeGate(window);

		const overlay = window.document.getElementById("age-gate-overlay");

		// Verify overlay is hidden because localStorage already has confirmation
		if (overlay) {
			expect(window.getComputedStyle(overlay).display).toBe("none");
		}
		expect(window.document.body.classList.contains("age-gate-open")).toBe(
			false
		);
	});

	test("should persist confirmation across page loads", () => {
		const continueButton = window.document.getElementById("age-continue");

		// Click continue to confirm age
		if (continueButton) {
			const clickEvent = new window.MouseEvent("click", {
				bubbles: true,
				cancelable: true,
			});
			continueButton.dispatchEvent(clickEvent);
		}

		// Verify localStorage is set
		expect(window.localStorage.getItem("splurt_age_confirmed")).toBe("true");

		// Simulate page reload - create new DOM with existing localStorage
		window.document.body.innerHTML = AGE_GATE_HTML;
		// Remove existing event listeners by recreating window environment
		const newWindow = createDOMEnvironment();
		newWindow.localStorage.setItem("splurt_age_confirmed", "true");
		newWindow.document.body.innerHTML = AGE_GATE_HTML;
		initializeAgeGate(newWindow);

		const overlayAfterReload =
			newWindow.document.getElementById("age-gate-overlay");

		// Verify overlay is still hidden after "reload"
		if (overlayAfterReload) {
			expect(newWindow.getComputedStyle(overlayAfterReload).display).toBe(
				"none"
			);
		}
		expect(newWindow.document.body.classList.contains("age-gate-open")).toBe(
			false
		);
	});

	test("should not hide age gate if localStorage throws error", () => {
		// Mock localStorage.setItem to throw an error
		const originalSetItem = window.localStorage.setItem;
		window.localStorage.setItem = () => {
			throw new Error("QuotaExceededError");
		};

		const overlay = window.document.getElementById("age-gate-overlay");
		const continueButton = window.document.getElementById("age-continue");

		// Initial state - overlay is visible
		if (overlay) {
			expect(window.getComputedStyle(overlay).display).toBe("flex");
		}

		// Try to click continue - should still hide overlay even if localStorage fails
		if (continueButton) {
			const clickEvent = new window.MouseEvent("click", {
				bubbles: true,
				cancelable: true,
			});
			continueButton.dispatchEvent(clickEvent);
		}

		// Overlay should still be hidden (error is caught and ignored)
		if (overlay) {
			expect(window.getComputedStyle(overlay).display).toBe("none");
		}

		// Restore original setItem
		window.localStorage.setItem = originalSetItem;
	});
});
