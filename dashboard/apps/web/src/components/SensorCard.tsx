import { Card, CardContent } from "@workspace/ui/components/card"
import type { SensorData } from "@/hooks/useSensorData"
import {
  Thermometer,
  Droplets,
  Users,
  Wind,
  Settings,
  Eye,
  DoorOpen,
  KeyRound,
} from "lucide-react"

interface SensorCardProps {
  title: string
  topic: string
  unit: string
  sensorData: Map<string, SensorData>
  thresholds?: { warning?: number; critical?: number }
}

const TOPIC_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  suhu: Thermometer,
  kelembapan: Droplets,
  okupansi: Users,
  co2: Wind,
  peralatan: Settings,
  gerak: Eye,
  pintu: DoorOpen,
  akses: KeyRound,
}

function getIconForTopic(topic: string) {
  for (const [key, Icon] of Object.entries(TOPIC_ICONS)) {
    if (topic.includes(key)) return Icon
  }
  return null
}

export function SensorCard({ title, topic, unit, sensorData, thresholds }: SensorCardProps) {
  const entry = sensorData.get(topic)
  const value = entry?.payload?.value
  const timestamp = entry?.payload?.timestamp
  const displayValue = typeof value === "boolean" ? (value ? "TRUE" : "FALSE") : value ?? "—"

  let borderColor = "border-[#2ea043]/30"
  if (thresholds && typeof value === "number") {
    if (thresholds.critical && value >= thresholds.critical) {
      borderColor = "border-[#f85149]"
    } else if (thresholds.warning && value >= thresholds.warning) {
      borderColor = "border-[#d29922]"
    }
  }

  const Icon = getIconForTopic(topic)

  return (
    <Card
      size="sm"
      className={`transition-all duration-300 ${borderColor} border`}
    >
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wider">
            {Icon && <Icon size={16} className="text-[#64748b]" />}
            {title}
          </span>
          <span className="text-xs text-muted-foreground">{unit}</span>
        </div>
        <div className="text-2xl font-bold text-foreground tabular-nums">
          {displayValue}
        </div>
        <div className="mt-2 text-xs text-muted-foreground truncate" title={topic}>
          {topic}
        </div>
        {timestamp && (
          <div className="mt-1 text-xs text-muted-foreground/60">
            {new Date(timestamp).toLocaleTimeString("id-ID", { hour12: false })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
