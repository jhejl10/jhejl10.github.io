"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Circle, PhoneCall, PhoneIncoming, PhoneOutgoing } from "lucide-react"
import { ExtensionProfileDialog } from "@/components/extension-profile-dialog"

interface PhoneExtensionProps {
  extension: any
}

export function PhoneExtension({ extension }: PhoneExtensionProps) {
  const [showProfile, setShowProfile] = useState(false)
  const [showCallName, setShowCallName] = useState(false)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [showFullMessage, setShowFullMessage] = useState(false)

  // Toggle between caller name and number every 2 seconds for call status
  useEffect(() => {
    if (extension.call_status) {
      const interval = setInterval(() => {
        setShowCallName((prev) => !prev)
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [extension.call_status])

  // Continuous ticker scrolling effect for long status messages
  useEffect(() => {
    if (extension.status_message && extension.status_message.length > 20) {
      const interval = setInterval(() => {
        setScrollOffset((prev) => {
          const messageLength = extension.status_message.length
          const separator = "     •     " // Spacing between repeated messages
          const fullPattern = extension.status_message + separator
          const maxOffset = fullPattern.length
          return prev >= maxOffset ? 0 : prev + 1
        })
      }, 150) // Scroll speed

      return () => clearInterval(interval)
    } else {
      setScrollOffset(0)
    }
  }, [extension.status_message])

  const getEffectivePresenceStatus = () => {
    // If there's an active call, override presence status
    if (extension.call_status) {
      if (
        extension.call_status.toLowerCase().includes("call") ||
        extension.call_status.toLowerCase().includes("calling")
      ) {
        return "on_phone_call"
      }
    }

    // For common areas or users without presence status, assume available
    if (extension.type === "common_area" || !extension.presence_status || extension.presence_status === "n/a") {
      return "available"
    }

    return extension.presence_status
  }

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case "available":
        return "Available"
      case "away":
        return "Away"
      case "do_not_disturb":
        return "Do Not Disturb"
      case "in_meeting":
        return "In a meeting"
      case "presenting":
        return "Presenting"
      case "on_phone_call":
        return "On a call"
      case "in_calendar_event":
        return "In calendar event"
      case "offline":
        return "Offline"
      case "busy":
        return "Busy"
      case "mobile_signed_in":
        return "Available (mobile)"
      case "out_of_office":
        return "Out of Office"
      default:
        return "Available"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "available":
      case "mobile_signed_in":
        return "text-green-500"
      case "busy":
      case "in_meeting":
      case "presenting":
      case "on_phone_call":
      case "in_calendar_event":
      case "do_not_disturb":
        return "text-red-500"
      case "away":
      case "out_of_office":
      case "offline":
        return "text-gray-400"
      default:
        return "text-green-500"
    }
  }

  const getCardBackgroundColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "busy":
      case "in_meeting":
      case "presenting":
      case "on_phone_call":
      case "in_calendar_event":
      case "do_not_disturb":
        return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30"
      case "away":
      case "out_of_office":
      case "offline":
        return "bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800/30"
      case "available":
      case "mobile_signed_in":
      default:
        return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/30"
    }
  }

  const getCallStatusColor = (callStatus: string, direction?: string) => {
    if (direction === "outbound") return "text-blue-500"
    if (direction === "inbound") return "text-red-500"

    // Check if it's an internal call (4-digit extension number)
    const phoneNumberMatch = callStatus.match(/(?:\+?1)?(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{4})/)
    if (phoneNumberMatch && phoneNumberMatch[1].replace(/\D/g, "").length === 4) {
      return "text-green-500"
    }

    return "text-blue-500" // Default to outbound color
  }

  const getCallIcon = (direction?: string, callStatus?: string) => {
    if (direction === "inbound") return PhoneIncoming
    if (direction === "outbound") return PhoneOutgoing

    // Check if it's an internal call
    if (callStatus) {
      const phoneNumberMatch = callStatus.match(/(?:\+?1)?(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{4})/)
      if (phoneNumberMatch && phoneNumberMatch[1].replace(/\D/g, "").length === 4) {
        return PhoneCall // Use regular phone icon for internal calls
      }
    }

    return PhoneOutgoing // Default to outbound
  }

  const formatCallStatus = (callStatus: string) => {
    if (!callStatus) return null

    // Extract the base status and other party info
    const parts = callStatus.split(": ")
    const baseStatus = parts[0]
    const otherPartyInfo = parts[1]

    if (!otherPartyInfo) return baseStatus

    // Try to extract phone number and name
    const phoneMatch = otherPartyInfo.match(/(?:\+?1)?(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\d{4})/)
    const nameMatch = otherPartyInfo.match(/([A-Z\s]+)$/)

    const phoneNumber = phoneMatch ? phoneMatch[1] : null
    const name = nameMatch ? nameMatch[1].trim() : null

    if (phoneNumber && name && showCallName) {
      return `${baseStatus}: ${name}`
    } else if (phoneNumber) {
      return `${baseStatus}: ${phoneNumber}`
    }

    return callStatus
  }

  const getCallDirection = () => {
    if (!extension.call_direction) {
      // Fallback: try to infer from status text
      if (extension.call_status?.toLowerCase().includes("incoming")) return "inbound"
      if (extension.call_status?.toLowerCase().includes("calling")) return "outbound"
      return "outbound" // Default assumption
    }
    return extension.call_direction
  }

  const getDisplayName = () => {
    if (extension.type === "user") {
      return extension.name
    }
    if (extension.type === "common_area") {
      return extension.display_name
    } else {
      return extension.display_name || extension.name || "Unknown"
    }
  }

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return null

    const date = new Date(timestamp)
    const now = new Date()
    const diffHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)

    // Only show timestamp if over 1 hour old
    if (diffHours < 1) return null

    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return `as of: ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}`
    } else {
      return `as of: ${date.toLocaleDateString([], { month: "2-digit", day: "2-digit" })}`
    }
  }

  const getTickerStatusMessage = (message: string) => {
    if (message.length <= 20) return message

    // Create repeating pattern: "message     •     message     •     message"
    const separator = "     •     "
    const repeatedMessage = (message + separator).repeat(3) // Repeat 3 times for smooth scrolling
    const visibleLength = 30 // Show more characters for better readability
    const startIndex = scrollOffset % (message.length + separator.length)

    // Get the visible portion
    let visibleText = ""
    for (let i = 0; i < visibleLength; i++) {
      visibleText += repeatedMessage[(startIndex + i) % repeatedMessage.length]
    }

    return visibleText
  }

  const effectiveStatus = getEffectivePresenceStatus()
  const displayName = getDisplayName()
  const statusText = getStatusText(effectiveStatus)
  const statusColor = getStatusColor(effectiveStatus)
  const cardBgColor = getCardBackgroundColor(effectiveStatus)
  const callDirection = getCallDirection()
  const callStatusColor = getCallStatusColor(extension.call_status || "", callDirection)
  const CallIcon = getCallIcon(callDirection, extension.call_status)
  const formattedCallStatus = formatCallStatus(extension.call_status || "")
  const statusMessage = extension.status_message
  const timestampText = formatTimestamp(extension.presence_updated_at)

  return (
    <>
      <Card
        className={`hover:shadow-md transition-shadow cursor-pointer ${cardBgColor}`}
        onClick={() => setShowProfile(true)}
      >
        <CardContent className="p-4">
          <div className="space-y-2">
            {/* First Line: Name + Extension Number */}
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground truncate flex-1">{displayName}</p>
              <Badge variant="outline" className="text-xs">
                Ext. {extension.extension_number}
              </Badge>
            </div>

            {/* Second Line: Status Icon + Status Text + Status Message (Ticker) */}
            <div className="flex items-center gap-2 min-h-[16px]">
              <Circle className={`h-3 w-3 fill-current ${statusColor} flex-shrink-0`} />
              <span className={`text-xs ${statusColor} flex-shrink-0`}>{statusText}</span>

              {statusMessage && (
                <>
                  <span className={`text-xs ${statusColor} opacity-60 flex-shrink-0`}>•</span>
                  <div
                    className="flex-1 overflow-hidden relative"
                    onMouseEnter={() => setShowFullMessage(true)}
                    onMouseLeave={() => setShowFullMessage(false)}
                  >
                    {showFullMessage ? (
                      <div className="absolute z-10 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap -top-8 left-0 max-w-xs">
                        {statusMessage}
                      </div>
                    ) : null}
                    <span className={`text-xs ${statusColor} font-mono whitespace-nowrap block`}>
                      {getTickerStatusMessage(statusMessage)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Third Line: Call Activity (if available) + Timestamp (right-aligned) */}
            <div className="flex items-center justify-between text-xs min-h-[16px]">
              {formattedCallStatus ? (
                <div className="flex items-center gap-2">
                  <CallIcon className={`h-3 w-3 ${callStatusColor}`} />
                  <span className={callStatusColor}>{formattedCallStatus}</span>
                </div>
              ) : (
                <div></div> // Empty div to maintain layout
              )}

              {timestampText && (
                <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">{timestampText}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Extension Profile Dialog */}
      <ExtensionProfileDialog
        open={showProfile}
        onOpenChange={setShowProfile}
        extensionId={extension.id}
        extensionType={extension.type}
      />
    </>
  )
}
