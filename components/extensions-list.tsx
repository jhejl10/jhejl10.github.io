"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SiteGroup } from "@/components/site-group"
import { PollingControls } from "@/components/polling-controls"
import { Search, ArrowUpDown } from "lucide-react"
import { useRouter } from "next/navigation"

interface ExtensionsListProps {
  extensions: any[]
}

export function ExtensionsList({ extensions: initialExtensions }: ExtensionsListProps) {
  const [extensions, setExtensions] = useState(initialExtensions)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"extension" | "name">("extension")
  const [isPolling, setIsPolling] = useState(true)
  const [pollingInterval, setPollingInterval] = useState(5) // Default 5 seconds
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [lastPoll, setLastPoll] = useState<Date | null>(null)
  const [updateCount, setUpdateCount] = useState(0)
  const router = useRouter()

  const [isPaused, setIsPaused] = useState(false)
  const [pauseReason, setPauseReason] = useState<string | null>(null)
  const lastInteractionRef = useRef<number>(Date.now())
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Configuration
  const IDLE_THRESHOLD = 5 * 60 * 1000 // 5 minutes of inactivity
  const INTERACTION_EVENTS = ["mousemove", "keydown", "click", "scroll", "focus", "touchstart"]

  // Refs for managing polling
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isPollingRef = useRef(isPolling)

  // Update ref when polling state changes
  useEffect(() => {
    isPollingRef.current = isPolling
  }, [isPolling])

  // Debug: Log initial extensions
  useEffect(() => {
    console.log("=== INITIAL EXTENSIONS ===")
    console.log(`Loaded ${initialExtensions.length} extensions`)
    console.log("Using polling-based real-time updates")
    setLastPoll(new Date()) // Set initial poll time
  }, [initialExtensions])

  const pollForUpdates = useCallback(async () => {
    if (!isPollingRef.current || isPaused) {
      console.log("Polling skipped - paused or disabled")
      return
    }

    try {
      console.log("Polling for updates...")
      const pollTime = new Date()
      setLastPoll(pollTime)

      // Fetch fresh extension data
      const response = await fetch("/api/zoom/extensions/poll", {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
        },
      })

      if (!response.ok) {
        console.error("Polling failed:", response.status, response.statusText)
        return
      }

      const data = await response.json()

      if (data.extensions) {
        // Check if there are any changes
        const hasChanges = JSON.stringify(data.extensions) !== JSON.stringify(extensions)

        if (hasChanges) {
          console.log("Updates detected, refreshing extensions")
          setExtensions(data.extensions)
          setUpdateCount((prev) => prev + 1)
          setLastUpdate(pollTime)
        }
      }
    } catch (error) {
      console.error("Polling error:", error)
    }
  }, [extensions, isPaused])

  // Track user interaction for idle detection
  const trackInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now()

    // Clear existing idle timeout
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current)
    }

    // If polling was paused due to idle, resume it
    if (isPaused && pauseReason === "idle") {
      console.log("User interaction detected, resuming polling")
      setIsPaused(false)
      setPauseReason(null)
    }

    // Set new idle timeout
    idleTimeoutRef.current = setTimeout(() => {
      if (!document.hidden) {
        // Only pause for idle if tab is visible
        console.log(`No interaction for ${IDLE_THRESHOLD / 1000}s, pausing polling`)
        setIsPaused(true)
        setPauseReason("idle")
      }
    }, IDLE_THRESHOLD)
  }, [isPaused, pauseReason])

  // Set up polling interval
  useEffect(() => {
    if (isPolling) {
      console.log(`Starting polling every ${pollingInterval} seconds`)

      const poll = () => {
        pollForUpdates()
        if (isPollingRef.current) {
          pollingTimeoutRef.current = setTimeout(poll, pollingInterval * 1000)
        }
      }

      // Start polling immediately, then at intervals
      poll()
    } else {
      console.log("Polling paused")
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
        pollingTimeoutRef.current = null
      }
    }

    // Cleanup on unmount or when polling stops
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current)
        pollingTimeoutRef.current = null
      }
    }
  }, [isPolling, pollingInterval, pollForUpdates])

  // Set up interaction tracking
  useEffect(() => {
    // Add interaction event listeners
    INTERACTION_EVENTS.forEach((event) => {
      document.addEventListener(event, trackInteraction, { passive: true })
    })

    // Initial interaction tracking
    trackInteraction()

    return () => {
      // Clean up event listeners
      INTERACTION_EVENTS.forEach((event) => {
        document.removeEventListener(event, trackInteraction)
      })
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current)
      }
    }
  }, [trackInteraction])

  // Handle visibility change (tab hidden/visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("Tab hidden, pausing polling")
        setIsPaused(true)
        setPauseReason("hidden")
      } else {
        console.log("Tab visible, resuming polling")
        if (isPaused && pauseReason === "hidden") {
          setIsPaused(false)
          setPauseReason(null)
        }
        // Reset interaction tracking when tab becomes visible
        trackInteraction()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [isPaused, pauseReason, trackInteraction])

  const handleTogglePolling = useCallback(() => {
    if (isPolling) {
      // Manual pause
      setIsPolling(false)
      setIsPaused(true)
      setPauseReason("manual")
    } else {
      // Manual resume
      setIsPolling(true)
      setIsPaused(false)
      setPauseReason(null)
    }
  }, [isPolling])

  // Handle interval change
  const handleIntervalChange = useCallback((newInterval: number) => {
    console.log(`Changing polling interval to ${newInterval} seconds`)
    setPollingInterval(newInterval)
  }, [])

  // Define getDisplayName function
  const getDisplayName = (extension: any) => {
    if (extension.type === "user") {
      if (extension.display_name) return extension.display_name
      if (extension.first_name || extension.last_name) {
        return `${extension.first_name || ""} ${extension.last_name || ""}`.trim()
      }
      if (extension.email) {
        return extension.email.split("@")[0]
      }
      return "Unknown User"
    } else {
      return extension.display_name || extension.name || "Unknown"
    }
  }

  const filteredAndGroupedExtensions = useMemo(() => {
    const filtered = extensions.filter((ext) => {
      const displayName = getDisplayName(ext)
      const searchLower = searchTerm.toLowerCase()

      return (
        displayName.toLowerCase().includes(searchLower) ||
        ext.extension_number.includes(searchLower) ||
        (ext.site?.name || "Default Site").toLowerCase().includes(searchLower) ||
        (ext.status_message && ext.status_message.toLowerCase().includes(searchLower))
      )
    })

    const grouped = filtered.reduce((acc: any, extension: any) => {
      const site = extension.site?.name || "Default Site"
      if (!acc[site]) {
        acc[site] = []
      }
      acc[site].push(extension)
      return acc
    }, {})

    Object.keys(grouped).forEach((site) => {
      grouped[site].sort((a: any, b: any) => {
        if (sortBy === "extension") {
          return Number.parseInt(a.extension_number) - Number.parseInt(b.extension_number)
        } else {
          const nameA = getDisplayName(a)
          const nameB = getDisplayName(b)
          return nameA.localeCompare(nameB)
        }
      })
    })

    return grouped
  }, [extensions, searchTerm, sortBy])

  const sortedSites = Object.keys(filteredAndGroupedExtensions).sort((a, b) => a.localeCompare(b))

  return (
    <div className="space-y-6">
      {/* Polling Controls */}
      <PollingControls
        isPolling={isPolling && !isPaused}
        pollingInterval={pollingInterval}
        onTogglePolling={handleTogglePolling}
        onIntervalChange={handleIntervalChange}
        lastUpdate={lastUpdate}
        lastPoll={lastPoll}
        updateCount={updateCount}
        isPaused={isPaused}
        pauseReason={pauseReason}
      />

      {/* Search and Sort Controls */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search extensions, names, sites, or status messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortBy(sortBy === "extension" ? "name" : "extension")}
          className="flex items-center gap-2"
        >
          <ArrowUpDown className="h-3 w-3" />
          Sort by {sortBy === "extension" ? "Name" : "Extension"}
        </Button>
      </div>

      {/* Extensions by Site */}
      {sortedSites.map((siteName) => (
        <SiteGroup key={siteName} siteName={siteName} extensions={filteredAndGroupedExtensions[siteName]} />
      ))}

      {sortedSites.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">No extensions found matching your search.</div>
      )}
    </div>
  )
}
