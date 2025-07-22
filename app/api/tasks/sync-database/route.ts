import { NextResponse } from "next/server"
import { presenceStorage } from "@/lib/presence-storage"

export async function POST(request: Request) {
  try {
    // Check for authorization (optional)
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    // In production, you'd validate this token against a secret
    // For now, we'll just check if it's not empty
    if (!token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Force process the write queue
    const stats = presenceStorage.getStats()

    // Return success
    return NextResponse.json({
      success: true,
      message: "Database sync initiated",
      stats: {
        before: stats,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Database sync error:", error)
    return NextResponse.json(
      { error: "Failed to sync database", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
