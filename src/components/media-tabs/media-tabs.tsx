import { actions } from "astro:actions";
import {
	type Component,
	createMemo,
	createResource,
	createSignal,
	For,
	Match,
	Show,
	Suspense,
	Switch,
} from "solid-js";
import type { MediaItem } from "../../utils/media-fetcher";
import ZoomableImage from "../zoomable-image/zoomable-image";

type Props = {
	splashScreens?: MediaItem[];
	inGameScreenshots?: MediaItem[];
};

type TabType = "splash" | "screenshots";

/**
 * Media gallery grid component
 */
const MediaGrid: Component<{
	items: MediaItem[];
	emptyMessage: string;
}> = (props) => (
	<Show
		fallback={
			<div class="py-12 text-center text-white/60">{props.emptyMessage}</div>
		}
		when={props.items.length > 0}
	>
		<div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
			<For each={props.items}>
				{(item) => (
					<div class="media-item flex items-center justify-center">
						<ZoomableImage
							alt={item.alt || "Gallery image"}
							fullResolutionUrl={item.originalUrl}
							height={400}
							metadata={item.metadata}
							src={item.url}
							width={600}
						/>
					</div>
				)}
			</For>
		</div>
	</Show>
);

/**
 * Fetch media data using Astro Actions with image optimization
 */
async function fetchMediaData(): Promise<{
	splashScreens: MediaItem[];
	screenshots: MediaItem[];
}> {
	const result = await actions.fetchMedia({
		optimize: true,
		optimizeOptions: {
			width: 600,
			quality: 80,
			format: "webp",
		},
	});

	if (result.error) {
		throw new Error(result.error.message || "Failed to fetch media");
	}

	if (!result.data) {
		throw new Error("No data returned from action");
	}

	return {
		splashScreens: result.data.splashScreens ?? [],
		screenshots: result.data.screenshots ?? [],
	};
}

export default function MediaTabs(props: Props) {
	const [activeTab, setActiveTab] = createSignal<TabType>("splash");

	const [mediaData, { refetch }] = createResource(() => fetchMediaData());

	// Memoized media items - only return data if resource is loaded
	const splashScreens = createMemo(() => {
		if (props.splashScreens) {
			return props.splashScreens;
		}
		if (mediaData.loading || !mediaData()) {
			return [];
		}
		return mediaData()?.splashScreens ?? [];
	});
	const inGameScreenshots = createMemo(() => {
		if (props.inGameScreenshots) {
			return props.inGameScreenshots;
		}
		if (mediaData.loading || !mediaData()) {
			return [];
		}
		return mediaData()?.screenshots ?? [];
	});

	return (
		<div class="w-full">
			{/* Tab Buttons */}
			<div
				aria-label="Media categories"
				class="mb-6 flex border-white/20 border-b"
				role="tablist"
			>
				<button
					aria-controls="splash-panel"
					aria-selected={activeTab() === "splash"}
					class="relative border-b-2 px-6 py-3 font-medium font-pixellari text-[21px] transition-colors duration-200"
					classList={{
						"text-primary border-primary": activeTab() === "splash",
						"text-white/60 border-transparent hover:text-white/80":
							activeTab() !== "splash",
					}}
					id="splash-tab"
					onClick={() => setActiveTab("splash")}
					role="tab"
					type="button"
				>
					Splashscreens
				</button>
				<button
					aria-controls="screenshots-panel"
					aria-selected={activeTab() === "screenshots"}
					class="relative border-b-2 px-6 py-3 font-medium font-pixellari text-[21px] transition-colors duration-200"
					classList={{
						"text-primary border-primary": activeTab() === "screenshots",
						"text-white/60 border-transparent hover:text-white/80":
							activeTab() !== "screenshots",
					}}
					id="screenshots-tab"
					onClick={() => setActiveTab("screenshots")}
					role="tab"
					type="button"
				>
					In-Game Screenshots
				</button>
			</div>

			<Suspense
				fallback={
					<div class="py-12 text-center text-white/60">
						<div class="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
						<p class="mt-2">Loading media...</p>
					</div>
				}
			>
				<Show
					fallback={
						<div class="py-12 text-center text-white/60">
							<p class="mb-2 text-red-400">Failed to load media</p>
							<p class="text-sm text-white/40">
								{mediaData.error?.message || "Unknown error"}
							</p>
							<button
								class="mt-4 rounded bg-primary px-4 py-2 font-medium text-sm text-white hover:bg-primary/80"
								onClick={refetch}
								type="button"
							>
								Retry
							</button>
						</div>
					}
					when={!mediaData.error}
				>
					<Show
						fallback={
							<div class="py-12 text-center text-white/60">
								<div class="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
								<p class="mt-2">Loading media...</p>
							</div>
						}
						when={mediaData() !== undefined}
					>
						<Switch>
							<Match when={activeTab() === "splash"}>
								<div
									aria-labelledby="splash-tab"
									id="splash-panel"
									role="tabpanel"
								>
									<MediaGrid
										emptyMessage="No splashscreens available"
										items={splashScreens()}
									/>
								</div>
							</Match>
							<Match when={activeTab() === "screenshots"}>
								<div
									aria-labelledby="screenshots-tab"
									id="screenshots-panel"
									role="tabpanel"
								>
									<MediaGrid
										emptyMessage="No screenshots available"
										items={inGameScreenshots()}
									/>
								</div>
							</Match>
						</Switch>
					</Show>
				</Show>
			</Suspense>
		</div>
	);
}
