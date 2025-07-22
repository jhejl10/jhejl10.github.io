"use client"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Timer, Play, Pause } from "lucide-react"

interface PollingControlsProps {
  isPolling: boolean
  pollingInterval: number
  onTogglePolling: () => void
  onIntervalChange: (interval: number) => void
  lastUpdate?: Date
  lastPoll?: Date
  updateCount?: number
  isPaused?: boolean
  pauseReason?: string | null
}

export function PollingControls({
  isPolling,
  pollingInterval,
  onTogglePolling,
  onIntervalChange,
  lastUpdate,
  lastPoll,
  updateCount = 0,
  isPaused = false,
  pauseReason = null,
}: PollingControlsProps) {
  const intervalOptions = [
    { value: 2, label: "2s" },
    { value: 3, label: "3s" },
    { value: 5, label: "5s" },
    { value: 10, label: "10s" },
    { value: 15, label: "15s" },
    { value: 30, label: "30s" },
    { value: 60, label: "1m" },
  ]

  const formatTimeAgo = (date?: Date) => {
    if (!date) return "Never"
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    return `${Math.floor(diff / 3600)}h ago`
  }

  const getDataFreshness = () => {
    if (!lastPoll) return { color: "text-gray-500", text: "No data" }

    const now = new Date()
    const diff = Math.floor((now.getTime() - lastPoll.getTime()) / 1000)

    if (diff < pollingInterval * 2) return { color: "text-green-600", text: "Current" }
    if (diff < pollingInterval * 5) return { color: "text-yellow-600", text: "Recent" }
    return { color: "text-red-600", text: "Stale" }
  }

  const freshness = getDataFreshness()

  return (
    <div className="flex items-center gap-4">
      {/* Polling controls */}
      <div className="flex items-center gap-2">
        <Timer className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium">Polling:</span>

        {/* Compact interval selector */}
        <Select value={pollingInterval.toString()} onValueChange={(value) => onIntervalChange(Number(value))}>
          <SelectTrigger className="w-16 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {intervalOptions.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Compact Start/Stop button */}
        <Button variant="outline" size="sm" onClick={onTogglePolling} className="h-8 px-3">
          {isPolling ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </Button>

        {/* Status indicator */}
        <Badge variant={isPolling && !isPaused ? "default" : "secondary"} className="h-6">
          <div
            className={`w-2 h-2 rounded-full mr-1 ${isPolling && !isPaused ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
          />
          {isPaused ? `Paused` : isPolling ? "Active" : "Stopped"}
        </Badge>
      </div>

      {/* Last poll time */}
      {lastPoll && (
        <div className="text-sm text-muted-foreground">
          Last poll:{" "}
          {lastPoll.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          })}
        </div>
      )}
    </div>
  )
}
