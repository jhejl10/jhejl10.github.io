import { NextResponse } from "next/server"
import { broadcastUpdate } from "@/app/api/events/route"

export async function POST(request: Request) {
  try {
    const { userId, presenceStatus, statusMessage } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    // Test presence update
    if (presenceStatus) {
      const testPresenceData = {
        type: "presence_update",
        userId: userId,
        presence_status: presenceStatus,
        timestamp: new Date().toISOString(),
      }

      console.log("=== MANUAL TEST PRESENCE UPDATE (SSE) ===")
      console.log("Broadcasting test data:", testPresenceData)
      broadcastUpdate(testPresenceData)
    }

    // Test status message update
    if (statusMessage !== undefined) {
      const testMessageData = {
        type: "status_message_update",
        userId: userId,
        status_message: statusMessage,
        timestamp: new Date().toISOString(),
      }

      console.log("=== MANUAL TEST STATUS MESSAGE UPDATE (SSE) ===")
      console.log("Broadcasting test data:", testMessageData)
      broadcastUpdate(testMessageData)
    }

    return NextResponse.json({
      success: true,
      message: "Test updates sent via SSE",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Test SSE error:", error)
    return NextResponse.json({ error: "Failed to send test update" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Send a POST request to test SSE updates",
    example: {
      userId: "nrny-fa7r8axi_bbzfkexw",
      presenceStatus: "available",
      statusMessage: "Working from home",
    },
  })
}
