import { type NextRequest, NextResponse } from "next/server"
import { getExtensionDetails } from "@/lib/zoom-api"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const type = request.nextUrl.searchParams.get("type") || "user"

    if (!id) {
      return NextResponse.json({ error: "Missing extension ID" }, { status: 400 })
    }

    const extensionDetails = await getExtensionDetails(id, type)

    return NextResponse.json(extensionDetails)
  } catch (error) {
    console.error("Error fetching extension details:", error)
    return NextResponse.json(
      { error: "Failed to fetch extension details", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
