export type Theme = "light" | "dark"

export const THEME_STORAGE_KEY = "theme"
export const DEFAULT_THEME: Theme = "dark"

export const isTheme = (value: unknown): value is Theme =>
	value === "light" || value === "dark"

export const getStoredTheme = (): Theme => {
	try {
		const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
		return isTheme(stored) ? stored : DEFAULT_THEME
	} catch {
		return DEFAULT_THEME
	}
}

export const storeTheme = (theme: Theme) => {
	try {
		window.localStorage.setItem(THEME_STORAGE_KEY, theme)
	} catch {
		// Storage can be blocked (private mode); the theme still applies for this visit.
	}
}

export const applyTheme = (theme: Theme) => {
	document.documentElement.classList.toggle("dark", theme === "dark")
}

export const getOppositeTheme = (theme: Theme): Theme =>
	theme === "dark" ? "light" : "dark"

/**
 * Runs before first paint (inlined in <head>) so a stored light preference
 * never flashes the dark default. Keep it dependency-free and in sync with
 * THEME_STORAGE_KEY and DEFAULT_THEME above.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");document.documentElement.classList.toggle("dark",t!=="light")}catch(e){}`
