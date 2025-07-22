import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Check if all required environment variables are present
    const envVars = {
      ZOOM_API_KEY: process.env.ZOOM_API_KEY,
      ZOOM_API_SECRET: process.env.ZOOM_API_SECRET,
      ZOOM_ACCOUNT_ID: process.env.ZOOM_ACCOUNT_ID,
    }

    const missingVars = Object.entries(envVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key)

    if (missingVars.length > 0) {
      return NextResponse.json(
        {
          status: "error",
          message: `Missing environment variables: ${missingVars.join(", ")}`,
          missingVars,
          availableVars: Object.entries(envVars)
            .filter(([key, value]) => !!value)
            .map(([key]) => key),
        },
        { status: 500 },
      )
    }

    // Test API connectivity
    console.log("Testing Zoom API connection...")

    const response = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${envVars.ZOOM_API_KEY}:${envVars.ZOOM_API_SECRET}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `grant_type=account_credentials&account_id=${envVars.ZOOM_ACCOUNT_ID}`,
    })

    const responseText = await response.text()

    if (!response.ok) {
      console.error("Zoom API Error:", {
        status: response.status,
        statusText: response.statusText,
        response: responseText,
      })

      return NextResponse.json(
        {
          status: "error",
          message: `Zoom API authentication failed: ${response.status} ${response.statusText}`,
          details: responseText,
          accountId: envVars.ZOOM_ACCOUNT_ID?.substring(0, 8) + "...",
        },
        { status: 500 },
      )
    }

    const tokenData = JSON.parse(responseText)

    return NextResponse.json({
      status: "success",
      message: "Zoom API connection successful",
      timestamp: new Date().toISOString(),
      accountId: envVars.ZOOM_ACCOUNT_ID?.substring(0, 8) + "...",
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
    })
  } catch (error) {
    console.error("API status check error:", error)
    return NextResponse.json(
      {
        status: "error",
        message: `API status check failed: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    )
  }
}
