/**
 * Media configuration utility
 * Centralizes environment variable reading for media gallery
 */

export type MediaSourceType = "url" | "folder";

export interface MediaSourceConfig {
	sourceType: MediaSourceType;
	baseUrl?: string;
	localFolder?: string;
	patterns: string[];
}

export interface MediaConfig {
	splashSource: MediaSourceConfig;
	screenshotSource: MediaSourceConfig;
	maxImages?: number;
	cacheDuration: number;
}

/**
 * Parse patterns from environment variable
 */
function parsePatterns(
	envVar: string | undefined,
	defaultPatterns: string
): string[] {
	return (envVar || defaultPatterns)
		.split(",")
		.map((p: string) => p.trim())
		.filter(Boolean);
}

/**
 * Get media source configuration
 */
function getMediaSourceConfig(options: {
	sourceTypeEnv?: string;
	baseUrlEnv?: string;
	localFolderEnv?: string;
	patternsEnv?: string;
	defaultPatterns: string;
}): MediaSourceConfig {
	const sourceType = (options.sourceTypeEnv || "url") as "url" | "folder";
	const patterns = parsePatterns(options.patternsEnv, options.defaultPatterns);

	return {
		sourceType,
		baseUrl: options.baseUrlEnv || undefined,
		localFolder: options.localFolderEnv || undefined,
		patterns,
	};
}

/**
 * Get media configuration from environment variables
 * Supports separate sources for splashscreens and screenshots
 */
export function getMediaConfig(): MediaConfig {
	// Splashscreen source configuration
	const splashSourceType = import.meta.env.PUBLIC_MEDIA_SPLASH_SOURCE_TYPE;
	const splashBaseUrl = import.meta.env.PUBLIC_MEDIA_SPLASH_BASE_URL;
	const splashLocalFolder = import.meta.env.MEDIA_SPLASH_LOCAL_FOLDER_PATH;
	const splashPatterns = import.meta.env.PUBLIC_MEDIA_SPLASH_PATTERNS;

	// Screenshot source configuration
	const screenshotSourceType = import.meta.env
		.PUBLIC_MEDIA_SCREENSHOT_SOURCE_TYPE;
	const screenshotBaseUrl = import.meta.env.PUBLIC_MEDIA_SCREENSHOT_BASE_URL;
	const screenshotLocalFolder = import.meta.env
		.MEDIA_SCREENSHOT_LOCAL_FOLDER_PATH;
	const screenshotPatterns = import.meta.env.PUBLIC_MEDIA_SCREENSHOT_PATTERNS;

	// Fallback to legacy single-source configuration if separate sources not provided
	const legacySourceType = import.meta.env.PUBLIC_MEDIA_SOURCE_TYPE;
	const legacyBaseUrl = import.meta.env.PUBLIC_MEDIA_BASE_URL;
	const legacyLocalFolder = import.meta.env.MEDIA_LOCAL_FOLDER_PATH;

	const splashSource = getMediaSourceConfig({
		sourceTypeEnv: splashSourceType || legacySourceType,
		baseUrlEnv: splashBaseUrl || legacyBaseUrl,
		localFolderEnv: splashLocalFolder || legacyLocalFolder,
		patternsEnv: splashPatterns,
		defaultPatterns: "*splashscreen*,*splash*",
	});

	const screenshotSource = getMediaSourceConfig({
		sourceTypeEnv: screenshotSourceType || legacySourceType,
		baseUrlEnv: screenshotBaseUrl || legacyBaseUrl,
		localFolderEnv: screenshotLocalFolder || legacyLocalFolder,
		patternsEnv: screenshotPatterns,
		defaultPatterns: "*.png,*.jpg,*.jpeg",
	});

	const maxImages = Number.parseInt(
		import.meta.env.PUBLIC_MEDIA_MAX_IMAGES_PER_CATEGORY || "50",
		10
	);
	const cacheDuration = Number.parseInt(
		import.meta.env.MEDIA_CACHE_DURATION || "3600",
		10
	);

	return {
		splashSource,
		screenshotSource,
		maxImages: maxImages > 0 ? maxImages : undefined,
		cacheDuration,
	};
}
