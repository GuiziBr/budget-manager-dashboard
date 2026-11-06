export type PageItem = number | "ellipsis"

/**
 * The page buttons to show: every page when there are few, otherwise the first,
 * the last and the pages around the current one, with an ellipsis for each gap
 * of two or more pages (a gap of one page shows that page instead).
 */
export function pageWindow(
	current: number,
	total: number,
	siblings = 1
): PageItem[] {
	if (total <= siblings * 2 + 5) {
		return Array.from({ length: total }, (_, index) => index + 1)
	}

	const start = Math.max(2, current - siblings)
	const end = Math.min(total - 1, current + siblings)
	const items: PageItem[] = [1]

	if (start === 3) items.push(2)
	else if (start > 3) items.push("ellipsis")

	for (let page = start; page <= end; page++) items.push(page)

	if (end === total - 2) items.push(total - 1)
	else if (end < total - 2) items.push("ellipsis")

	items.push(total)
	return items
}
