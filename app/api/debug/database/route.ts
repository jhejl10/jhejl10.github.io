import { NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database-service"

export async function GET() {
  try {
    const [presenceStatuses, statusMessages, allUsersData] = await Promise.all([
      DatabaseService.getAllPresenceStatuses(),
      DatabaseService.getAllStatusMessages(),
      DatabaseService.getAllUsersData(),
    ])

    return NextResponse.json({
      database_status: "connected",
      presence_statuses: {
        count: presenceStatuses.length,
        data: presenceStatuses,
      },
      status_messages: {
        count: statusMessages.length,
        data: statusMessages,
      },
      combined_user_data: {
        count: allUsersData.length,
        data: allUsersData,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Database debug error:", error)
    return NextResponse.json(
      {
        database_status: "error",
        error: "Failed to get database data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
