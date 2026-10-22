import { AppSidebar } from "@/components/AppSidebar"
import { BottomTabBar } from "@/components/BottomTabBar"
import { TopBar } from "@/components/TopBar"

export default function AppLayout({
	children
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<div className="min-h-screen bg-background lg:flex">
			<AppSidebar className="sticky top-0 hidden h-screen lg:flex" />
			<div className="min-w-0 flex-1 py-8 pb-28 lg:flex lg:h-screen lg:flex-col lg:pb-0">
				<TopBar />
				{/* From lg the page scrolls inside this region, so a table can scroll on its own */}
				<div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-6">
					{children}
				</div>
			</div>
			<BottomTabBar className="lg:hidden" />
		</div>
	)
}
