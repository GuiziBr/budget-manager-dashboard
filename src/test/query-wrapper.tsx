import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

/**
 * Creates an isolated QueryClient (no retries) and a matching wrapper
 * for `renderHook`/`render`, so each test starts with a clean cache.
 */
export function createQueryWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false }
		}
	})

	function wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		)
	}

	return { queryClient, wrapper }
}
