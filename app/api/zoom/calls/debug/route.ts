import { NextResponse } from "next/server"
import { callStorage } from "@/lib/call-storage"

export async function GET() {
  const stats = callStorage.getStats()
  const activeCalls = callStorage.getAllActiveCalls()

  return NextResponse.json({
    stats,
    activeCalls,
    timestamp: new Date().toISOString(),
  })
}
