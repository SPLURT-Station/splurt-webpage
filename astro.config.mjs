// @ts-check
import { defineConfig } from "astro/config";

import favicons from "astro-favicons";

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
	],
});
