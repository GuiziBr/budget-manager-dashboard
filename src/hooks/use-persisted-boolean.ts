"use client"

import { useCallback, useSyncExternalStore } from "react"
import {
	readStoredBoolean,
	subscribeToStorage,
	writeStoredBoolean
} from "@/lib/storage"

/** A boolean remembered on this device. Renders the fallback on the server. */
export function usePersistedBoolean(
	key: string,
	fallback: boolean
): [boolean, (value: boolean) => void] {
	const value = useSyncExternalStore(
		subscribeToStorage,
		() => readStoredBoolean(key, fallback),
		() => fallback
	)
	const set = useCallback(
		(next: boolean) => writeStoredBoolean(key, next),
		[key]
	)
	return [value, set]
}
