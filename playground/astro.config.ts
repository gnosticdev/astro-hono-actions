// import cloudflare from "@astrojs/cloudflare";
import cloudflare from "@astrojs/cloudflare";
// import vercel from "@astrojs/vercel";
// import node from "@astrojs/node";
// import netlify from "@astrojs/netlify";
import requestState from "@inox-tools/request-state";
import tailwindcss from "@tailwindcss/vite";
import { createResolver } from "astro-integration-kit";
import { hmrIntegration } from "astro-integration-kit/dev";
import { defineConfig } from "astro/config";

const { default: honoActions } = await import("@gnosticdev/hono-actions");

// https://astro.build/config
export default defineConfig({
	output: "server",
	integrations: [
		requestState(),
		honoActions(),
		hmrIntegration({
			directory: createResolver(import.meta.url).resolve("../package/dist"),
		}),
	],
	server: {
		port: 4322,
	},
	env: {
		schema: {
			TEST_VAR: {
				access: "public",
				context: "server",
				type: "string",
			},
		},
	},

	adapter: cloudflare({platformProxy: {enabled: true, remoteBindings: false, persist: true}}),
	// adapter: vercel(),
	// 	adapter: node({mode: 'standalone'}),
	// adapter: netlify(),
	// adapter: vercel(),
	vite: {
		server: {
			strictPort: true,
			port: 4322,
		},
		plugins: [tailwindcss()],
	},
});
