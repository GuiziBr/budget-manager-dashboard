import { Loader2 } from "lucide-react"
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

interface ConfirmDeleteModalProps {
	isOpen: boolean
	onClose: () => void
	onConfirm: () => void
	title: string
	description: string
	resourceName?: string | null
	isPending?: boolean
}

export function ConfirmDeleteModal({
	isOpen,
	onClose,
	onConfirm,
	title,
	description,
	resourceName,
	isPending = false
}: ConfirmDeleteModalProps) {
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription className="pt-2">
						{description}
						{resourceName && (
							<span className="block mt-2 font-medium text-foreground italic">
								"{resourceName}"
							</span>
						)}
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="mt-6">
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={isPending}
					>
						{translations.common.cancel}
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={onConfirm}
						disabled={isPending}
					>
						{isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							translations.common.delete
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
