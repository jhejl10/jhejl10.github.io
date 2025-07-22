import { Suspense } from "react"
import { PhoneDashboard } from "@/components/phone-dashboard"
import { Phone } from "lucide-react"
import { RefreshButton } from "@/components/refresh-button"
import { ThemeToggle } from "@/components/theme-toggle"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Phone className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-foreground">Zoom Phone Monitor</h1>
            </div>
            <div className="flex items-center gap-4">
              <RefreshButton />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          }
        >
          <PhoneDashboard />
        </Suspense>
      </main>
    </div>
  )
}
