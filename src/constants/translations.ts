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
			paidFailed: "Couldn't update the paid status. Try again.",
			rowActions: "Actions for {item}"
		},
		addMenu: {
			trigger: "Add",
			expense: { label: "Expense", hint: "A purchase or a bill" },
			income: { label: "Income", hint: "Salary or other money in" },
			envelope: {
				label: "Envelope",
				hint: "Set aside a budget for a category"
			}
		},
		form: {
			title: "Add expense",
			description: "Add an expense to {month}",
			loading: "Loading the form",
			loadError: "Couldn't load the form options",
			retry: "Retry",
			none: "None",
			fields: {
				description: "Description",
				category: "Category",
				paymentType: "Payment type",
				bank: "Bank",
				store: "Store",
				amount: "Amount",
				purchased: "Purchased",
				due: "Due",
				paid: "Paid"
			},
			placeholders: {
				description: "What did you pay for?",
				category: "Select a category",
				paymentType: "Select type",
				bank: "Select bank",
				store: "Optional",
				amount: "0.00"
			},
			validation: {
				description: "Enter a description.",
				category: "Choose a category.",
				paymentType: "Choose a payment type.",
				amount: "Enter an amount above 0, up to 2 decimals.",
				amountTooLarge: "The amount can't be more than 99,999,999.99."
			},
			finishClose: "Finish & close",
			finishAddAnother: "Finish & add another",
			cancel: "Cancel",
			saved: "{item} added to {month}."
		},
		details: {
			close: "Close",
			previousExpense: "Previous expense",
			nextExpense: "Next expense",
			position: "Expense {n} of {total}",
			previousEnvelope: "Previous category",
			nextEnvelope: "Next category",
			envelopePosition: "Category {n} of {total}",
			expenseDescription: "Details of this expense",
			envelopeDescription: "{month} budget for this category",
			deleted: "(deleted)",
			expenseNotFound: "This expense no longer exists.",
			envelopeNotFound: "This envelope no longer exists.",
			status: {
				paid: "Paid",
				unpaid: "Not paid",
				overdue: "Overdue"
			},
			sectionsLabel: "Expense sections",
			sections: {
				payment: "Payment",
				dates: "Dates",
				plan: "Installment plan",
				recurring: "Recurring bill"
			},
			fields: {
				status: "Status",
				paymentType: "Payment type",
				bank: "Bank",
				store: "Store",
				purchased: "Purchased",
				due: "Due",
				paid: "Paid",
				payment: "Payment",
				interval: "Interval",
				firstPurchase: "First purchase",
				endDate: "Last payment",
				month: "Running",
				started: "Started",
				spent: "Spent",
				budget: "Budget",
				remaining: "Remaining",
				updated: "Spend updated"
			},
			none: "—",
			installmentProgress: "{n} of {total}",
			intervalDays: "Every {days} days",
			recurringMonth: "Month {n}",
			spendUnavailable: "Spend unavailable right now",
			overBy: "Over by {amount}",
			viewRecurring: "View on Recurring",
			markPaid: "Mark as paid today",
			markUnpaid: "Mark as unpaid",
			edit: "Edit",
			delete: "Delete"
		},
		states: {
			loading: "Loading month",
			errorTitle: "Couldn't load your months",
			retry: "Retry",
			notOpenedTitle: "{month} hasn't been opened yet",
			openMonth: "Open {month}",
			notTracked: "{month} wasn't tracked in the app",
			pastBadge: "Past month",
			pastNote:
				"You can edit this month. Envelopes of past months can't be changed."
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
		monthClosed: "Envelopes of past months can't be changed.",
		futureDate: "The purchase date can't be in the future.",
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
