import { beforeEach, describe, expect, test } from "bun:test";
import {
	AGE_GATE_STORAGE_KEY,
	getAgeConfirmationStatus,
	setAgeConfirmationStatus,
} from "./age-gate";

// Mock localStorage for Node.js/Bun environment
const createMockLocalStorage = () => {
	const store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = String(value);
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			for (const key of Object.keys(store)) {
				delete store[key];
			}
		},
	};
};

// Set up global window and localStorage mocks before running tests
const mockLocalStorage = createMockLocalStorage();
global.window = {
	...global,
	localStorage: mockLocalStorage,
} as typeof window & { localStorage: typeof mockLocalStorage };
global.localStorage = mockLocalStorage as typeof localStorage;

describe("Age Gate Utilities", () => {
	beforeEach(() => {
		mockLocalStorage.clear();
	});

	describe("getAgeConfirmationStatus", () => {
		test("should return false when localStorage is empty", () => {
			expect(getAgeConfirmationStatus()).toBe(false);
		});

		test("should return true when age is confirmed", () => {
			mockLocalStorage.setItem(AGE_GATE_STORAGE_KEY, "true");
			expect(getAgeConfirmationStatus()).toBe(true);
		});

		test("should return false when localStorage has wrong value", () => {
			mockLocalStorage.setItem(AGE_GATE_STORAGE_KEY, "false");
			expect(getAgeConfirmationStatus()).toBe(false);
		});

		test("should return false when localStorage throws error", () => {
			// Mock localStorage to throw
			const originalGetItem = mockLocalStorage.getItem;
			mockLocalStorage.getItem = () => {
				throw new Error("Storage error");
			};

			expect(getAgeConfirmationStatus()).toBe(false);

			// Restore
			mockLocalStorage.getItem = originalGetItem;
		});
	});

	describe("setAgeConfirmationStatus", () => {
		test("should set confirmation to true", () => {
			setAgeConfirmationStatus(true);
			expect(mockLocalStorage.getItem(AGE_GATE_STORAGE_KEY)).toBe("true");
		});

		test("should remove confirmation when set to false", () => {
			mockLocalStorage.setItem(AGE_GATE_STORAGE_KEY, "true");
			setAgeConfirmationStatus(false);
			expect(mockLocalStorage.getItem(AGE_GATE_STORAGE_KEY)).toBeNull();
		});

		test("should return true on success", () => {
			expect(setAgeConfirmationStatus(true)).toBe(true);
		});

		test("should return false when localStorage throws error", () => {
			const originalSetItem = mockLocalStorage.setItem;
			mockLocalStorage.setItem = () => {
				throw new Error("QuotaExceededError");
			};

			expect(setAgeConfirmationStatus(true)).toBe(false);

			// Restore
			mockLocalStorage.setItem = originalSetItem;
		});
	});
});
