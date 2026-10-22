// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import { THEME_STORAGE_KEY } from "@/lib/theme"
import { ThemeProvider, useTheme } from "./theme-provider"

const renderedThemes: string[] = []

function ShowTheme() {
	const { theme } = useTheme()
	renderedThemes.push(theme)
	return <p>{theme}</p>
}

const tree = (
	<ThemeProvider>
		<ShowTheme />
	</ThemeProvider>
)

beforeEach(() => {
	renderedThemes.length = 0
	window.localStorage.clear()
	document.documentElement.className = "dark"
})

describe("ThemeProvider", () => {
	it("renders the default theme first, whatever is stored, so it matches the server", () => {
		window.localStorage.setItem(THEME_STORAGE_KEY, "light")
		render(tree)

		expect(renderedThemes[0]).toBe("dark")
		expect(renderedThemes.at(-1)).toBe("light")
	})

	it("shows a stored light preference as soon as it has rendered", () => {
		window.localStorage.setItem(THEME_STORAGE_KEY, "light")
		render(tree)

		expect(screen.getByText("light")).toBeInTheDocument()
	})

	it("stays dark when nothing valid is stored", () => {
		window.localStorage.setItem(THEME_STORAGE_KEY, "sepia")
		render(tree)

		expect(screen.getByText("dark")).toBeInTheDocument()
	})

	it("fails loudly when used without a provider", () => {
		expect(() => render(<ShowTheme />)).toThrow(/ThemeProvider/)
	})
})
