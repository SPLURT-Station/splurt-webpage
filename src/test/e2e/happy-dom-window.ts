import type { Window } from "happy-dom";
import { Window as HappyWindow } from "happy-dom";

/**
 * Happy-DOM expects standard constructors on `window` when throwing from
 * selector/CSS parsing. Bun does not define them on the Window instance, which
 * causes `TypeError: undefined is not a constructor` instead of real errors.
 */
export function createHappyDomWindow(
	options?: ConstructorParameters<typeof HappyWindow>[0]
): Window {
	const win = new HappyWindow(options);
	Object.assign(win as object, {
		SyntaxError,
		TypeError,
		ReferenceError,
		Error,
		...(typeof DOMException === "undefined" ? {} : { DOMException }),
	});
	return win;
}
