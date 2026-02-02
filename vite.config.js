import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
	build: {
		lib: {
			entry: path.resolve(__dirname, "src/export.js"),
			name: "vouivre", // nom global (UMD/IIFE)
			fileName: (format) => (format == "iife" ? "vouivre.min.js" : `vouivre.${format}.js`),
			formats: ["es", "cjs", "iife"],
		},
		rollupOptions: {
			external: ["lodash"],
		},
	},
});
