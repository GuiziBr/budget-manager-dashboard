export const translations = {
	common: {
		appName: "Budget Manager",
		page: "Page",
		of: "of",
		firstPage: "First page",
		previousPage: "Previous page",
		nextPage: "Next page",
		lastPage: "Last page",
		pagination: "Pagination",
		cancel: "Cancel",
		save: "Save",
		delete: "Delete"
	},
	theme: {
		switchToLight: "Switch to light theme",
		switchToDark: "Switch to dark theme"
	},
	navigation: {
		mainLabel: "Main",
		tabBarLabel: "Primary",
		overview: "Overview",
		tabs: {
			dashboard: "Dashboard",
			more: "More"
		}
	},
	dashboard: {
		title: "Dashboard",
		emptyTitle: "Nothing here yet",
		emptyDescription: "Start building your budget manager from this page."
	},
	errors: {
		monthExists: "{month} is already open.",
		monthNotEmpty: "Remove this month's expenses, incomes and envelopes first.",
		envelopeExists: "{category} already has an envelope this month.",
		bankRequired: "Bank is required for this payment type.",
		noPeriodForInstallments:
			"Open the month of the first payment before adding this plan.",
		lookupGone: "{field} no longer exists. Choose another.",
		monthClosed: "This month is now closed and can't be changed.",
		generic: "Something went wrong. Try again.",
		fields: {
			category: "Category",
			paymentType: "Payment type",
			bank: "Bank",
			store: "Store"
		}
	},
	errorBoundary: {
		title: "Something went wrong",
		description: "An unexpected error occurred. Please try again.",
		retry: "Try again"
	}
}
