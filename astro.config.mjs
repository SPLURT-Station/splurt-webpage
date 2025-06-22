// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

import favicons from "astro-favicons";

// https://astro.build/config
export default defineConfig({
  // Replace 'username' with your GitHub username
  site: "https://splurt-station.github.io",

  // Replace with your repository name if different
  base: "/splurt-webpage",

  vite: {
    plugins: [tailwindcss()],
  },

  build: {
    assets: "assets",
  },

  integrations: [
    favicons({
      input: {
        favicons: ["public/splurtpaw2_alt3.png"],
      },
      name: "S.P.L.U.R.T. Station",
      short_name: "S.P.L.U.R.T.",
      background: "#000000",
      themes: ["#000000", "#ffffff"],
    }),
  ],
});
