import { resolve } from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		environment: "node",
		setupFiles: ["src/test/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			reportsDirectory: "coverage",
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				// Test files and shared test setup are not production code
				"src/**/*.test.{ts,tsx}",
				"src/test/**",
				// Type-only modules and declarations have no runtime to cover
				"src/**/*.d.ts",
				"src/types/**",
				// Static data/constants without logic
				"src/constants/**",
				// Next.js framework glue, better covered by e2e
				"src/app/layout.tsx",
				"src/app/error.tsx",
				"src/app/global-error.tsx",
				// Route pages that only compose tested components and hooks
				"src/app/**/page.tsx",
				"src/app/**/layout.tsx",
				// Generated shadcn primitives with no local logic
				"src/components/ui/button.tsx",
				"src/components/ui/dialog.tsx",
				"src/components/ui/dropdown-menu.tsx",
				"src/components/ui/input.tsx",
				"src/components/ui/loader.tsx",
				"src/components/ui/sheet.tsx",
				"src/components/ui/tooltip.tsx"
			],
			// Ratchet only: raise as coverage improves, never lower
			thresholds: {
				statements: 80,
				branches: 80,
				functions: 80,
				lines: 70,
				// Pure logic is cheap to test, so hold it to a higher bar
				"src/lib/**": {
					statements: 90,
					branches: 90,
					functions: 90,
					lines: 90
				}
			}
		}
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src")
		}
	}
})
