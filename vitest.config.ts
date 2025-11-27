/// <reference types="vitest/config" />

import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: { label: "hono-actions-integration", color: "cyan" },
					include: ["package/**/*.test.ts"],
				},
				resolve: {
					alias: {
						"@gnosticdev/hono-actions": path.resolve(
							import.meta.url,
							"package/src/actions.ts",
						),
					},
				},
			},
		],
	},
});
