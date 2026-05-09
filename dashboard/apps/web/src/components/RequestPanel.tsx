import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@workspace/ui/components/dialog"
import { Radio } from "lucide-react"
import type { RequestResponse } from "@/hooks/useSensorData"

interface RequestPanelProps {
  lastResponse: RequestResponse | null
  requestSecurity: () => Promise<string | null>
}

export function RequestPanel({ lastResponse, requestSecurity }: RequestPanelProps) {
  const [loading, setLoading] = useState(false)
  const [correlationId, setCorrelationId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleRequest = async () => {
    setLoading(true)
    const cid = await requestSecurity()
    setCorrelationId(cid)
    setLoading(false)
    if (cid) {
      setDialogOpen(true)
    }
  }

  return (
    <>
      <Card size="sm" className="h-full flex flex-col">
        <CardHeader className="shrink-0">
          <CardTitle className="text-sm">Security Request</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <Button onClick={handleRequest} disabled={loading} className="w-full" variant="default">
            {loading ? (
              "Mengirim..."
            ) : (
              <span className="flex items-center gap-2">
                <Radio size={16} />
                Request Security Status
              </span>
            )}
          </Button>
          {correlationId && (
            <p className="mt-2 text-xs text-muted-foreground truncate">
              Correlation: {correlationId}
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#161b22] border border-[#21262d] text-[#e6edf3]">
          <DialogHeader>
            <DialogTitle className="text-[#e6edf3]">Security Status Response</DialogTitle>
            <DialogDescription className="text-[#c9d1d9]">
              Response from Sensor Keamanan (correlation: {correlationId?.slice(0, 8)}...)
            </DialogDescription>
          </DialogHeader>
          {lastResponse ? (
            <div className="space-y-3">
              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 items-baseline">
                <span className="text-xs text-[#64748b] uppercase tracking-wide">Door Status:</span>
                <span className="text-sm font-medium text-white">
                  {String(lastResponse.data.doorStatus || "—")}
                </span>
                <span className="text-xs text-[#64748b] uppercase tracking-wide">Motion:</span>
                <span className="text-sm font-medium text-white">
                  {lastResponse.data.motionDetected ? "Detected" : "None"}
                </span>
                <span className="text-xs text-[#64748b] uppercase tracking-wide">Last Access:</span>
                <span className="text-sm font-medium text-white">
                  {String(lastResponse.data.lastAccess || "—")}
                </span>
                <span className="text-xs text-[#64748b] uppercase tracking-wide">Device:</span>
                <span className="text-sm font-medium text-white">
                  {String(lastResponse.data.device || "—")}
                </span>
              </div>
              <div className="text-xs text-[#c9d1d9] pt-1">
                Response time: {new Date(lastResponse.timestamp).toLocaleTimeString("id-ID", { hour12: false })}
              </div>
              <details>
                <summary className="text-xs text-[#c9d1d9] cursor-pointer">Raw JSON</summary>
                <pre className="mt-2 text-xs bg-[#0d1117] border border-[#21262d] p-2 rounded-lg overflow-auto max-h-32 text-[#e6edf3]">
                  {JSON.stringify(lastResponse.data, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Waiting for response...</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
