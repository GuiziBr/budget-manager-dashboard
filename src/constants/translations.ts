export const translations = {
	common: {
		appName: "Budget Manager",
		page: "Page",
		of: "of",
		previousPage: "Previous page",
		nextPage: "Next page",
		pageNumber: "Page {n}",
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
		summary: {
			label: "Month summary",
			loading: "Loading summary",
			loadError: "Couldn't load the month summary",
			income: "Income",
			expenses: "Expenses",
			balance: "Balance",
			currency: "$",
			viewAll: "View all"
		},
		income: {
			title: "Income",
			description: "{month} income",
			loading: "Loading income",
			loadError: "Couldn't load the income",
			retry: "Retry",
			total: "Total income",
			ofSalary: "{amount} of this is salary",
			noSalary: "No salary this month",
			empty: "No income this month",
			salary: "Salary",
			received: "Received {date}",
			notReceived: "Not received yet",
			rowActions: "Actions for {item}",
			edit: "Edit",
			delete: "Delete",
			add: "Add income",
			close: "Close"
		},
		envelopes: {
			label: "Categories",
			title: "Categories",
			loading: "Loading envelopes",
			loadError: "Couldn't load the envelopes",
			hide: "Hide",
			show: "Show",
			overBudget: "{n} over budget",
			overBudgetShort: "{n} over",
			unavailable: "—",
			ofAllocated: "{spent} / {allocated}"
		},
		table: {
			label: "Expenses",
			loading: "Loading expenses",
			loadError: "Couldn't load the expenses",
			retry: "Retry",
			showing: "Showing {from}–{to} of {total} expenses",
			emptyTitle: "No expenses yet",
			addExpense: "Add expense",
			addButton: "Add",
			addButtonHint: "Drag to move, or use the arrow keys",
			columns: {
				number: "#",
				item: "Item",
				category: "Category",
				payment: "Payment Type",
				due: "Due",
				paid: "Paid",
				amount: "Amount",
				actions: "Actions"
			},
			noDate: "—",
			installment: "{n}/{total}",
			recurring: "{n}",
			overdue: "Overdue",
			dueOn: "Due {date}",
			paidOn: "Paid {date}",
			overdueOn: "Overdue · {date}",
			paidState: "Paid: {item}",
			unpaidState: "Not paid: {item}",
			rowActions: "Actions for {item}"
		},
		states: {
			loading: "Loading month",
			errorTitle: "Couldn't load your months",
			retry: "Retry",
			notOpenedTitle: "{month} hasn't been opened yet",
			openMonth: "Open {month}",
			notTracked: "{month} wasn't tracked in the app",
			closedBadge: "Closed",
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
