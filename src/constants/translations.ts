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
		items: {
			month: "Month",
			recurring: "Recurring",
			settings: "Settings"
		},
		tabs: {
			more: "More"
		}
	},
	comingSoon: {
		title: "Coming soon",
		description: "This screen is not available yet."
	},
	month: {
		previous: "Previous month: {month}",
		next: "Next month: {month}",
		switcherLabel: "{month}, choose a month",
		moreActions: "Month actions",
		noOpenedMonths: "No opened months yet",
		states: {
			loading: "Loading month",
			errorTitle: "Couldn't load your months",
			retry: "Retry",
			notOpenedTitle: "{month} hasn't been opened yet",
			openMonth: "Open {month}",
			notTracked: "{month} wasn't tracked in the app",
			closedBanner: "{month} is closed. You can view it but not change it."
		}
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
