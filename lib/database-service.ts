import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface UserPresenceStatus {
  user_id: string
  presence_status: string
  email?: string
  updated_at: string
  created_at: string
}

export interface UserStatusMessage {
  user_id: string
  status_message: string | null
  email?: string
  updated_at: string
  created_at: string
}

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

export class DatabaseService {
  // Load all data efficiently (for initial app load)
  static async loadAllData(): Promise<{
    presenceData: UserPresenceStatus[]
    messageData: UserStatusMessage[]
  }> {
    try {
      // Use a single query to get both presence and status message data
      const [presenceResult, messageResult] = await Promise.all([
        sql`SELECT user_id, presence_status, updated_at, created_at 
            FROM user_presence_status 
            ORDER BY updated_at DESC`,
        sql`SELECT user_id, status_message, updated_at, created_at 
            FROM user_status_messages 
            ORDER BY updated_at DESC`,
      ])

      return {
        presenceData: presenceResult as UserPresenceStatus[],
        messageData: messageResult as UserStatusMessage[],
      }
    } catch (error) {
      console.error("Database error loading data:", error)
      return {
        presenceData: [],
        messageData: [],
      }
    }
  }

  // Batch update presence status (more efficient than individual updates)
  static async batchUpdatePresenceStatus(entries: PresenceEntry[]): Promise<void> {
    if (entries.length === 0) return

    try {
      console.log(`Database: Starting batch update of ${entries.length} presence statuses`)

      // Process entries one by one using individual queries (safer than raw SQL)
      for (const entry of entries) {
        // Convert timestamp to Central Time (UTC-6 or UTC-5 depending on DST)
        const centralTime = new Date(entry.timestamp.getTime() - 5 * 60 * 60 * 1000) // Subtract 5 hours

        await sql`
          INSERT INTO user_presence_status (user_id, presence_status, email, updated_at)
          VALUES (${entry.userId}, ${entry.status}, ${entry.email || null}, ${centralTime.toISOString()})
          ON CONFLICT (user_id) 
          DO UPDATE SET 
            presence_status = EXCLUDED.presence_status,
            email = COALESCE(EXCLUDED.email, user_presence_status.email),
            updated_at = EXCLUDED.updated_at
        `
      }

      console.log(`Database: Successfully batch updated ${entries.length} presence statuses`)
    } catch (error) {
      console.error("Database error batch updating presence status:", error)
      throw error
    }
  }

  // Batch update status messages (more efficient than individual updates)
  static async batchUpdateStatusMessages(entries: StatusMessageEntry[]): Promise<void> {
    if (entries.length === 0) return

    try {
      console.log(`Database: Starting batch update of ${entries.length} status messages`)

      // Process entries one by one using individual queries (safer than raw SQL)
      for (const entry of entries) {
        // Convert timestamp to Central Time (UTC-6 or UTC-5 depending on DST)
        const centralTime = new Date(entry.timestamp.getTime() - 5 * 60 * 60 * 1000) // Subtract 5 hours

        await sql`
          INSERT INTO user_status_messages (user_id, status_message, email, updated_at)
          VALUES (${entry.userId}, ${entry.message}, ${entry.email || null}, ${centralTime.toISOString()})
          ON CONFLICT (user_id) 
          DO UPDATE SET 
            status_message = EXCLUDED.status_message,
            email = COALESCE(EXCLUDED.email, user_status_messages.email),
            updated_at = EXCLUDED.updated_at
        `
      }

      console.log(`Database: Successfully batch updated ${entries.length} status messages`)
    } catch (error) {
      console.error("Database error batch updating status messages:", error)
      throw error
    }
  }

  // Alternative: True batch update using VALUES clause (more efficient for large batches)
  static async batchUpdatePresenceStatusOptimized(entries: PresenceEntry[]): Promise<void> {
    if (entries.length === 0) return

    try {
      console.log(`Database: Starting optimized batch update of ${entries.length} presence statuses`)

      // Create arrays for the VALUES clause
      const userIds = entries.map((e) => e.userId)
      const statuses = entries.map((e) => e.status)
      const timestamps = entries.map((e) => e.timestamp.toISOString())

      // Use unnest to create a batch insert
      await sql`
        INSERT INTO user_presence_status (user_id, presence_status, updated_at)
        SELECT * FROM unnest(
          ${userIds}::text[],
          ${statuses}::text[],
          ${timestamps}::timestamptz[]
        ) AS t(user_id, presence_status, updated_at)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          presence_status = EXCLUDED.presence_status,
          updated_at = EXCLUDED.updated_at
      `

      console.log(`Database: Successfully optimized batch updated ${entries.length} presence statuses`)
    } catch (error) {
      console.error("Database error optimized batch updating presence status:", error)
      // Fall back to individual updates
      console.log("Falling back to individual updates...")
      await this.batchUpdatePresenceStatus(entries)
    }
  }

  // Alternative: True batch update for status messages
  static async batchUpdateStatusMessagesOptimized(entries: StatusMessageEntry[]): Promise<void> {
    if (entries.length === 0) return

    try {
      console.log(`Database: Starting optimized batch update of ${entries.length} status messages`)

      // Create arrays for the VALUES clause
      const userIds = entries.map((e) => e.userId)
      const messages = entries.map((e) => e.message)
      const timestamps = entries.map((e) => e.timestamp.toISOString())

      // Use unnest to create a batch insert
      await sql`
        INSERT INTO user_status_messages (user_id, status_message, updated_at)
        SELECT * FROM unnest(
          ${userIds}::text[],
          ${messages}::text[],
          ${timestamps}::timestamptz[]
        ) AS t(user_id, status_message, updated_at)
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          status_message = EXCLUDED.status_message,
          updated_at = EXCLUDED.updated_at
      `

      console.log(`Database: Successfully optimized batch updated ${entries.length} status messages`)
    } catch (error) {
      console.error("Database error optimized batch updating status messages:", error)
      // Fall back to individual updates
      console.log("Falling back to individual updates...")
      await this.batchUpdateStatusMessages(entries)
    }
  }

  // Get all presence statuses (for debugging)
  static async getAllPresenceStatuses(): Promise<UserPresenceStatus[]> {
    try {
      const result = await sql`
        SELECT user_id, presence_status, updated_at, created_at 
        FROM user_presence_status 
        ORDER BY updated_at DESC
      `
      return result as UserPresenceStatus[]
    } catch (error) {
      console.error("Database error getting all presence statuses:", error)
      return []
    }
  }

  // Get all status messages (for debugging)
  static async getAllStatusMessages(): Promise<UserStatusMessage[]> {
    try {
      const result = await sql`
        SELECT user_id, status_message, updated_at, created_at 
        FROM user_status_messages 
        ORDER BY updated_at DESC
      `
      return result as UserStatusMessage[]
    } catch (error) {
      console.error("Database error getting all status messages:", error)
      return []
    }
  }

  // Get combined user data (for debugging)
  static async getAllUsersData(): Promise<any[]> {
    try {
      const result = await sql`
        SELECT 
          COALESCE(p.user_id, m.user_id) as user_id,
          COALESCE(p.email, m.email) as email,
          p.presence_status,
          p.updated_at as presence_updated_at,
          m.status_message,
          m.updated_at as message_updated_at
        FROM user_presence_status p
        FULL OUTER JOIN user_status_messages m ON p.user_id = m.user_id
        ORDER BY GREATEST(
          COALESCE(p.updated_at, '1970-01-01'::timestamptz),
          COALESCE(m.updated_at, '1970-01-01'::timestamptz)
        ) DESC
      `
      return result as any[]
    } catch (error) {
      console.error("Database error getting combined user data:", error)
      return []
    }
  }

  // Clean up old entries (optional maintenance)
  static async cleanupOldEntries(daysToKeep = 30): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000)

      const [presenceDeleted, messagesDeleted] = await Promise.all([
        sql`
          DELETE FROM user_presence_status 
          WHERE updated_at < ${cutoffDate.toISOString()}
        `,
        sql`
          DELETE FROM user_status_messages 
          WHERE updated_at < ${cutoffDate.toISOString()}
        `,
      ])

      console.log(`Database: Cleaned up entries older than ${daysToKeep} days`)
      console.log(`  - Presence entries deleted: ${presenceDeleted.length}`)
      console.log(`  - Message entries deleted: ${messagesDeleted.length}`)
    } catch (error) {
      console.error("Database error during cleanup:", error)
      throw error
    }
  }
}
