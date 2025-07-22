import type { NextRequest } from "next/server"

// Store active SSE connections with better tracking
const connections = new Map<string, ReadableStreamDefaultController>()
let lastEventId = 0

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  const connectionId = Math.random().toString(36).substring(7)

  // Get the Last-Event-ID from headers for reconnection
  const lastEventIdHeader = request.headers.get("Last-Event-ID")
  const clientLastEventId = lastEventIdHeader ? Number.parseInt(lastEventIdHeader) : 0

  console.log(`New SSE connection: ${connectionId}, Last-Event-ID: ${clientLastEventId}`)

  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to our map
      connections.set(connectionId, controller)

      // Send initial connection message with event ID
      try {
        lastEventId++
        const message = `id: ${lastEventId}\ndata: ${JSON.stringify({
          type: "connected",
          connectionId,
          timestamp: new Date().toISOString(),
        })}\n\n`
        controller.enqueue(encoder.encode(message))
        console.log(`SSE connection ${connectionId} established with event ID ${lastEventId}`)
      } catch (error) {
        console.error("Error sending initial SSE message:", error)
      }

      // Send periodic heartbeat every 2-3 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          lastEventId++
          const heartbeat = `id: ${lastEventId}\ndata: ${JSON.stringify({
            type: "heartbeat",
            timestamp: new Date().toISOString(),
          })}\n\n`
          controller.enqueue(encoder.encode(heartbeat))
        } catch (error) {
          console.log(`Heartbeat failed for connection ${connectionId}, cleaning up`)
          clearInterval(heartbeatInterval)
          connections.delete(connectionId)
        }
      }, 2500) // Send heartbeat every 2.5 seconds

      // Set up cleanup
      const cleanup = () => {
        clearInterval(heartbeatInterval)
        connections.delete(connectionId)
        console.log(`SSE connection ${connectionId} closed. Remaining: ${connections.size}`)
        try {
          controller.close()
        } catch (e) {
          // Already closed
        }
      }

      // Handle client disconnect
      request.signal.addEventListener("abort", cleanup)

      // Close connection at 55 seconds to avoid Vercel timeout (our way, not Vercel's)
      const closeTimeout = setTimeout(() => {
        console.log(`Gracefully closing SSE connection ${connectionId} after 55 seconds`)
        try {
          // Send a final message indicating planned closure
          lastEventId++
          const closeMessage = `id: ${lastEventId}\ndata: ${JSON.stringify({
            type: "connection_closing",
            reason: "timeout_prevention",
            timestamp: new Date().toISOString(),
          })}\n\n`
          controller.enqueue(encoder.encode(closeMessage))
        } catch (e) {
          // Ignore if already closed
        }
        cleanup()
      }, 55000) // Close after 55 seconds

      // Clean up the timeout if connection closes early
      request.signal.addEventListener("abort", () => {
        clearTimeout(closeTimeout)
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control, Last-Event-ID",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  })
}

// Function to broadcast updates to all connected clients with event IDs
export function broadcastUpdate(data: any) {
  const encoder = new TextEncoder()

  // Increment event ID for this broadcast
  lastEventId++

  const message = `id: ${lastEventId}\ndata: ${JSON.stringify({
    ...data,
    eventId: lastEventId,
  })}\n\n`
  const encodedMessage = encoder.encode(message)

  console.log(`Broadcasting to ${connections.size} SSE clients (Event ID: ${lastEventId}):`, data.type)

  // Track dead connections
  const deadConnections: string[] = []

  for (const [connectionId, controller] of connections) {
    try {
      controller.enqueue(encodedMessage)
    } catch (error) {
      console.log(`Dead SSE connection detected: ${connectionId}`)
      deadConnections.push(connectionId)
    }
  }

  // Remove dead connections
  for (const deadId of deadConnections) {
    connections.delete(deadId)
  }

  console.log(`SSE broadcast complete. Active connections: ${connections.size}, Event ID: ${lastEventId}`)
}

// Get current event ID (for debugging)
export function getCurrentEventId(): number {
  return lastEventId
}
