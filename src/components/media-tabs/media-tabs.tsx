import { createSignal, For, Show } from "solid-js";

type MediaItem = {
	id: number;
	alt: string;
};

type Props = {
	splashScreens: MediaItem[];
	inGameScreenshots: MediaItem[];
};

export default function MediaTabs(props: Props) {
	const [activeTab, setActiveTab] = createSignal<"splash" | "screenshots">(
		"splash"
	);

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

			{/* Tab Panels */}
			<div
				aria-labelledby="splash-tab"
				classList={{ hidden: activeTab() !== "splash" }}
				id="splash-panel"
				role="tabpanel"
			>
				<Show when={activeTab() === "splash"}>
					<div class="grid gap-4 lg:grid-cols-2">
						<For each={props.splashScreens}>
							{(item: MediaItem) => (
								<div class="media-item">
									<img
										alt={item.alt}
										class="lazyload w-full rounded-sm bg-background bg-opacity-50"
										height={400}
										loading="lazy"
										onerror={(
											e: Event & { currentTarget: HTMLImageElement }
										) => {
											const target = e.currentTarget;
											target.src = "/img/media/splash/placeholder.jpg";
											target.onerror = null;
										}}
										src={`/img/media/splash/${item.id}.jpg`}
										width={600}
									/>
								</div>
							)}
						</For>
					</div>
				</Show>
			</div>

			<div
				aria-labelledby="screenshots-tab"
				classList={{ hidden: activeTab() !== "screenshots" }}
				id="screenshots-panel"
				role="tabpanel"
			>
				<Show when={activeTab() === "screenshots"}>
					<div class="grid gap-4 lg:grid-cols-2">
						<For each={props.inGameScreenshots}>
							{(item: MediaItem) => (
								<div class="media-item">
									<img
										alt={item.alt}
										class="lazyload w-full rounded-sm bg-background bg-opacity-50"
										height={400}
										loading="lazy"
										onerror={(
											e: Event & { currentTarget: HTMLImageElement }
										) => {
											const target = e.currentTarget;
											target.src = "/img/media/screenshots/placeholder.jpg";
											target.onerror = null;
										}}
										src={`/img/media/screenshots/${item.id}.jpg`}
										width={600}
									/>
								</div>
							)}
						</For>
					</div>
				</Show>
			</div>
		</div>
	);
}
