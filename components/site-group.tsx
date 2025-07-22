import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PhoneExtension } from "@/components/phone-extension"
import { Building2, Phone } from "lucide-react"

interface SiteGroupProps {
  siteName: string
  extensions: any[]
}

export function SiteGroup({ siteName, extensions }: SiteGroupProps) {
  const activeExtensions = extensions.filter(
    (ext) =>
      ext.presence_status === "available" || ext.presence_status === "busy" || ext.presence_status === "in_meeting",
  ).length

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-xl">{siteName}</CardTitle>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {extensions.length} Extensions
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              {activeExtensions} Active
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {extensions.map((extension) => (
            <PhoneExtension key={extension.id} extension={extension} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
