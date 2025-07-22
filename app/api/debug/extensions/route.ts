import { NextResponse } from "next/server"
import { getPhoneExtensions } from "@/lib/zoom-api"
import { presenceStorage } from "@/lib/presence-storage"

export async function GET() {
  try {
    const extensions = await getPhoneExtensions()
    const presenceData = presenceStorage.getAllPresence()

    // Create a mapping to see which extensions have presence data
    const extensionPresenceMap = extensions.map((ext) => {
      const entityId = ext.type === "user" ? ext.id : ext.id // For users: user_id, for common areas: extension_id (stored as id)

      return {
        id: ext.id,
        extension_id: ext.extension_id, // Only users have this field
        extension_number: ext.extension_number,
        name: ext.name || ext.display_name,
        type: ext.type,
        entity_id_for_webhooks: entityId,
        current_presence_status: ext.presence_status,
        stored_presence_status: presenceStorage.getPresence(entityId),
        has_stored_presence: presenceData.some((p) => p.userId === entityId),
      }
    })

    return NextResponse.json({
      total_extensions: extensions.length,
      total_stored_presence: presenceData.length,
      id_mapping_explanation: {
        users: "For users: webhook user_id matches extension.id",
        common_areas: "For common areas: webhook extension_id matches extension.id",
        phone_events: "Phone events have extension_type, extension_id, and user_id fields",
      },
      extensions: extensionPresenceMap,
      stored_presence_data: presenceData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Debug extensions error:", error)
    return NextResponse.json(
      { error: "Failed to get debug data", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
