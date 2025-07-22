import { type NextRequest, NextResponse } from "next/server"
import { presenceStorage } from "@/lib/presence-storage"
import { callStorage } from "@/lib/call-storage"
import crypto from "crypto"

// Helper function to determine the correct ID to use for storage/updates
function getEntityId(event: any, eventType: string): string | null {
  if (eventType.startsWith("user.")) {
    // For user.* events, use the object.id (which is the user_id)
    return event.payload.object.id
  } else if (eventType.startsWith("phone.")) {
    // For phone.* events, we need to check callee/caller objects
    if (eventType.includes("callee")) {
      const callee = event.payload.object.callee
      if (!callee) return null

      const { extension_type, extension_id, user_id } = callee
      return extension_type === "commonArea" ? extension_id : user_id || extension_id
    } else if (eventType.includes("caller")) {
      const caller = event.payload.object.caller
      if (!caller) return null

      const { extension_type, extension_id, user_id } = caller
      return extension_type === "commonArea" ? extension_id : user_id || extension_id
    } else {
      // For other phone events
      const { extension_type, extension_id, user_id } = event.payload.object
      return extension_type === "commonArea" ? extension_id : user_id || extension_id
    }
  }

  return null
}

// Helper function to extract other party information
function getOtherPartyInfo(
  event: any,
  eventType: string,
): {
  phoneNumber?: string
  name?: string
  displayName?: string
} {
  if (eventType.includes("callee")) {
    // For callee events, the other party is the caller
    const caller = event.payload.object.caller
    return {
      phoneNumber: caller?.phone_number,
      name: caller?.name,
      displayName: caller?.display_name,
    }
  } else if (eventType.includes("caller")) {
    // For caller events, the other party is the callee
    const callee = event.payload.object.callee
    return {
      phoneNumber: callee?.phone_number,
      name: callee?.name,
      displayName: callee?.display_name,
    }
  }

  return {}
}

// Handle actual webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("x-zm-signature")
    const timestamp = request.headers.get("x-zm-request-timestamp")

    // Parse the request body
    const event = JSON.parse(body)

    // Handle Zoom's endpoint validation
    if (event.event === "endpoint.url_validation") {
      console.log("Handling Zoom endpoint validation")
      const plainToken = event.payload.plainToken

      if (!plainToken) {
        console.error("Missing plainToken in validation request")
        return NextResponse.json({ error: "Invalid validation request" }, { status: 400 })
      }

      // Generate the encrypted token using the webhook secret
      const encryptedToken = crypto
        .createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET_TOKEN || "")
        .update(plainToken)
        .digest("hex")

      return NextResponse.json({
        plainToken,
        encryptedToken,
      })
    }

    // For regular webhook events, verify the signature
    if (process.env.ZOOM_WEBHOOK_SECRET_TOKEN && signature && timestamp) {
      const expectedSignature = crypto
        .createHmac("sha256", process.env.ZOOM_WEBHOOK_SECRET_TOKEN)
        .update(`v0:${timestamp}:${body}`)
        .digest("hex")

      const computedSignature = `v0=${expectedSignature}`

      if (signature !== computedSignature) {
        console.error("Invalid webhook signature")
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    console.log(`Webhook: ${event.event}`)

    // Handle different webhook events
    switch (event.event) {
      case "user.presence_status_updated":
        const userId = getEntityId(event, event.event)
        const presenceStatus = event.payload.object.presence_status
        const userEmail = event.payload.object.email

        if (userId) {
          presenceStorage.updatePresence(userId, presenceStatus, userEmail)
          console.log(`Updated presence: ${userId} -> ${presenceStatus}`)
        } else {
          console.error("Could not resolve entity ID for presence update")
        }
        break

      case "user.personal_notes_updated":
        const noteUserId = getEntityId(event, event.event)
        const statusMessage = event.payload.object.personal_notes || null
        const noteUserEmail = event.payload.object.email

        if (noteUserId) {
          presenceStorage.updateStatusMessage(noteUserId, statusMessage, noteUserEmail)
          console.log(`Updated status message: ${noteUserId} -> ${statusMessage || "(cleared)"}`)
        } else {
          console.error("Could not resolve entity ID for status message update")
        }
        break

      // Call status webhooks - Callee events (receiving calls)
      case "phone.callee_ringing":
        const calleeRingingEntityId = getEntityId(event, event.event)
        const callerInfo = getOtherPartyInfo(event, event.event)

        if (calleeRingingEntityId) {
          callStorage.updateCallStatus(
            calleeRingingEntityId,
            "Incoming Call",
            event.payload.object.id,
            "inbound",
            callerInfo.phoneNumber,
            callerInfo.name,
            callerInfo.displayName,
          )
        }
        break

      case "phone.callee_answered":
        const calleeAnsweredEntityId = getEntityId(event, event.event)
        const callerAnsweredInfo = getOtherPartyInfo(event, event.event)

        if (calleeAnsweredEntityId) {
          callStorage.updateCallStatus(
            calleeAnsweredEntityId,
            "On Call",
            event.payload.object.id,
            "inbound",
            callerAnsweredInfo.phoneNumber,
            callerAnsweredInfo.name,
            callerAnsweredInfo.displayName,
          )
        }
        break

      case "phone.callee_hold":
        const calleeHoldEntityId = getEntityId(event, event.event)
        const calleeHoldInfo = getOtherPartyInfo(event, event.event)

        if (calleeHoldEntityId) {
          callStorage.updateCallStatus(
            calleeHoldEntityId,
            "Call on Hold",
            event.payload.object.id,
            "inbound",
            calleeHoldInfo.phoneNumber,
            calleeHoldInfo.name,
            calleeHoldInfo.displayName,
          )
        }
        break

      case "phone.callee_unhold":
        const calleeUnholdEntityId = getEntityId(event, event.event)
        const calleeUnholdInfo = getOtherPartyInfo(event, event.event)

        if (calleeUnholdEntityId) {
          callStorage.updateCallStatus(
            calleeUnholdEntityId,
            "On Call",
            event.payload.object.id,
            "inbound",
            calleeUnholdInfo.phoneNumber,
            calleeUnholdInfo.name,
            calleeUnholdInfo.displayName,
          )
        }
        break

      case "phone.callee_ended":
      case "phone.callee_missed":
      case "phone.callee_rejected":
        const calleeEndEntityId = getEntityId(event, event.event)

        if (calleeEndEntityId) {
          callStorage.clearCallStatus(calleeEndEntityId)
        }
        break

      // Call status webhooks - Caller events (making calls)
      case "phone.caller_ringing":
        const callerRingingEntityId = getEntityId(event, event.event)
        const calleeRingingInfo = getOtherPartyInfo(event, event.event)

        if (callerRingingEntityId) {
          callStorage.updateCallStatus(
            callerRingingEntityId,
            "Calling",
            event.payload.object.id,
            "outbound",
            calleeRingingInfo.phoneNumber,
            calleeRingingInfo.name,
            calleeRingingInfo.displayName,
          )
        }
        break

      case "phone.caller_connected":
        const callerConnectedEntityId = getEntityId(event, event.event)
        const calleeConnectedInfo = getOtherPartyInfo(event, event.event)

        if (callerConnectedEntityId) {
          callStorage.updateCallStatus(
            callerConnectedEntityId,
            "On Call",
            event.payload.object.id,
            "outbound",
            calleeConnectedInfo.phoneNumber,
            calleeConnectedInfo.name,
            calleeConnectedInfo.displayName,
          )
        }
        break

      case "phone.caller_hold":
        const callerHoldEntityId = getEntityId(event, event.event)
        const callerHoldInfo = getOtherPartyInfo(event, event.event)

        if (callerHoldEntityId) {
          callStorage.updateCallStatus(
            callerHoldEntityId,
            "Call on Hold",
            event.payload.object.id,
            "outbound",
            callerHoldInfo.phoneNumber,
            callerHoldInfo.name,
            callerHoldInfo.displayName,
          )
        }
        break

      case "phone.caller_unhold":
        const callerUnholdEntityId = getEntityId(event, event.event)
        const callerUnholdInfo = getOtherPartyInfo(event, event.event)

        if (callerUnholdEntityId) {
          callStorage.updateCallStatus(
            callerUnholdEntityId,
            "On Call",
            event.payload.object.id,
            "outbound",
            callerUnholdInfo.phoneNumber,
            callerUnholdInfo.name,
            callerUnholdInfo.displayName,
          )
        }
        break

      case "phone.caller_ended":
        const callerEndEntityId = getEntityId(event, event.event)

        if (callerEndEntityId) {
          callStorage.clearCallStatus(callerEndEntityId)
        }
        break

      case "phone.caller_meeting_inviting":
        const callerMeetingEntityId = getEntityId(event, event.event)
        const callerMeetingInfo = getOtherPartyInfo(event, event.event)

        if (callerMeetingEntityId) {
          callStorage.updateCallStatus(
            callerMeetingEntityId,
            "Inviting to Meeting",
            event.payload.object.id,
            "outbound",
            callerMeetingInfo.phoneNumber,
            callerMeetingInfo.name,
            callerMeetingInfo.displayName,
          )
        }
        break

      // Transfer events
      case "phone.blind_transfer_initiated":
        const transferEntityId = getEntityId(event, event.event)
        if (transferEntityId) {
          callStorage.updateCallStatus(transferEntityId, "Transferring Call", event.payload.object.id)
        }
        break

      case "phone.transfer_call_to_voicemail_initiated":
        const voicemailTransferEntityId = getEntityId(event, event.event)
        if (voicemailTransferEntityId) {
          callStorage.updateCallStatus(voicemailTransferEntityId, "Transferring to Voicemail", event.payload.object.id)
        }
        break

      // Extension management events - these don't need immediate updates since polling will catch them
      case "phone.user_assigned":
      case "phone.user_unassigned":
      case "phone.common_area_created":
      case "phone.common_area_updated":
      case "phone.common_area_deleted":
        console.log(`Extension list change: ${event.event} (will be picked up by next poll)`)
        break

      default:
        console.log(`Unhandled webhook event: ${event.event}`)
    }

    return NextResponse.json({
      success: true,
      event: event.event,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-zm-signature, x-zm-request-timestamp",
    },
  })
}

// Keep a simple GET handler for testing
export async function GET() {
  return NextResponse.json({
    status: "webhook endpoint active",
    message: "Zoom webhooks should be sent as POST requests",
    timestamp: new Date().toISOString(),
  })
}
