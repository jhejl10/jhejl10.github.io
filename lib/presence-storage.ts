// In-memory storage for user presence status
// This will be updated by webhooks and read by the API

interface PresenceEntry {
  userId: string
  status: string
  email?: string
  timestamp: Date
}

interface StatusMessageEntry {
  userId: string
  message: string | null
  email?: string
  timestamp: Date
}

class PresenceStorage {
  private presenceStorage = new Map<string, PresenceEntry>()
  private messageStorage = new Map<string, StatusMessageEntry>()
  private writeQueue: Array<{ type: "presence" | "message"; entry: PresenceEntry | StatusMessageEntry }> = []
  private isWriting = false
  private lastDbSync = new Date(0) // Initialize to epoch

  // Helper function to normalize user IDs for consistent storage
  private normalizeUserId(userId: string): string {
    return userId.toLowerCase()
  }

  // Update presence status for a user or common area (called by webhook)
  updatePresence(userId: string, status: string, email?: string): void {
    const normalizedUserId = this.normalizeUserId(userId)

    this.presenceStorage.set(normalizedUserId, {
      userId: normalizedUserId,
      status,
      email,
      timestamp: new Date(),
    })
    console.log(`Updated presence for entity ${userId} (normalized: ${normalizedUserId}): ${status}`)

    // Add to write queue for eventual database persistence (use original userId for database)
    this.queueDatabaseWrite("presence", {
      userId: userId, // Keep original case for database
      status,
      email,
      timestamp: new Date(),
    })
  }

  // Update status message for a user (called by webhook)
  updateStatusMessage(userId: string, message: string | null, email?: string): void {
    const normalizedUserId = this.normalizeUserId(userId)

    this.messageStorage.set(normalizedUserId, {
      userId: normalizedUserId,
      message,
      email,
      timestamp: new Date(),
    })
    console.log(`Updated status message for entity ${userId} (normalized: ${normalizedUserId}): ${message}`)

    // Add to write queue for eventual database persistence (use original userId for database)
    this.queueDatabaseWrite("message", {
      userId: userId, // Keep original case for database
      message,
      email,
      timestamp: new Date(),
    })
  }

  // Get presence status for a user or common area (case-insensitive)
  getPresence(userId: string): string {
    const normalizedUserId = this.normalizeUserId(userId)
    const entry = this.presenceStorage.get(normalizedUserId)
    return entry?.status || "n/a"
  }

  // Get status message for a user (case-insensitive)
  getStatusMessage(userId: string): string | null {
    const normalizedUserId = this.normalizeUserId(userId)
    const entry = this.messageStorage.get(normalizedUserId)
    return entry?.message || null
  }

  // Get all stored presence data
  getAllPresence(): (PresenceEntry & { presence_updated_at?: string })[] {
    return Array.from(this.presenceStorage.values()).map((entry) => ({
      ...entry,
      presence_updated_at: entry.timestamp.toISOString(),
    }))
  }

  // Get all stored status messages
  getAllStatusMessages(): (StatusMessageEntry & { status_updated_at?: string })[] {
    return Array.from(this.messageStorage.values()).map((entry) => ({
      ...entry,
      status_updated_at: entry.timestamp.toISOString(),
    }))
  }

  // Load data from database (called on server start and periodically)
  async loadFromDatabase(): Promise<void> {
    try {
      // This will be implemented in database-service.ts
      const { presenceData, messageData } = await import("./database-service").then((module) =>
        module.DatabaseService.loadAllData(),
      )

      // Update in-memory storage with database data (normalize IDs)
      presenceData.forEach((entry) => {
        const normalizedUserId = this.normalizeUserId(entry.user_id)
        this.presenceStorage.set(normalizedUserId, {
          userId: normalizedUserId,
          status: entry.presence_status,
          email: entry.email,
          timestamp: new Date(entry.updated_at),
        })
      })

      messageData.forEach((entry) => {
        const normalizedUserId = this.normalizeUserId(entry.user_id)
        this.messageStorage.set(normalizedUserId, {
          userId: normalizedUserId,
          message: entry.status_message,
          email: entry.email,
          timestamp: new Date(entry.updated_at),
        })
      })

      console.log(
        `Loaded ${presenceData.length} presence entries and ${messageData.length} status messages from database`,
      )
      this.lastDbSync = new Date()
    } catch (error) {
      console.error("Failed to load data from database:", error)
    }
  }

  // Queue a database write operation
  private queueDatabaseWrite(type: "presence" | "message", entry: PresenceEntry | StatusMessageEntry): void {
    this.writeQueue.push({ type, entry })

    // Start processing the queue if not already processing
    if (!this.isWriting) {
      this.processWriteQueue()
    }
  }

  // Process the write queue with rate limiting
  private async processWriteQueue(): Promise<void> {
    if (this.writeQueue.length === 0) {
      this.isWriting = false
      return
    }

    this.isWriting = true

    // Take a batch of items to process (max 10 at a time)
    const batch = this.writeQueue.splice(0, 10)

    try {
      // Group by type for batch processing
      const presenceUpdates: PresenceEntry[] = []
      const messageUpdates: StatusMessageEntry[] = []

      batch.forEach((item) => {
        if (item.type === "presence") {
          presenceUpdates.push(item.entry as PresenceEntry)
        } else {
          messageUpdates.push(item.entry as StatusMessageEntry)
        }
      })

      // Process batch updates using the corrected database service
      const { DatabaseService } = await import("./database-service")

      if (presenceUpdates.length > 0) {
        console.log(`Processing ${presenceUpdates.length} presence updates to database`)
        await DatabaseService.batchUpdatePresenceStatus(presenceUpdates)
      }

      if (messageUpdates.length > 0) {
        console.log(`Processing ${messageUpdates.length} status message updates to database`)
        await DatabaseService.batchUpdateStatusMessages(messageUpdates)
      }

      console.log(
        `✅ Successfully processed database batch: ${presenceUpdates.length} presence updates, ${messageUpdates.length} message updates`,
      )
    } catch (error) {
      console.error("❌ Error processing database write queue:", error)
      // Put failed items back in the queue for retry
      this.writeQueue.unshift(...batch)
    }

    // Rate limit database writes (wait 2 seconds between batches)
    setTimeout(() => {
      this.processWriteQueue()
    }, 2000)
  }

  // Clear old entries (optional cleanup)
  clearOldEntries(maxAgeHours = 24): void {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)

    for (const [userId, entry] of this.presenceStorage.entries()) {
      if (entry.timestamp < cutoff) {
        this.presenceStorage.delete(userId)
      }
    }

    for (const [userId, entry] of this.messageStorage.entries()) {
      if (entry.timestamp < cutoff) {
        this.messageStorage.delete(userId)
      }
    }

    console.log(`Cleared old entries older than ${maxAgeHours} hours`)
  }

  // Get storage stats
  getStats(): {
    totalPresenceEntries: number
    totalMessageEntries: number
    lastPresenceUpdate: Date | null
    lastMessageUpdate: Date | null
    lastDbSync: Date
    queueLength: number
  } {
    const presenceEntries = Array.from(this.presenceStorage.values())
    const messageEntries = Array.from(this.messageStorage.values())

    const lastPresenceUpdate =
      presenceEntries.length > 0 ? new Date(Math.max(...presenceEntries.map((e) => e.timestamp.getTime()))) : null

    const lastMessageUpdate =
      messageEntries.length > 0 ? new Date(Math.max(...messageEntries.map((e) => e.timestamp.getTime()))) : null

    return {
      totalPresenceEntries: presenceEntries.length,
      totalMessageEntries: messageEntries.length,
      lastPresenceUpdate,
      lastMessageUpdate,
      lastDbSync: this.lastDbSync,
      queueLength: this.writeQueue.length,
    }
  }
}

// Export a singleton instance
export const presenceStorage = new PresenceStorage()
