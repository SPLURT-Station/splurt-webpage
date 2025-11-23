/**
 * Age gate utility functions
 * These functions handle localStorage operations for age verification
 */

export const AGE_GATE_STORAGE_KEY = "splurt_age_confirmed";

/**
 * Check if age has been confirmed in localStorage
 * @returns true if age is confirmed, false otherwise
 */
export function getAgeConfirmationStatus(): boolean {
	if (typeof window === "undefined") {
		return false;
	}
	try {
		return localStorage.getItem(AGE_GATE_STORAGE_KEY) === "true";
	} catch {
		return false;
	}
}

/**
 * Set age confirmation status in localStorage
 * @param value - true to confirm age, false to remove confirmation
 * @returns true if successful, false if localStorage is unavailable or throws error
 */
export function setAgeConfirmationStatus(value: boolean): boolean {
	if (typeof window === "undefined") {
		return false;
	}
	try {
		if (value) {
			localStorage.setItem(AGE_GATE_STORAGE_KEY, "true");
		} else {
			localStorage.removeItem(AGE_GATE_STORAGE_KEY);
		}
		return true;
	} catch {
		return false;
	}
}
