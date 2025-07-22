// In-memory storage for call activity status
// This will be updated by webhooks and read by the API

interface CallEntry {
  userId: string
  status: string
  callId?: string
  direction?: "inbound" | "outbound"
  timestamp: Date
  otherParty?: {
    phoneNumber?: string
    name?: string
    displayName?: string
  }
}

class CallStorage {
  private storage = new Map<string, CallEntry>()

  // Update call status for a user (called by webhook)
  updateCallStatus(
    userId: string,
    status: string,
    callId?: string,
    direction?: "inbound" | "outbound",
    otherPartyPhone?: string,
    otherPartyName?: string,
    otherPartyDisplayName?: string,
  ): void {
    this.storage.set(userId, {
      userId,
      status,
      callId,
      direction,
      timestamp: new Date(),
      otherParty: {
        phoneNumber: otherPartyPhone,
        name: otherPartyName,
        displayName: otherPartyDisplayName,
      },
    })

    const otherPartyInfo = otherPartyPhone || otherPartyName || otherPartyDisplayName
    console.log(`Updated call status for user ${userId}: ${status}${otherPartyInfo ? ` with ${otherPartyInfo}` : ""}`)
  }

  // Clear call status for a user (when call ends)
  clearCallStatus(userId: string): void {
    this.storage.delete(userId)
    console.log(`Cleared call status for user ${userId}`)
  }

  // Get call status for a user
  getCallStatus(userId: string): CallEntry | null {
    return this.storage.get(userId) || null
  }

  // Get formatted call status with other party info and direction
  getFormattedCallStatus(userId: string): { status: string; direction?: "inbound" | "outbound" } | null {
    const entry = this.storage.get(userId)
    if (!entry) return null

    let statusText = entry.status

    // Add other party information if available
    if (entry.otherParty) {
      const { phoneNumber, name, displayName } = entry.otherParty

      if (phoneNumber || name || displayName) {
        const otherPartyInfo = []

        // Add phone number if available
        if (phoneNumber) {
          otherPartyInfo.push(phoneNumber)
        }

        // Add name (prefer displayName, then name)
        const partyName = displayName || name
        if (partyName) {
          otherPartyInfo.push(partyName.toUpperCase())
        }

        if (otherPartyInfo.length > 0) {
          statusText += `: ${otherPartyInfo.join(" ")}`
        }
      }
    }

    return {
      status: statusText,
      direction: entry.direction,
    }
  }

  // Get all active calls (for debugging)
  getAllActiveCalls(): CallEntry[] {
    return Array.from(this.storage.values())
  }

  // Clear old entries (cleanup for stale data)
  clearOldEntries(maxAgeMinutes = 30): void {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000)
    for (const [userId, entry] of this.storage.entries()) {
      if (entry.timestamp < cutoff) {
        this.storage.delete(userId)
        console.log(`Cleared old call entry for user ${userId}`)
      }
    }
  }

  // Get storage stats
  getStats(): { totalActiveCalls: number; lastUpdated: Date | null } {
    const entries = Array.from(this.storage.values())
    const lastUpdated = entries.length > 0 ? new Date(Math.max(...entries.map((e) => e.timestamp.getTime()))) : null

    return {
      totalActiveCalls: entries.length,
      lastUpdated,
    }
  }
}

// Export a singleton instance
export const callStorage = new CallStorage()
