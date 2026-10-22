import { redirect } from "next/navigation"
import { DEFAULT_PATH } from "@/lib/navigation"

export default function Home() {
	redirect(DEFAULT_PATH)
}
