import { createSignal, onCleanup, onMount, Show } from "solid-js";
import YouTubePlayer from "youtube-player";
import type YouTubePlayerType from "youtube-player/dist/types";
import soundOffIcon from "/src/assets/images/sound_off.png";
import soundOnIcon from "/src/assets/images/sound_on.png";
import "./music-player.css";

const STORAGE_KEY_MUTED = "music-player-muted";
const STORAGE_KEY_PLAYLIST_INDEX = "music-player-playlist-index";
const STORAGE_KEY_PLAYLIST_CACHE = "music-player-playlist-cache";
const STORAGE_KEY_CACHE_TIMESTAMP = "music-player-cache-timestamp";

// Cache expiration: 24 hours
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000;

// Regex patterns
const PLAYLIST_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const URL_LIST_REGEX = /[?&]list=([a-zA-Z0-9_-]+)/;
const PLAYLIST_URL_REGEX = /playlist\/([a-zA-Z0-9_-]+)/;

interface PlaylistItem {
	videoId: string;
	title: string;
}

interface CachedPlaylist {
	playlistId: string;
	items: PlaylistItem[];
	timestamp: number;
}

// Extract playlist ID from URL or use as-is
function extractPlaylistId(playlistInput: string): string | null {
	if (!playlistInput) {
		return null;
	}

	// If it's already just an ID
	if (PLAYLIST_ID_REGEX.test(playlistInput)) {
		return playlistInput;
	}

	// Try to extract from URL
	const urlMatch = playlistInput.match(URL_LIST_REGEX);
	if (urlMatch) {
		return urlMatch[1];
	}

	// Try to extract from playlist URL format
	const playlistMatch = playlistInput.match(PLAYLIST_URL_REGEX);
	if (playlistMatch) {
		return playlistMatch[1];
	}

	return null;
}

// Fetch all playlist items using YouTube Data API with pagination
async function fetchAllPlaylistItems(
	playlistId: string,
	apiKey: string
): Promise<PlaylistItem[]> {
	const items: PlaylistItem[] = [];
	let nextPageToken: string | undefined;

	try {
		do {
			const url = new URL(
				"https://www.googleapis.com/youtube/v3/playlistItems"
			);
			url.searchParams.set("part", "snippet");
			url.searchParams.set("playlistId", playlistId);
			url.searchParams.set("maxResults", "50");
			url.searchParams.set("key", apiKey);
			if (nextPageToken) {
				url.searchParams.set("pageToken", nextPageToken);
			}

			const response = await fetch(url.toString());
			const data = (await response.json()) as {
				items?: Array<{
					snippet: {
						resourceId: { videoId: string };
						title: string;
					};
				}>;
				nextPageToken?: string;
			};

			if (data.items) {
				for (const item of data.items) {
					items.push({
						videoId: item.snippet.resourceId.videoId,
						title: item.snippet.title,
					});
				}
			}

			nextPageToken = data.nextPageToken;
		} while (nextPageToken);
	} catch (error) {
		console.error("Error fetching playlist items:", error);
	}

	return items;
}

// Get cached playlist or null if expired/missing
function getCachedPlaylist(playlistId: string): PlaylistItem[] | null {
	try {
		const cachedStr = localStorage.getItem(STORAGE_KEY_PLAYLIST_CACHE);
		const timestampStr = localStorage.getItem(STORAGE_KEY_CACHE_TIMESTAMP);

		if (!(cachedStr && timestampStr)) {
			return null;
		}

		const cached: CachedPlaylist = JSON.parse(cachedStr);
		const timestamp = Number.parseInt(timestampStr, 10);

		// Check if cache is for the same playlist
		if (cached.playlistId !== playlistId) {
			return null;
		}

		// Check if cache is expired
		const now = Date.now();
		if (now - timestamp > CACHE_EXPIRATION_MS) {
			return null;
		}

		return cached.items;
	} catch {
		return null;
	}
}

// Save playlist to cache
function savePlaylistToCache(playlistId: string, items: PlaylistItem[]) {
	const cached: CachedPlaylist = {
		playlistId,
		items,
		timestamp: Date.now(),
	};
	localStorage.setItem(STORAGE_KEY_PLAYLIST_CACHE, JSON.stringify(cached));
	localStorage.setItem(STORAGE_KEY_CACHE_TIMESTAMP, String(Date.now()));
}

export default function MusicPlayer() {
	const [isMuted, setIsMuted] = createSignal(false);
	const [isVisible, setIsVisible] = createSignal(false);
	const [isReady, setIsReady] = createSignal(false);
	const [hasUserInteracted, setHasUserInteracted] = createSignal(false);
	const [currentTrackIndex, setCurrentTrackIndex] = createSignal(0);
	const [playlistItems, setPlaylistItems] = createSignal<PlaylistItem[]>([]);
	const [playlistId, setPlaylistId] = createSignal<string | null>(null);
	const [player, setPlayer] =
		createSignal<YouTubePlayerType.YouTubePlayer | null>(null);

	let playerContainer: HTMLDivElement | undefined;
	let interactionListenersAttached = false;
	let interactionHandlers: Array<() => void> = [];

	// Get current track from index
	const getCurrentTrack = (): PlaylistItem | null => {
		const items = playlistItems();
		const index = currentTrackIndex();
		return items[index] || null;
	};

	// Save current index to localStorage
	const saveCurrentIndex = (index: number) => {
		setCurrentTrackIndex(index);
		localStorage.setItem(STORAGE_KEY_PLAYLIST_INDEX, String(index));
	};

	// Load video by index
	const loadVideo = async (index: number) => {
		const items = playlistItems();
		if (index < 0 || index >= items.length) {
			return;
		}

		const track = items[index];
		const p = player();
		if (!p) {
			return;
		}

		try {
			// Load individual video with loop enabled
			await p.loadVideoById({
				videoId: track.videoId,
				startSeconds: 0,
			});
			saveCurrentIndex(index);
		} catch (error) {
			console.error("Error loading video:", error);
		}
	};

	// Load saved mute state from localStorage
	const loadSavedMuteState = () => {
		const savedMuted = localStorage.getItem(STORAGE_KEY_MUTED);
		if (savedMuted !== null) {
			setIsMuted(savedMuted === "true");
		} else {
			setIsMuted(false); // Default to sound on
		}
	};

	// Load playlist items with caching
	const loadPlaylistItems = async (
		id: string,
		apiKey: string
	): Promise<PlaylistItem[]> => {
		// Try to get cached playlist first
		let items = getCachedPlaylist(id);

		// If no cache or expired, fetch from API
		if (!items || items.length === 0) {
			items = await fetchAllPlaylistItems(id, apiKey);
			if (items.length > 0) {
				savePlaylistToCache(id, items);
			}
		}

		return items;
	};

	// Calculate initial track index
	const calculateInitialIndex = (items: PlaylistItem[]): number => {
		const savedIndex = localStorage.getItem(STORAGE_KEY_PLAYLIST_INDEX);
		if (savedIndex) {
			return Math.min(Number.parseInt(savedIndex, 10), items.length - 1);
		}

		// No saved index - use default from env if set
		const defaultIndexStr = import.meta.env.PUBLIC_YOUTUBE_DEFAULT_SONG_INDEX;
		if (defaultIndexStr) {
			const defaultIndex = Number.parseInt(defaultIndexStr, 10);
			if (!Number.isNaN(defaultIndex) && defaultIndex >= 0) {
				return Math.min(defaultIndex, items.length - 1);
			}
		}

		return 0;
	};

	onMount(async () => {
		// Check if playlist is configured
		const playlistConfig =
			import.meta.env.PUBLIC_YOUTUBE_PLAYLIST_ID ||
			import.meta.env.PUBLIC_YOUTUBE_PLAYLIST_URL;
		const apiKey = import.meta.env.PUBLIC_YOUTUBE_API_KEY;

		if (!(playlistConfig && apiKey)) {
			return;
		}

		const extractedPlaylistId = extractPlaylistId(playlistConfig);
		if (!extractedPlaylistId) {
			console.error("Invalid playlist ID or URL");
			return;
		}

		setPlaylistId(extractedPlaylistId);
		loadSavedMuteState();

		const items = await loadPlaylistItems(extractedPlaylistId, apiKey);
		if (items.length === 0) {
			console.error("No playlist items found");
			return;
		}

		setPlaylistItems(items);
		const initialIndex = calculateInitialIndex(items);
		setCurrentTrackIndex(initialIndex);

		// Start playback after user interaction (for unmuted state)
		const startPlaybackAfterInteraction = async (
			ytPlayerInstance: YouTubePlayerType.YouTubePlayer
		) => {
			await ytPlayerInstance.unMute();
			try {
				const playerState = await ytPlayerInstance.getPlayerState();
				if (playerState !== 1) {
					await ytPlayerInstance.playVideo();
				}
			} catch (error) {
				console.warn("Error starting playback:", error);
			}
			setIsVisible(true);
		};

		// Setup interaction listeners for autoplay
		const setupInteractionListeners = (
			ytPlayerInstance: YouTubePlayerType.YouTubePlayer
		) => {
			if (interactionListenersAttached) {
				return;
			}

			interactionListenersAttached = true;

			const handleUserInteraction = async () => {
				if (!hasUserInteracted()) {
					setHasUserInteracted(true);
					await startPlaybackAfterInteraction(ytPlayerInstance);
					cleanupInteractionListeners();
				}
			};

			const cleanupInteractionListeners = () => {
				document.removeEventListener("click", handleUserInteraction);
				document.removeEventListener("keydown", handleUserInteraction);
				document.removeEventListener("touchstart", handleUserInteraction);
				interactionHandlers = [];
			};

			interactionHandlers.push(cleanupInteractionListeners);

			document.addEventListener("click", handleUserInteraction, {
				once: true,
				passive: true,
			});
			document.addEventListener("keydown", handleUserInteraction, {
				once: true,
				passive: true,
			});
			document.addEventListener("touchstart", handleUserInteraction, {
				once: true,
				passive: true,
			});
		};

		// Initialize playback state
		const initializePlayback = async (
			ytPlayerInstance: YouTubePlayerType.YouTubePlayer
		) => {
			if (isMuted()) {
				await ytPlayerInstance.mute();
				await ytPlayerInstance.pauseVideo();
				setIsVisible(true);
			} else {
				await ytPlayerInstance.unMute();
				await ytPlayerInstance.pauseVideo();
				setupInteractionListeners(ytPlayerInstance);
			}
		};

		// Handle video looping when it ends
		const handleStateChange = async (
			ytPlayerInstance: YouTubePlayerType.YouTubePlayer,
			event: { data: number }
		) => {
			try {
				// YT.PlayerState.ENDED = 0
				if (event.data === 0) {
					// Video ended - restart from beginning
					const trackIndex = currentTrackIndex();
					const playlist = playlistItems();
					const track = playlist[trackIndex];
					if (track) {
						await ytPlayerInstance.seekTo(0, true);
						if (!isMuted()) {
							await ytPlayerInstance.playVideo();
						}
					}
				}
			} catch (error) {
				console.error("Error in stateChange handler:", error);
			}
		};

		// Initialize player
		const initPlayer = () => {
			const container = playerContainer;
			if (!container) {
				setTimeout(initPlayer, 10);
				return;
			}

			const currentTrack = items[initialIndex];
			if (!currentTrack) {
				return;
			}

			const ytPlayer = YouTubePlayer(container, {
				width: 0,
				height: 0,
				playerVars: {
					autoplay: 0,
					controls: 0,
					disablekb: 1,
					fs: 0,
					iv_load_policy: 3,
					modestbranding: 1,
					playsinline: 1,
					rel: 0,
				},
			});

			setPlayer(ytPlayer);

			// Handle video looping when it ends
			ytPlayer.on("stateChange", (event) => {
				handleStateChange(ytPlayer, event);
			});

			// Listen for player ready
			ytPlayer.on("ready", async () => {
				setIsReady(true);

				// Set volume to 25
				await ytPlayer.setVolume(25);

				// Load the initial video
				await ytPlayer.loadVideoById({
					videoId: currentTrack.videoId,
					startSeconds: 0,
				});

				// Initialize playback state
				await initializePlayback(ytPlayer);
			});
		};

		initPlayer();
	});

	onCleanup(() => {
		const p = player();
		if (p) {
			p.destroy();
		}
		for (const cleanup of interactionHandlers) {
			cleanup();
		}
		interactionHandlers = [];
	});

	const handleMute = async (p: YouTubePlayerType.YouTubePlayer) => {
		await p.mute();
		await p.pauseVideo();
	};

	const handleUnmute = async (p: YouTubePlayerType.YouTubePlayer) => {
		await p.unMute();
		if (!isVisible()) {
			setIsVisible(true);
		}
		try {
			const playerState = await p.getPlayerState();
			if (playerState !== 1) {
				await p.playVideo();
			}
		} catch {
			await p.playVideo();
		}
	};

	const toggleMute = async () => {
		const p = player();
		if (!p) {
			return;
		}

		const newMutedState = !isMuted();
		setIsMuted(newMutedState);
		localStorage.setItem(STORAGE_KEY_MUTED, String(newMutedState));

		if (!hasUserInteracted()) {
			setHasUserInteracted(true);
		}

		if (newMutedState) {
			await handleMute(p);
		} else {
			await handleUnmute(p);
		}
	};

	const playPrevious = async () => {
		const items = playlistItems();
		const currentIndex = currentTrackIndex();
		const newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
		await loadVideo(newIndex);
	};

	const playNext = async () => {
		const items = playlistItems();
		const currentIndex = currentTrackIndex();
		const newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
		await loadVideo(newIndex);
	};

	return (
		<>
			<div
				class="music-player-iframe-container"
				ref={(el) => {
					playerContainer = el;
				}}
			/>
			<Show when={isVisible()}>
				<div
					class="music-player-container"
					classList={{ "music-player-ready": isReady() }}
				>
					<div class="music-player-controls">
						<button
							aria-label={isMuted() ? "Unmute music" : "Mute music"}
							class="music-player-button"
							onClick={toggleMute}
							type="button"
						>
							<img
								alt={isMuted() ? "Sound off" : "Sound on"}
								class="music-player-icon"
								height="64"
								src={isMuted() ? soundOffIcon.src : soundOnIcon.src}
								width="64"
							/>
						</button>
					</div>
					<Show when={getCurrentTrack()}>
						<div class="music-player-track-info">
							<button
								aria-label="Previous track"
								class="music-player-nav-button music-player-nav-button--left"
								onClick={playPrevious}
								type="button"
							>
								«
							</button>
							<a
								class="music-player-track-title"
								href={`https://www.youtube.com/watch?v=${getCurrentTrack()?.videoId}${playlistId() ? `&list=${playlistId()}` : ""}`}
								rel="noopener noreferrer"
								target="_blank"
							>
								{getCurrentTrack()?.title}
							</a>
							<button
								aria-label="Next track"
								class="music-player-nav-button music-player-nav-button--right"
								onClick={playNext}
								type="button"
							>
								»
							</button>
						</div>
					</Show>
				</div>
			</Show>
		</>
	);
}
