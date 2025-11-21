/**
 * Meta tag utility functions
 * These functions help generate Open Graph and Twitter Card meta tag URLs
 */

/**
 * Generate Open Graph image URL
 */
export function generateOGImageUrl(
	image: string | undefined,
	site: string | undefined,
	urlOrigin: string
): string {
	const baseImage = image || "/splurtpaw2_alt3.png";
	return new URL(baseImage, site || urlOrigin).href;
}

/**
 * Generate Twitter Card image URL based on strategy
 */
export function generateTwitterImageUrl(
	image: string | undefined,
	site: string | undefined,
	urlOrigin: string,
	strategy: "auto" | "thumbnail" | "logo" | "both" = "auto"
): string {
	if (strategy === "logo") {
		const logoImage = image || "/splurtpaw2_alt3.png";
		return new URL(logoImage, site || urlOrigin).href;
	}
	const thumbnailImage = image || "/splurtpaw2_alt3.png";
	return new URL(thumbnailImage, site || urlOrigin).href;
}
