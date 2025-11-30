import type { Config } from "tailwindcss";

export default {
	// Theme variables are now defined in CSS using @theme directive
	// See src/styles/index.css for theme variable definitions
	// This config is kept for TypeScript type checking and any future plugin needs
	theme: {
		extend: {},
	},
	plugins: [],
} satisfies Config;
