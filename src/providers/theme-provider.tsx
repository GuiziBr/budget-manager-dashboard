"use client"

import {
	createContext,
	useCallback,
	useContext,
	useLayoutEffect,
	useMemo,
	useState
} from "react"
import {
	applyTheme,
	DEFAULT_THEME,
	getOppositeTheme,
	getStoredTheme,
	storeTheme,
	type Theme
} from "@/lib/theme"

interface ThemeContextValue {
	theme: Theme
	setTheme: (theme: Theme) => void
	toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)

	// The server and the first client render must both be DEFAULT_THEME (no
	// hydration mismatch). A layout effect syncs the stored choice before the
	// browser paints, so a light user never sees the dark toggle state.
	useLayoutEffect(() => {
		setThemeState(getStoredTheme())
	}, [])

	const setTheme = useCallback((next: Theme) => {
		setThemeState(next)
		applyTheme(next)
		storeTheme(next)
	}, [])

	const toggleTheme = useCallback(
		() => setTheme(getOppositeTheme(theme)),
		[theme, setTheme]
	)

	const value = useMemo(
		() => ({ theme, setTheme, toggleTheme }),
		[theme, setTheme, toggleTheme]
	)

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
	const context = useContext(ThemeContext)
	if (!context) throw new Error("useTheme must be used within a ThemeProvider")
	return context
}
