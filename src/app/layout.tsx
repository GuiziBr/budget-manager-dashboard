import type { Metadata } from "next"
import { Roboto, Roboto_Slab } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { THEME_INIT_SCRIPT } from "@/lib/theme"
import { QueryProvider } from "@/providers/query-provider"
import { ThemeProvider } from "@/providers/theme-provider"
import "./globals.css"

const robotoSlab = Roboto_Slab({
	variable: "--font-roboto-slab",
	subsets: ["latin"]
})

const roboto = Roboto({
	variable: "--font-roboto",
	subsets: ["latin"],
	weight: ["400", "500", "700"]
})

export const metadata: Metadata = {
	title: "Budget Manager",
	description: "Budget Manager Dashboard"
}

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang="en" className="dark" suppressHydrationWarning>
			<head>
				{/* biome-ignore lint/security/noDangerouslySetInnerHtml: static script that sets the theme class before first paint */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
			</head>
			<body className={`${robotoSlab.variable} ${roboto.variable} antialiased`}>
				<ThemeProvider>
					<QueryProvider>
						{children}
						<Toaster position="top-center" expand={true} richColors />
					</QueryProvider>
				</ThemeProvider>
			</body>
		</html>
	)
}
