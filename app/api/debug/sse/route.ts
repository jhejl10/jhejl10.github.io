import { NextResponse } from "next/server"
import { getCurrentEventId } from "@/app/api/events/route"

export async function GET() {
  return NextResponse.json({
    current_event_id: getCurrentEventId(),
    sse_status: "active",
    features: {
      event_ids: "enabled",
      heartbeat_interval: "2.5 seconds",
      auto_close_timeout: "55 seconds",
      reconnection: "automatic with Last-Event-ID",
    },
    timestamp: new Date().toISOString(),
  })
}
