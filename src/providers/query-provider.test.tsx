// @vitest-environment jsdom
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { QueryProvider } from "./query-provider"

function Probe() {
	const client = useQueryClient()
	const defaults = client.getDefaultOptions().queries
	return (
		<p>
			{String(defaults?.staleTime)}|{String(defaults?.refetchOnWindowFocus)}
		</p>
	)
}

function Data() {
	const { data } = useQuery({ queryKey: ["k"], queryFn: async () => "loaded" })
	return <p>{data ?? "pending"}</p>
}

const clients: unknown[] = []

function Capture() {
	clients.push(useQueryClient())
	return null
}

describe("QueryProvider", () => {
	it("renders its children", () => {
		render(
			<QueryProvider>
				<span>child</span>
			</QueryProvider>
		)

		expect(screen.getByText("child")).toBeInTheDocument()
	})

	it("configures a 30s stale time and refetch on window focus", () => {
		render(
			<QueryProvider>
				<Probe />
			</QueryProvider>
		)

		expect(screen.getByText("30000|true")).toBeInTheDocument()
	})

	it("lets descendants run queries", async () => {
		render(
			<QueryProvider>
				<Data />
			</QueryProvider>
		)

		expect(await screen.findByText("loaded")).toBeInTheDocument()
	})

	it("keeps the same client across re-renders", () => {
		clients.length = 0
		const { rerender } = render(
			<QueryProvider>
				<Capture />
			</QueryProvider>
		)

		rerender(
			<QueryProvider>
				<Capture />
			</QueryProvider>
		)

		expect(new Set(clients).size).toBe(1)
	})
})
