// @ts-check

import sitemap from "@astrojs/sitemap";
import solidJs from "@astrojs/solid-js";
import nurodevbun from "@nurodev/astro-bun";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import favicons from "astro-favicons";
import vtbot from "astro-vtbot";
import UnfontsAstro from "unplugin-fonts/astro";
import Icons from "unplugin-icons/vite";
import solidSvg from "vite-plugin-solid-svg";

// https://astro.build/config
export default defineConfig({
	site: "https://splurt.space",
	adapter: nurodevbun(),
	output: "static",
	image: {
		// Allow remote image optimization from any HTTPS source
		// For production, consider restricting to specific domains
		remotePatterns: [{ protocol: "https" }],
		// Optional: specify domains explicitly for better security
		// domains: ["splurt.space", "example.com"],
	},
	integrations: [
		favicons({
			input: {
				favicons: ["public/splurtpaw2_alt3.png"],
			},
			name: "S.P.L.U.R.T. Station",
			short_name: "S.P.L.U.R.T.",
			background: "#000000",
			themes: ["#ff50b0", "#1a0b2e"],
		}),
		solidJs(),
		UnfontsAstro({
			google: {
				preconnect: false,
				families: [
					{
						name: "Inter",
						styles: "ital,opsz,wght@0,14..32,100..900;1,14..32,100..900",
						defer: true,
					},
				],
			},
			custom: {
				families: [
					{ name: "SpessFont", src: "/public/fonts/SpessFont.ttf" },
					{ name: "Grand9K Pixel", src: "/public/fonts/Grand9K Pixel.ttf" },
					{ name: "Pixellari", src: "/public/fonts/Pixellari.ttf" },
					{ name: "VCR OSD Mono", src: "/public/fonts/VCR_OSD_MONO_1.001.ttf" },
					{ name: "TinyUnicode", src: "/public/fonts/TinyUnicode.ttf" },
				],
			},
		}),
		vtbot(),
		sitemap(),
	],

	vite: {
		plugins: [
			tailwindcss(),
			solidSvg({
				defaultAsComponent: false,
			}),
			Icons({
				compiler: "astro",
			}),
		],
	},
});
