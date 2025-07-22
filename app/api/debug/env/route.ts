import { NextResponse } from "next/server"

export async function GET() {
  // Only show this in development or if a specific debug header is present
  const isDev = process.env.NODE_ENV === "development"

  if (!isDev) {
    return NextResponse.json({ error: "Debug endpoint only available in development" }, { status: 403 })
  }

  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    hasZoomApiKey: !!process.env.ZOOM_API_KEY,
    hasZoomApiSecret: !!process.env.ZOOM_API_SECRET,
    hasZoomAccountId: !!process.env.ZOOM_ACCOUNT_ID,
    hasWebhookSecret: !!process.env.ZOOM_WEBHOOK_SECRET_TOKEN,
    // Show partial values for debugging (first 4 chars + length)
    zoomApiKeyPreview: process.env.ZOOM_API_KEY
      ? `${process.env.ZOOM_API_KEY.substring(0, 4)}...(${process.env.ZOOM_API_KEY.length} chars)`
      : "NOT SET",
    zoomAccountIdPreview: process.env.ZOOM_ACCOUNT_ID
      ? `${process.env.ZOOM_ACCOUNT_ID.substring(0, 4)}...(${process.env.ZOOM_ACCOUNT_ID.length} chars)`
      : "NOT SET",
  }

  return NextResponse.json(envCheck)
}
