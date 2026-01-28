import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
	build: {
		lib: {
			entry: path.resolve(__dirname, "src/export.js"),
			name: "Vouivre", // nom global (UMD/IIFE)
			fileName: (format) => `vouivre.${format}.js`,
			formats: ["es", "cjs"],
		},
		rollupOptions: {
			external: ["lodash"],
		},
	},
});
