// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { THEME_STORAGE_KEY } from "@/lib/theme"
import { ThemeProvider } from "@/providers/theme-provider"

const sonnerProps = vi.fn()

vi.mock("sonner", () => ({
	Toaster: (props: Record<string, unknown>) => {
		sonnerProps(props)
		return null
	}
}))

import { Toaster } from "./sonner"

const lastTheme = () => sonnerProps.mock.calls.at(-1)?.[0].theme

beforeEach(() => {
	sonnerProps.mockClear()
	window.localStorage.clear()
	document.documentElement.className = "dark"
})

describe("Toaster", () => {
	it("uses the dark theme by default", () => {
		render(
			<ThemeProvider>
				<Toaster />
			</ThemeProvider>
		)

		expect(lastTheme()).toBe("dark")
	})

	it("follows a stored light preference", () => {
		window.localStorage.setItem(THEME_STORAGE_KEY, "light")
		render(
			<ThemeProvider>
				<Toaster />
			</ThemeProvider>
		)

		expect(lastTheme()).toBe("light")
	})

	it("lets the caller override the theme", () => {
		render(
			<ThemeProvider>
				<Toaster theme="system" />
			</ThemeProvider>
		)

		expect(lastTheme()).toBe("system")
	})
})
