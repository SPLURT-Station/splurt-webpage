import { actions } from "astro:actions";
import {
	type Component,
	createEffect,
	createResource,
	createSignal,
	For,
	onCleanup,
	Show,
} from "solid-js";
import { Portal } from "solid-js/web";
import type { ImageMetadataInfo } from "../../utils/image-metadata";
import {
	getFilenameFromUrl,
	getFilenameWithoutExtension,
	hasMetadataContent,
} from "../../utils/image-metadata";
import "./zoomable-image.css";

/**
 * Metadata panel component
 */
const MetadataPanel: Component<{
	metadata: ImageMetadataInfo | null | undefined;
	imageUrl: string;
	authorRef: (el: HTMLDivElement) => void;
}> = (props) => {
	const title = () => {
		if (props.metadata?.title) {
			return props.metadata.title;
		}
		const filename = getFilenameFromUrl(props.imageUrl);
		return getFilenameWithoutExtension(filename);
	};

	const hasContent = () => {
		if (!props.metadata) {
			return false;
		}
		return hasMetadataContent(props.metadata) || !!props.metadata.title;
	};

	return (
		<Show when={hasContent()}>
			<div class="flex w-full shrink-0 flex-col gap-4 overflow-y-auto p-6 text-white lg:h-full lg:w-auto lg:min-w-[20rem] lg:max-w-md">
				<h3 class="font-pixel text-primary text-xl">{title()}</h3>
				{props.metadata?.description && (
					<div class="flex flex-col gap-2">
						<h4 class="font-medium font-pixellari text-sm text-white/80">
							Description
						</h4>
						<p class="font-spess text-sm text-white/70">
							{props.metadata.description}
						</p>
					</div>
				)}
				{props.metadata?.author && (
					<div class="flex flex-col gap-2">
						<h4 class="font-medium font-pixellari text-sm text-white/80">
							Artist
						</h4>
						<div
							class="font-sans text-primary text-sm hover:text-primary/80"
							ref={props.authorRef}
						/>
					</div>
				)}
				{props.metadata?.sources && props.metadata.sources.length > 0 && (
					<div class="flex flex-col gap-2">
						<h4 class="font-medium font-pixellari text-sm text-white/80">
							Sources
						</h4>
						<ul class="flex flex-col gap-2">
							<For each={props.metadata.sources}>
								{(source) => (
									<li>
										<a
											class="font-sans text-primary text-sm underline hover:text-primary/80"
											href={source}
											rel="noopener noreferrer"
											target="_blank"
										>
											{source}
										</a>
									</li>
								)}
							</For>
						</ul>
					</div>
				)}
			</div>
		</Show>
	);
};

/**
 * Zoom/Modal component for full-size image viewing
 * Fetches metadata lazily when modal opens
 */
const ImageModal: Component<{
	imageUrl: string;
	alt: string;
	isOpen: () => boolean;
	onClose: () => void;
	initialMetadata?: ImageMetadataInfo;
}> = (props) => {
	const [imageLoaded, setImageLoaded] = createSignal(false);
	const [imageError, setImageError] = createSignal(false);
	let modalRef: HTMLDivElement | undefined;
	let authorRef: HTMLDivElement | undefined;

	// Fetch metadata lazily when modal opens (only if not already provided)
	const [metadata] = createResource(
		() => (props.isOpen() && !props.initialMetadata ? props.imageUrl : null),
		async (url) => {
			if (!url) {
				return null;
			}
			try {
				const result = await actions.fetchImageMetadata({ imageUrl: url });
				return result.error ? null : (result.data?.metadata ?? null);
			} catch {
				return null;
			}
		}
	);

	// Check if metadata is loaded (either provided initially or fetched)
	const isMetadataLoaded = () => {
		if (props.initialMetadata) {
			return true; // Already provided, consider it loaded
		}
		// Check if resource has finished loading (whether it returned data or null)
		return metadata.state === "ready" || metadata.state === "errored";
	};

	// Check if both image and metadata are loaded
	const isContentReady = () =>
		imageLoaded() && isMetadataLoaded() && !imageError();

	const handleKeyPress = (e: KeyboardEvent) => {
		if (e.key === "Escape" && props.isOpen()) {
			props.onClose();
		}
	};

	const handleClickOutside = (e: MouseEvent) => {
		if (modalRef && e.target === modalRef) {
			props.onClose();
		}
	};

	const handleImageLoad = () => {
		setImageLoaded(true);
		setImageError(false);
	};

	const handleImageError = () => {
		setImageLoaded(false);
		setImageError(true);
	};

	// Check if image is already loaded (for cached images)
	const checkImageLoaded = (img: HTMLImageElement | undefined) => {
		if (img?.complete && img.naturalHeight !== 0) {
			setImageLoaded(true);
			setImageError(false);
		}
	};

	// Safely get metadata (only when ready)
	const getMetadata = () => {
		if (props.initialMetadata) {
			return props.initialMetadata;
		}
		if (metadata.state === "ready") {
			return metadata();
		}
		return null;
	};

	// Check if metadata panel should be visible
	const hasMetadata = () => {
		const meta = getMetadata();
		if (!meta) {
			return false;
		}
		return hasMetadataContent(meta) || !!meta.title;
	};

	// Reset loading state when image URL changes (track imageUrl specifically)
	let previousImageUrl: string | undefined;
	createEffect(() => {
		const currentUrl = props.imageUrl;
		if (props.isOpen() && currentUrl && currentUrl !== previousImageUrl) {
			previousImageUrl = currentUrl;
			setImageLoaded(false);
			setImageError(false);
		}
	});

	// Set author HTML when metadata changes
	createEffect(() => {
		const meta = props.initialMetadata ?? metadata();
		if (authorRef && meta?.author) {
			authorRef.innerHTML = meta.author;
		}
	});

	// Handle keyboard and click events, body scroll lock (client-side only)
	createEffect(() => {
		if (typeof document === "undefined") {
			return;
		}
		if (props.isOpen()) {
			document.addEventListener("keydown", handleKeyPress);
			document.addEventListener("click", handleClickOutside);
			document.body.style.overflow = "hidden";
		} else {
			document.removeEventListener("keydown", handleKeyPress);
			document.removeEventListener("click", handleClickOutside);
			document.body.style.overflow = "";
		}
	});

	onCleanup(() => {
		if (typeof document !== "undefined") {
			document.removeEventListener("keydown", handleKeyPress);
			document.removeEventListener("click", handleClickOutside);
			document.body.style.overflow = "";
		}
	});

	return (
		<Show when={props.isOpen() && typeof document !== "undefined"}>
			<Portal mount={document.body}>
				<div
					aria-label="Image zoom"
					aria-modal="true"
					class="fixed inset-0 z-9999 flex items-center justify-center backdrop-blur-sm"
					ref={(el) => {
						modalRef = el;
					}}
					role="dialog"
					style="background-color: rgba(0, 0, 0, 0.5);"
				>
					<div
						class="group relative flex max-h-[90vh] max-w-[90vw] flex-col items-center justify-center overflow-hidden rounded-sm border border-primary bg-background/95 p-2 lg:flex-row lg:items-stretch"
						style="box-shadow: var(--glow-primary);"
					>
						{/* Image container - always rendered so image can load, but hidden until ready */}
						<div
							class="relative flex flex-1 items-center justify-center overflow-hidden lg:h-full lg:max-h-full lg:min-w-0"
							style={`visibility: ${isContentReady() ? "visible" : "hidden"};`}
						>
							<Show
								fallback={
									<div class="rounded-sm bg-background/50 p-8 text-center text-white/60">
										<p>Failed to load image</p>
									</div>
								}
								when={!imageError()}
							>
								<div class="relative flex h-full w-full items-center justify-center">
									<img
										alt={props.alt || "Zoomed image"}
										class={`zoomable-image-modal-img h-auto w-auto rounded-sm object-contain ${hasMetadata() ? "zoomable-image-modal-img-with-panel" : ""}`}
										height={800}
										onerror={handleImageError}
										onload={handleImageLoad}
										ref={(el) => {
											// Check if image is already loaded (for cached images that load before onload fires)
											checkImageLoaded(el);
										}}
										src={props.imageUrl}
										style="display: block;"
										width={1200}
									/>
								</div>

								<button
									aria-label="Close zoom"
									class="absolute top-4 right-4 z-10 rounded bg-background/70 p-2 text-white opacity-0 transition-opacity duration-200 hover:bg-primary group-hover:opacity-100"
									onclick={() => props.onClose()}
									type="button"
								>
									<svg
										aria-hidden="true"
										class="h-6 w-6"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											d="M6 18L18 6M6 6l12 12"
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
										/>
									</svg>
								</button>
							</Show>
						</div>

						{/* Metadata panel - inside image frame, only rendered when ready */}
						<Show when={isContentReady()}>
							{props.initialMetadata ? (
								<MetadataPanel
									authorRef={(el) => {
										authorRef = el;
									}}
									imageUrl={props.imageUrl}
									metadata={props.initialMetadata}
								/>
							) : (
								<MetadataPanel
									authorRef={(el) => {
										authorRef = el;
									}}
									imageUrl={props.imageUrl}
									metadata={getMetadata() ?? undefined}
								/>
							)}
						</Show>

						{/* Loading overlay - shown while either image or metadata is loading */}
						<Show when={!isContentReady()}>
							<div class="absolute inset-0 z-50 flex items-center justify-center rounded-sm bg-background/95">
								<div class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
							</div>
						</Show>
					</div>
				</div>
			</Portal>
		</Show>
	);
};

interface ZoomableImageProps {
	/** Optimized image URL (from Astro Image component) */
	src: string;
	/** Full resolution image URL for zoom (optional, defaults to src) */
	fullResolutionUrl?: string;
	/** Alt text for the image */
	alt: string;
	/** Additional CSS classes */
	class?: string;
	/** Width attribute */
	width?: number;
	/** Height attribute */
	height?: number;
	/** Image metadata (optional) */
	metadata?: ImageMetadataInfo;
}

/**
 * Zoomable image component that wraps an image with zoom functionality
 * Can be used with Astro's Image component by passing the optimized src
 */
export default function ZoomableImage(props: ZoomableImageProps) {
	const [showZoomButton, setShowZoomButton] = createSignal(false);
	const [isZoomed, setIsZoomed] = createSignal(false);

	const fullResolutionUrl = () => props.fullResolutionUrl || props.src;

	const handleZoom = () => {
		setIsZoomed(true);
	};

	const handleCloseZoom = () => {
		setIsZoomed(false);
	};

	return (
		<>
			<div
				class={`group relative flex w-full items-center justify-center rounded-sm bg-transparent p-2 ${props.class || ""}`}
				onmouseenter={() => setShowZoomButton(true)}
				onmouseleave={() => setShowZoomButton(false)}
			>
				<img
					alt={props.alt}
					class="h-auto w-full rounded-sm"
					height={props.height || 400}
					loading="lazy"
					src={props.src}
					width={props.width || 600}
				/>
				<Show when={showZoomButton()}>
					<button
						aria-label="Zoom image"
						class="absolute inset-0 flex items-center justify-center rounded-sm bg-background/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
						onclick={handleZoom}
						type="button"
					>
						<svg
							aria-hidden="true"
							class="h-8 w-8 text-white"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
							/>
						</svg>
					</button>
				</Show>
			</div>
			<ImageModal
				alt={props.alt}
				imageUrl={fullResolutionUrl()}
				initialMetadata={props.metadata}
				isOpen={isZoomed}
				onClose={handleCloseZoom}
			/>
		</>
	);
}
