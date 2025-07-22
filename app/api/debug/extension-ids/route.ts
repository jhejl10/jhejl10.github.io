import { NextResponse } from "next/server"
import { getPhoneExtensions } from "@/lib/zoom-api"

export async function GET() {
  try {
    const extensions = await getPhoneExtensions()

    // Create detailed mapping of all IDs
    const idAnalysis = extensions.map((ext, index) => ({
      index,
      id: ext.id, // user_id for users, extension_id for common areas
      extension_id: ext.extension_id, // phone extension ID (only for users)
      extension_number: ext.extension_number,
      name: ext.name || ext.display_name,
      type: ext.type,
      presence_status: ext.presence_status,
      status_message: ext.status_message,
      webhook_matching: {
        user_webhooks: `user.* webhooks should match against id: "${ext.id}"`,
        phone_webhooks:
          ext.type === "user"
            ? `phone.* webhooks should match user_id: "${ext.id}" OR extension_id: "${ext.extension_id}"`
            : `phone.* webhooks should match extension_id: "${ext.id}"`,
      },
    }))

    // Test the specific user from the screenshot
    const targetUserId = "nrny-fa7r8axi_bbzfkexw"
    const matchById = extensions.find((ext) => ext.id === targetUserId)
    const matchByExtensionId = extensions.find((ext) => ext.extension_id === targetUserId)

    return NextResponse.json({
      total_extensions: extensions.length,
      id_structure_explanation: {
        users: {
          id: "This is the user_id - matches user.* webhook user_id",
          extension_id: "This is the phone extension ID - matches phone.* webhook extension_id",
          extension_number: "This is the display extension number (e.g., 1001)",
        },
        common_areas: {
          id: "This is the extension_id - matches phone.* webhook extension_id",
          extension_id: "Not present for common areas",
          extension_number: "This is the display extension number",
        },
      },
      id_analysis: idAnalysis,
      test_case: {
        target_user_id: targetUserId,
        found_by_id: !!matchById,
        found_by_extension_id: !!matchByExtensionId,
        match_by_id: matchById
          ? {
              id: matchById.id,
              extension_id: matchById.extension_id,
              name: matchById.name || matchById.display_name,
              type: matchById.type,
            }
          : null,
        match_by_extension_id: matchByExtensionId
          ? {
              id: matchByExtensionId.id,
              extension_id: matchByExtensionId.extension_id,
              name: matchByExtensionId.name || matchByExtensionId.display_name,
              type: matchByExtensionId.type,
            }
          : null,
        conclusion: matchById
          ? "✅ Found by ID - user.* webhooks should work"
          : matchByExtensionId
            ? "⚠️ Found by extension_id - webhook might be sending wrong ID"
            : "❌ Not found - check webhook data",
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Extension IDs debug error:", error)
    return NextResponse.json(
      { error: "Failed to get extension IDs data", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
