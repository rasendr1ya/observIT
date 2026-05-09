import { ScrollArea } from "@workspace/ui/components/scroll-area"
import type { Alert } from "@/hooks/useSensorData"

interface AlertLogProps {
  alerts: Alert[]
}

const levelStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: "bg-[#7f1d1d]", text: "text-[#fca5a5]", border: "border-[#dc2626]", label: "CRITICAL" },
  warning:  { bg: "bg-[#78350f]", text: "text-[#fcd34d]", border: "border-[#d97706]", label: "WARNING" },
  info:     { bg: "bg-[#1e3a5f]", text: "text-[#93c5fd]", border: "border-[#3b82f6]", label: "INFO" },
}

export function AlertLog({ alerts }: AlertLogProps) {
  return (
    <div className="bg-card rounded-2xl ring-1 ring-foreground/10 p-4">
      <h3 className="text-sm font-medium text-foreground mb-3">
        Alert Log
      </h3>
      {alerts.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          No alerts yet. Waiting for data...
        </p>
      ) : (
        <ScrollArea className="h-[260px]">
          <div className="space-y-2 pr-3">
            {alerts.map((alert, i) => {
              const style = levelStyles[alert.level] || levelStyles.info
              return (
                <div
                  key={`${alert.timestamp}-${i}`}
                  className="flex items-start gap-3 p-2 rounded-lg bg-secondary/50"
                >
                  <span
                    className={`shrink-0 text-xs uppercase px-2 py-0.5 rounded border ${style.bg} ${style.text} ${style.border}`}
                  >
                    {style.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{alert.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleTimeString("id-ID", { hour12: false })}
                      </span>
                      <span className="text-xs text-muted-foreground/60">·</span>
                      <span className="text-xs text-muted-foreground/60">{alert.source}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
