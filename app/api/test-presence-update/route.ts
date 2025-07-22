import { NextResponse } from "next/server"
import { broadcastUpdate } from "@/app/api/events/route"

export async function POST(request: Request) {
  try {
    const { userId, presenceStatus } = await request.json()

    if (!userId || !presenceStatus) {
      return NextResponse.json({ error: "Missing userId or presenceStatus" }, { status: 400 })
    }

    // Broadcast a test presence update
    const testData = {
      type: "presence_update",
      userId: userId,
      presence_status: presenceStatus,
      timestamp: new Date().toISOString(),
    }

    console.log("=== MANUAL TEST PRESENCE UPDATE ===")
    console.log("Broadcasting test data:", testData)

    broadcastUpdate(testData)

    return NextResponse.json({
      success: true,
      message: "Test presence update sent",
      data: testData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Test presence update error:", error)
    return NextResponse.json({ error: "Failed to send test update" }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Send a POST request to test presence updates",
    example: {
      userId: "nrny-fa7r8axi_bbzfkexw",
      presenceStatus: "available",
    },
  })
}
