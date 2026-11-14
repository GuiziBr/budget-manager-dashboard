import { translations } from "@/constants/translations"
import { rowType } from "@/lib/month-rows"
import type { Expense } from "@/types"

const t = translations.month.delete

/** The confirmation text for deleting one expense, naming its kind and item. */
export function deleteMessage(expense: Expense): string {
	return t.confirm
		.replace("{type}", t.types[rowType(expense)])
		.replace("{item}", expense.description)
}
