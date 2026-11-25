// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import { type RefObject, useRef } from "react"
import { describe, expect, it, vi } from "vitest"
import { DetailsSheet } from "./DetailsSheet"

vi.mock("@/hooks/use-media-query", () => ({
	PHONE_QUERY: "phone",
	useMediaQuery: () => false
}))

function Harness({
	open,
	showOpener,
	opener,
	fallback
}: {
	open: boolean
	showOpener: boolean
	opener: RefObject<HTMLButtonElement | null>
	fallback: RefObject<HTMLDivElement | null>
}) {
	return (
		<>
			{showOpener && (
				<button type="button" ref={opener}>
					opener
				</button>
			)}
			<div ref={fallback} tabIndex={-1} data-testid="fallback" />
			<DetailsSheet
				open={open}
				onOpenChange={() => {}}
				title="Panel"
				description="A panel"
				returnFocusRef={opener}
				fallbackFocusRef={fallback}
			>
				<p>body</p>
			</DetailsSheet>
		</>
	)
}

function Wrapper(props: { open: boolean; showOpener: boolean }) {
	const opener = useRef<HTMLButtonElement>(null)
	const fallback = useRef<HTMLDivElement>(null)
	return <Harness {...props} opener={opener} fallback={fallback} />
}

describe("DetailsSheet focus on close", () => {
	it("returns the focus to the opener while it is on the page", async () => {
		const { rerender } = render(<Wrapper open showOpener />)
		await screen.findByText("body")
		rerender(<Wrapper open={false} showOpener />)
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "opener" })).toHaveFocus()
		)
	})

	it("falls back to the given target when the opener left the page", async () => {
		const { rerender } = render(<Wrapper open showOpener />)
		await screen.findByText("body")
		rerender(<Wrapper open showOpener={false} />)
		rerender(<Wrapper open={false} showOpener={false} />)
		await waitFor(() => expect(screen.getByTestId("fallback")).toHaveFocus())
	})
})
