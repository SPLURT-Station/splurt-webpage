// @ts-check

import solidJs from "@astrojs/solid-js";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import favicons from "astro-favicons";
import Icons from "unplugin-icons/vite";
import solidSvg from "vite-plugin-solid-svg";

// https://astro.build/config
export default defineConfig({
	server: {
		port: 3000,
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
