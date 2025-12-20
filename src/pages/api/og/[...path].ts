import { OGImageRoute } from "astro-og-canvas";

// Define pages with their titles and descriptions
// Use 'index' for home page to avoid empty string route issues
const pages: Record<string, { title: string; description?: string }> = {
	index: {
		title: "S.P.L.U.R.T. Station",
		description: "A NSFW furry roleplaying server for Space Station 13",
	},
	"how-to-play": {
		title: "How To Play",
		description: "Learn how to join and play on S.P.L.U.R.T. Station",
	},
	media: {
		title: "Media",
		description: "View splashscreens and in-game screenshots",
	},
};

export const { getStaticPaths, GET } = OGImageRoute({
	param: "path",
	pages,
	getImageOptions: (_path, page) => ({
		title: page.title,
		description: page.description,
		bgImage: {
			path: "./src/assets/backgrounds/thumbnail.png",
			fit: "cover",
			position: "center",
		},
		logo: {
			path: "./src/assets/logos/splurtpaw2_alt3.png",
			size: [200, 200],
		},
		fonts: ["./public/fonts/Pixellari.ttf"],
		font: {
			title: {
				families: ["Pixellari"],
				size: 80,
				color: [255, 128, 208], // --color-primary-light: #ff80d0
				weight: "Bold",
			},
			description: {
				families: ["Pixellari"],
				size: 40,
				color: [255, 255, 255],
				weight: "Bold",
			},
		},
		padding: 60,
		format: "PNG",
		quality: 90,
	}),
});
