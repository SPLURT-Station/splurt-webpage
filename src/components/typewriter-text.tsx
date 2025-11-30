import { createEffect, createSignal, type JSX, onMount } from "solid-js";
import "./typewriter-text.css";

type TypewriterTextProps = {
	children: JSX.Element;
	speed?: number;
	delay?: number;
	showCursor?: boolean;
	storageKey?: string;
};

type TextSegment = {
	originalNode: Text;
	cloneNode: Text;
	startIndex: number;
	endIndex: number;
	originalText: string;
};

const STORAGE_KEY_PREFIX = "typewriter-animation-shown-";

function RefreshIcon(props: {
	class?: string;
	width?: number;
	height?: number;
}) {
	return (
		<svg
			aria-hidden="true"
			class={props.class}
			fill="currentColor"
			height={props.height ?? 24}
			shape-rendering="crispEdges"
			viewBox="0 0 24 24"
			width={props.width ?? 24}
			xmlns="http://www.w3.org/2000/svg"
		>
			<path d="M23 14v1h-1v2h-1v2h-1v1h-1v1h-2v1h-2v1H9v-1H7v-1H5v-1H3v1H2v1H1v-8h8v1H8v1H7v2h1v1h2v1h4v-1h2v-1h1v-1h1v-2h1v-1zm0-12v8h-8V9h1V8h1V6h-1V5h-2V4h-4v1H8v1H7v1H6v2H5v1H1V9h1V7h1V5h1V4h1V3h2V2h2V1h6v1h2v1h2v1h2V3h1V2z" />
		</svg>
	);
}

function collectTextNodes(element: Element): Text[] {
	const textNodes: Text[] = [];

	function traverse(node: Node) {
		if (node.nodeType === Node.TEXT_NODE) {
			const textNode = node as Text;
			const text = textNode.textContent ?? "";
			if (text.length > 0) {
				textNodes.push(textNode);
			}
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			for (const child of Array.from(node.childNodes)) {
				traverse(child);
			}
		}
	}

	traverse(element);

	return textNodes;
}

export default function TypewriterText(props: TypewriterTextProps) {
	const [typedLength, setTypedLength] = createSignal(0);
	const [isVisible, setIsVisible] = createSignal(false);
	const [isAnimationComplete, setIsAnimationComplete] = createSignal(false);
	const [textSegments, setTextSegments] = createSignal<TextSegment[]>([]);
	const [cloneElement, setCloneElement] = createSignal<
		HTMLElement | undefined
	>();
	const [cursorElement, setCursorElement] = createSignal<
		HTMLSpanElement | undefined
	>();
	let containerRef: HTMLDivElement | undefined;
	let contentRef: HTMLDivElement | undefined;
	let totalLength = 0;
	let intervalId: ReturnType<typeof setInterval> | undefined;
	let observer: IntersectionObserver | undefined;

	const speed = props.speed ?? 30;
	const delay = props.delay ?? 0;
	const showCursor = props.showCursor ?? true;
	const storageKey = STORAGE_KEY_PREFIX + (props.storageKey ?? "default");

	// Check if animation has been shown before
	const checkHasPlayed = (): boolean => {
		if (typeof window === "undefined") {
			return false;
		}
		return localStorage.getItem(storageKey) === "true";
	};

	// Mark animation as shown
	const markAsPlayed = () => {
		if (typeof window !== "undefined") {
			localStorage.setItem(storageKey, "true");
		}
	};

	// Clear the played state
	const clearPlayedState = () => {
		if (typeof window !== "undefined") {
			localStorage.removeItem(storageKey);
		}
	};

	// Cleanup function
	const cleanup = () => {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = undefined;
		}
		if (observer) {
			observer.disconnect();
			observer = undefined;
		}
		const clone = cloneElement();
		if (clone) {
			clone.remove();
		}
	};

	// Update text nodes reactively when typedLength changes
	createEffect(() => {
		const visible = isVisible();
		const clone = cloneElement();
		if (!(visible && clone)) {
			return;
		}

		const currentLength = typedLength();
		const segments = textSegments();

		for (const segment of segments) {
			const start = segment.startIndex;
			const charsToShow = Math.max(
				0,
				Math.min(segment.originalText.length, currentLength - start)
			);

			if (charsToShow > 0) {
				segment.cloneNode.textContent = segment.originalText.slice(
					0,
					charsToShow
				);
			} else {
				segment.cloneNode.textContent = "";
			}
		}
	});

	const createSegments = (originalTextNodes: Text[]): TextSegment[] => {
		const segments: TextSegment[] = [];
		let currentIndex = 0;

		for (const originalNode of originalTextNodes) {
			const text = originalNode.textContent ?? "";
			if (text.length > 0) {
				segments.push({
					originalNode,
					cloneNode: originalNode, // Will be replaced with clone node
					startIndex: currentIndex,
					endIndex: currentIndex + text.length,
					originalText: text,
				});
				currentIndex += text.length;
			}
		}
		totalLength = currentIndex;
		return segments;
	};

	const setupClone = (
		container: HTMLDivElement,
		content: HTMLDivElement,
		segments: TextSegment[]
	): HTMLElement => {
		// Clone the structure for typewriter effect
		const clone = content.cloneNode(true) as HTMLElement;
		container.appendChild(clone);
		setCloneElement(clone);

		// Collect text nodes from clone and match them with original segments
		const cloneTextNodes = collectTextNodes(clone);
		for (let i = 0; i < segments.length && i < cloneTextNodes.length; i++) {
			segments[i].cloneNode = cloneTextNodes[i];
			// Clear clone text nodes initially
			cloneTextNodes[i].textContent = "";
		}

		return clone;
	};

	const handleTypingComplete = () => {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = undefined;
		}
		const cursor = cursorElement();
		if (cursor) {
			cursor.remove();
		}
		markAsPlayed();
		// Show replay button after a short delay with fade-in
		setTimeout(() => {
			setIsAnimationComplete(true);
		}, 300);
	};

	const startTypingAnimation = () => {
		setTimeout(() => {
			intervalId = setInterval(() => {
				setTypedLength((prev) => {
					if (prev >= totalLength) {
						handleTypingComplete();
						return totalLength;
					}
					return prev + 1;
				});
			}, speed);
		}, delay);
	};

	const startTypewriter = () => {
		const container = containerRef;
		const content = contentRef;
		if (!(container && content)) {
			return;
		}

		setIsVisible(true);
		if (observer) {
			observer.disconnect();
			observer = undefined;
		}

		// Collect text nodes from the original content
		const originalTextNodes = collectTextNodes(content);
		const segments = createSegments(originalTextNodes);

		// Setup clone
		const clone = setupClone(container, content, segments);
		setTextSegments(segments);

		// Create and append cursor to clone
		if (showCursor) {
			const cursor = document.createElement("span");
			cursor.setAttribute("aria-hidden", "true");
			cursor.className = "typewriter-cursor";
			cursor.textContent = "█";
			clone.appendChild(cursor);
			setCursorElement(cursor);
		}

		// Hide original content after clone is ready (prevents layout shift)
		content.style.display = "none";

		startTypingAnimation();
	};

	const handleReplay = () => {
		// Reset state
		setTypedLength(0);
		setIsVisible(false);
		setIsAnimationComplete(false);
		setTextSegments([]);
		setCloneElement(undefined);
		setCursorElement(undefined);

		// Cleanup
		cleanup();

		// Clear storage
		clearPlayedState();

		// Restore original content
		const content = contentRef;
		if (content) {
			content.style.display = "";
		}

		// Restart animation
		setTimeout(() => {
			startTypewriter();
		}, 100);
	};

	onMount(() => {
		const container = containerRef;
		const content = contentRef;
		if (!(container && content)) {
			return;
		}

		// Check if animation has been shown
		const played = checkHasPlayed();

		if (played) {
			// Just show the content normally, no animation
			// Show replay button immediately since animation was already played
			setIsAnimationComplete(true);
			return;
		}

		const handleIntersection = (entries: IntersectionObserverEntry[]) => {
			for (const entry of entries) {
				const intersecting = entry.isIntersecting;
				const alreadyVisible = isVisible();
				if (!intersecting || alreadyVisible) {
					continue;
				}
				startTypewriter();
			}
		};

		observer = new IntersectionObserver(handleIntersection, {
			threshold: 0.1,
		});
		observer.observe(container);
	});

	return (
		<div
			class="typewriter-container relative"
			ref={(el) => {
				containerRef = el;
			}}
		>
			<div
				ref={(el) => {
					contentRef = el;
				}}
			>
				{props.children}
			</div>
			<button
				aria-label="Replay typewriter animation"
				class={`absolute right-2 bottom-2 rounded p-2 text-gray-400 transition-all duration-500 ${
					isAnimationComplete()
						? "opacity-50 hover:text-gray-300 hover:opacity-100"
						: "pointer-events-none opacity-0"
				}`}
				onClick={handleReplay}
				title="Replay typewriter animation"
				type="button"
			>
				<RefreshIcon class="h-5 w-5" height={20} width={20} />
			</button>
		</div>
	);
}
