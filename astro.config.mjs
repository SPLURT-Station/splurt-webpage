// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://splurt-station.github.io", // Replace 'username' with your GitHub username
  base: "/splurt-webpage", // Replace with your repository name if different
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    assets: "assets",
  },
});
