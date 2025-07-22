import { NextResponse } from "next/server"
import { presenceStorage } from "@/lib/presence-storage"

export async function GET() {
  const stats = presenceStorage.getStats()
  const allPresence = presenceStorage.getAllPresence()

  return NextResponse.json({
    stats,
    presenceData: allPresence,
    timestamp: new Date().toISOString(),
  })
}
