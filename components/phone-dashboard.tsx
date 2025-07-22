import { getPhoneExtensions } from "@/lib/zoom-api"
import { ExtensionsList } from "@/components/extensions-list"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Settings } from "lucide-react"

export async function PhoneDashboard() {
  try {
    const extensions = await getPhoneExtensions()

    if (!extensions || extensions.length === 0) {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Extensions Found</AlertTitle>
          <AlertDescription>
            No phone extensions found. This could mean:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Your Zoom account has no phone users assigned</li>
              <li>The API credentials don't have the required permissions</li>
              <li>Your Zoom account doesn't have Phone licenses</li>
            </ul>
          </AlertDescription>
        </Alert>
      )
    }

    return <ExtensionsList extensions={extensions} />
  } catch (error) {
    console.error("Error loading phone extensions:", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuration Error</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              <strong>Error:</strong> {errorMessage}
            </p>

            {errorMessage.includes("environment variable") && (
              <div className="mt-4 p-4 bg-muted rounded-md">
                <h4 className="font-medium mb-2">Required Environment Variables:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>
                    <code>ZOOM_API_KEY</code> - Your Zoom App's API Key
                  </li>
                  <li>
                    <code>ZOOM_API_SECRET</code> - Your Zoom App's API Secret
                  </li>
                  <li>
                    <code>ZOOM_ACCOUNT_ID</code> - Your Zoom Account ID
                  </li>
                </ul>
                <p className="mt-2 text-sm text-muted-foreground">
                  Please ensure these are set in your Vercel project settings.
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>

        <Alert>
          <Settings className="h-4 w-4" />
          <AlertTitle>Setup Instructions</AlertTitle>
          <AlertDescription>
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>
                Go to{" "}
                <a
                  href="https://marketplace.zoom.us/"
                  className="text-blue-600 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Zoom Marketplace
                </a>
              </li>
              <li>Create a "Server-to-Server OAuth" app</li>
              <li>
                Add required scopes: <code>phone:read:admin</code>, <code>user:read:admin</code>
              </li>
              <li>Copy your API Key, Secret, and Account ID to Vercel environment variables</li>
              <li>Refresh this page</li>
            </ol>
          </AlertDescription>
        </Alert>
      </div>
    )
  }
}
