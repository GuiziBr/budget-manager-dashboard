import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from "@/components/ui/dialog"
import { translations } from "@/constants/translations"

interface MonthNotOpenedProps {
	label: string
	onOpen: () => void
	isOpening?: boolean
}

export function MonthNotOpened({
	label,
	onOpen,
	isOpening
}: MonthNotOpenedProps) {
	const t = translations.month.states
	const [confirming, setConfirming] = useState(false)

	const confirm = () => {
		setConfirming(false)
		onOpen()
	}

	return (
		<div className="flex min-h-[93px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-4 text-center sm:flex-row sm:justify-between sm:gap-4 sm:text-left">
			<p className="font-serif text-base font-bold text-foreground">
				{t.notOpenedTitle.replace("{month}", label)}
			</p>
			<Button onClick={() => setConfirming(true)} disabled={isOpening}>
				{t.openMonth.replace("{month}", label)}
			</Button>
			<Dialog open={confirming} onOpenChange={setConfirming}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>
							{t.openConfirmTitle.replace("{month}", label)}
						</DialogTitle>
						<DialogDescription className="pt-2">
							{t.openConfirmDescription.replace("{month}", label)}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="mt-6">
						<Button
							type="button"
							variant="outline"
							onClick={() => setConfirming(false)}
						>
							{translations.common.cancel}
						</Button>
						<Button type="button" onClick={confirm}>
							{t.openMonth.replace("{month}", label)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
