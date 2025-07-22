"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Circle, Phone, Mail, Building2, Calendar, User } from "lucide-react"

interface ExtensionProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  extensionId: string
  extensionType: string
}

export function ExtensionProfileDialog({
  open,
  onOpenChange,
  extensionId,
  extensionType,
}: ExtensionProfileDialogProps) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && extensionId) {
      setLoading(true)
      setError(null)

      fetch(`/api/zoom/extension/${extensionId}?type=${extensionType}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch profile: ${res.status}`)
          }
          return res.json()
        })
        .then((data) => {
          setProfile(data)
          setLoading(false)
        })
        .catch((err) => {
          console.error("Error fetching profile:", err)
          setError(err.message || "Failed to load profile")
          setLoading(false)
        })
    }
  }, [open, extensionId, extensionType])

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "available":
      case "away":
      case "mobile_signed_in":
        return "text-green-500"
      case "busy":
      case "in_meeting":
      case "presenting":
      case "on_phone_call":
      case "in_calendar_event":
        return "text-red-500"
      case "do_not_disturb":
      case "out_of_office":
        return "text-yellow-500"
      case "offline":
        return "text-gray-400"
      case "n/a":
      default:
        return "text-gray-400"
    }
  }

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case "available":
        return "Available"
      case "away":
        return "Available"
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
      case "n/a":
      default:
        return "N/A"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Extension Profile</DialogTitle>
          <DialogDescription>{extensionType === "user" ? "User" : "Common Area"} extension details</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-800 text-sm">Error: {error}</div>
        )}

        {profile && !loading && (
          <div className="space-y-4">
            {/* Header with name and status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {extensionType === "user" ? (
                  <User className="h-5 w-5 text-blue-600" />
                ) : (
                  <Building2 className="h-5 w-5 text-blue-600" />
                )}
                <h3 className="text-lg font-medium">
                  {extensionType === "user"
                    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email?.split("@")[0]
                    : profile.display_name || profile.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <Circle className={`h-3 w-3 fill-current ${getStatusColor(profile.presence_status)}`} />
                <span className="text-sm">{getStatusText(profile.presence_status)}</span>
              </div>
            </div>

            {/* Extension details */}
            <div className="grid grid-cols-1 gap-3 py-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Extension:</span>
                <Badge variant="outline">{profile.extension_number}</Badge>
              </div>

              {profile.site && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Site:</span>
                  <span className="text-sm">{profile.site.name}</span>
                </div>
              )}

              {profile.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm">{profile.email}</span>
                </div>
              )}

              {profile.created_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Created:</span>
                  <span className="text-sm">{new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
