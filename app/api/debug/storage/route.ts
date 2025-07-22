import { NextResponse } from "next/server"
import { presenceStorage } from "@/lib/presence-storage"

export async function GET() {
  try {
    const stats = presenceStorage.getStats()
    const presenceData = presenceStorage.getAllPresence()
    const statusMessages = presenceStorage.getAllStatusMessages()

    return NextResponse.json({
      stats,
      presence_data: {
        count: presenceData.length,
        data: presenceData,
      },
      status_messages: {
        count: statusMessages.length,
        data: statusMessages,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Storage debug error:", error)
    return NextResponse.json(
      { error: "Failed to get storage data", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
