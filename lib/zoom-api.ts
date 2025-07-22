import { presenceStorage } from "./presence-storage"
import { callStorage } from "./call-storage"

// Flag to track if we've loaded from the database
let hasLoadedFromDatabase = false

// Get access token without caching
async function getAccessToken(): Promise<string> {
  const apiKey = process.env.ZOOM_API_KEY
  const apiSecret = process.env.ZOOM_API_SECRET
  const accountId = process.env.ZOOM_ACCOUNT_ID

  if (!apiKey) {
    throw new Error("ZOOM_API_KEY environment variable is missing")
  }
  if (!apiSecret) {
    throw new Error("ZOOM_API_SECRET environment variable is missing")
  }
  if (!accountId) {
    throw new Error("ZOOM_ACCOUNT_ID environment variable is missing")
  }

  try {
    const response = await fetch("https://zoom.us/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `grant_type=account_credentials&account_id=${accountId}`,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error("Token fetch error:", error)
    throw error
  }
}

// Get phone extensions with in-memory presence and status messages
export async function getPhoneExtensions() {
  // Load from database on first call
  if (!hasLoadedFromDatabase) {
    try {
      console.log("Loading initial presence and status data from database...")
      await presenceStorage.loadFromDatabase()
      hasLoadedFromDatabase = true
    } catch (error) {
      console.error("Failed to load from database:", error)
      // Continue anyway, we'll use what's in memory
    }
  }

  const accessToken = await getAccessToken()

  // Fetch phone users
  const usersResponse = await fetch("https://api.zoom.us/v2/phone/users?page_size=300", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  })

  if (!usersResponse.ok) {
    throw new Error(`Failed to fetch phone users: ${usersResponse.statusText}`)
  }

  const usersData = await usersResponse.json()

  // Fetch common area phones
  const commonAreaResponse = await fetch("https://api.zoom.us/v2/phone/common_areas?page_size=300", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  })

  if (!commonAreaResponse.ok) {
    throw new Error(`Failed to fetch common area users: ${commonAreaResponse.statusText}`)
  }

  const commonAreaData = await commonAreaResponse.json()

  // Map users with presence, status message, and call status from in-memory storage
  const users = usersData.users.map((user) => {
    const callStatusData = callStorage.getFormattedCallStatus(user.id)
    const presenceEntry = presenceStorage.getAllPresence().find((p) => p.userId.toLowerCase() === user.id.toLowerCase())
    const statusEntry = presenceStorage
      .getAllStatusMessages()
      .find((s) => s.userId.toLowerCase() === user.id.toLowerCase())

    return {
      ...user,
      type: "user",
      presence_status: presenceStorage.getPresence(user.id),
      status_message: presenceStorage.getStatusMessage(user.id),
      call_status: callStatusData?.status || null,
      call_direction: callStatusData?.direction || null,
      presence_updated_at: presenceEntry?.presence_updated_at || null,
      status_updated_at: statusEntry?.status_updated_at || null,
    }
  })

  // Map common areas with presence status (they don't have status messages)
  const commonAreas = commonAreaData.common_areas.map((area) => {
    const callStatusData = callStorage.getFormattedCallStatus(area.id)
    const presenceEntry = presenceStorage.getAllPresence().find((p) => p.userId.toLowerCase() === area.id.toLowerCase())

    return {
      ...area,
      type: "common_area",
      presence_status: "available", // Common areas are always considered available
      status_message: null, // Common areas don't have status messages
      call_status: callStatusData?.status || null,
      call_direction: callStatusData?.direction || null,
      presence_updated_at: presenceEntry?.presence_updated_at || null,
      status_updated_at: null,
    }
  })

  // Combine and return
  return [...users, ...commonAreas]
}

// Get detailed extension info for profile popup
export async function getExtensionDetails(extensionId: string, extensionType: string) {
  try {
    const accessToken = await getAccessToken()

    if (extensionType === "user") {
      // Get user details
      const userResponse = await fetch(`https://api.zoom.us/v2/users/${extensionId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!userResponse.ok) {
        throw new Error(`Failed to fetch user details: ${userResponse.statusText}`)
      }

      const userData = await userResponse.json()

      // Get phone info
      const phoneResponse = await fetch(`https://api.zoom.us/v2/phone/users/${extensionId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!phoneResponse.ok) {
        throw new Error(`Failed to fetch phone details: ${phoneResponse.statusText}`)
      }

      const phoneData = await phoneResponse.json()
      const callStatusData = callStorage.getFormattedCallStatus(extensionId)

      return {
        ...userData,
        ...phoneData,
        type: "user",
        presence_status: presenceStorage.getPresence(extensionId),
        status_message: presenceStorage.getStatusMessage(extensionId),
        call_status: callStatusData?.status || null,
        call_direction: callStatusData?.direction || null,
      }
    } else {
      // Get common area details
      const response = await fetch(`https://api.zoom.us/v2/phone/common_areas/${extensionId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch common area details: ${response.statusText}`)
      }

      const data = await response.json()
      const callStatusData = callStorage.getFormattedCallStatus(extensionId)

      return {
        ...data,
        type: "common_area",
        presence_status: "available", // Common areas are always considered available
        status_message: null, // Common areas don't have status messages
        call_status: callStatusData?.status || null,
        call_direction: callStatusData?.direction || null,
      }
    }
  } catch (error) {
    console.error("Error fetching extension details:", error)
    throw error
  }
}
