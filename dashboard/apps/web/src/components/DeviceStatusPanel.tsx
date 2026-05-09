import { Card, CardHeader, CardTitle, CardContent } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import type { DeviceStatus } from "@/hooks/useSensorData"

interface DeviceStatusPanelProps {
  deviceStatus: Map<string, DeviceStatus>
}

interface DeviceCardConfig {
  deviceKey: string
  label: string
  location: string
}

const DEVICE_CONFIGS: DeviceCardConfig[] = [
  { deviceKey: "SensorKelas", label: "Sensor Kelas", location: "Gedung A Lt.3" },
  { deviceKey: "SensorLab", label: "Sensor Lab", location: "Lab Jaringan Lt.2" },
  { deviceKey: "SensorKeamanan", label: "Sensor Keamanan", location: "Pintu Utama Gedung A" },
]

export function DeviceStatusPanel({ deviceStatus }: DeviceStatusPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {DEVICE_CONFIGS.map((cfg) => {
        const status = deviceStatus.get(cfg.deviceKey)
        const isOnline = status?.status === "online"
        const lastSeen = status?.timestamp || "—"

        return (
          <Card key={cfg.deviceKey} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{cfg.label}</CardTitle>
                <Badge
                  variant={isOnline ? "default" : "destructive"}
                  className="text-xs"
                >
                  {isOnline ? "ONLINE" : "OFFLINE"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{cfg.location}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Last seen: {lastSeen ? new Date(lastSeen).toLocaleTimeString("id-ID", { hour12: false }) : "—"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${isOnline ? "bg-[#2ea043]" : "bg-[#f85149]"}`}
                />
                <span className="text-xs">{isOnline ? "Connected" : "Disconnected"}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
