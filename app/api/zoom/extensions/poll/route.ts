import { NextResponse } from "next/server"
import { getPhoneExtensions } from "@/lib/zoom-api"

export async function GET() {
  try {
    console.log("Polling endpoint called")

    // Get fresh extension data
    const extensions = await getPhoneExtensions()

    return NextResponse.json({
      success: true,
      extensions,
      timestamp: new Date().toISOString(),
      count: extensions.length,
    })
  } catch (error) {
    console.error("Polling endpoint error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch extensions",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
