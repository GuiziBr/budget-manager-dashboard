const listeners = new Set<() => void>()

export const readStoredBoolean = (key: string, fallback: boolean): boolean => {
	try {
		const stored = window.localStorage.getItem(key)
		if (stored === "true") return true
		if (stored === "false") return false
		return fallback
	} catch {
		return fallback
	}
}

export const writeStoredBoolean = (key: string, value: boolean) => {
	try {
		window.localStorage.setItem(key, String(value))
	} catch {
		// Storage can be blocked (private mode); the choice still applies until reload.
	}
	for (const listener of listeners) listener()
}

export const readStoredString = (key: string): string | null => {
	try {
		return window.localStorage.getItem(key)
	} catch {
		return null
	}
}

/** Stores a string, or removes the entry when `value` is null. */
export const writeStoredString = (key: string, value: string | null) => {
	try {
		if (value === null) window.localStorage.removeItem(key)
		else window.localStorage.setItem(key, value)
	} catch {
		// Storage can be blocked (private mode); the choice still applies until reload.
	}
	for (const listener of listeners) listener()
}

export const subscribeToStorage = (listener: () => void) => {
	listeners.add(listener)
	window.addEventListener("storage", listener)
	return () => {
		listeners.delete(listener)
		window.removeEventListener("storage", listener)
	}
}
