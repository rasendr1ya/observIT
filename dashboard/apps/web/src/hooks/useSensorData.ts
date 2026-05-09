import { useState, useEffect, useCallback, useRef } from "react"
import { socket } from "@/lib/socket"

// ─── Type Definitions ──────────────────────────────────────────────────
export interface SensorData {
  topic: string
  payload: { value: number | string | boolean; timestamp: string; userId?: number }
  userProperties: Record<string, string> | null
  timestamp: number
}

export interface DeviceStatus {
  device: string
  location: string
  status: "online" | "offline"
  timestamp: string
}

export interface Alert {
  level: "info" | "warning" | "critical"
  source: string
  message: string
  timestamp: string
}

export interface RequestResponse {
  correlationId: string | null
  data: Record<string, unknown>
  timestamp: number
}

export interface ChartPoint {
  time: string
  kelasSuhu: number | null
  labSuhu: number | null
  labCO2: number | null
}

// ─── Hook ──────────────────────────────────────────────────────────────
export function useSensorData() {
  const [sensorData, setSensorData] = useState<Map<string, SensorData>>(new Map())
  const [deviceStatus, setDeviceStatus] = useState<Map<string, DeviceStatus>>(new Map())
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [lastResponse, setLastResponse] = useState<RequestResponse | null>(null)
  const [connected, setConnected] = useState(false)

  const chartBuffer = useRef<ChartPoint[]>([])
  const latestValues = useRef<{ kelasSuhu: number | null; labSuhu: number | null; labCO2: number | null }>({
    kelasSuhu: null,
    labSuhu: null,
    labCO2: null,
  })

  // ─── Helper: add chart data point ──────────────────────────────────
  const addChartPoint = useCallback(() => {
    const now = new Date().toLocaleTimeString("id-ID", { hour12: false })
    const point: ChartPoint = {
      time: now,
      kelasSuhu: latestValues.current.kelasSuhu,
      labSuhu: latestValues.current.labSuhu,
      labCO2: latestValues.current.labCO2,
    }
    chartBuffer.current = [...chartBuffer.current, point].slice(-20)
    setChartData([...chartBuffer.current])
  }, [])

  useEffect(() => {
    socket.connect()

    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)

    const onInitHistory = (entries: SensorData[]) => {
      const map = new Map<string, SensorData>()
      entries.forEach((entry) => {
        map.set(entry.topic, entry)
      })
      setSensorData(map)
    }

    const onSensorUpdate = (event: SensorData) => {
      setSensorData((prev) => {
        const next = new Map(prev)
        next.set(event.topic, event)
        return next
      })

      // Track chart values
      const value = event.payload.value
      if (typeof value === "number") {
        if (event.topic === "its/dti/kelas/suhu") {
          latestValues.current.kelasSuhu = value
        } else if (event.topic === "its/dti/lab/suhu") {
          latestValues.current.labSuhu = value
        } else if (event.topic === "its/dti/lab/co2") {
          latestValues.current.labCO2 = value
        }
      }
    }

    const onDeviceStatus = (status: DeviceStatus) => {
      setDeviceStatus((prev) => {
        const next = new Map(prev)
        next.set(status.device, status)
        return next
      })
    }

    const onAlertTriggered = (alert: Alert) => {
      setAlerts((prev) => [alert, ...prev].slice(0, 10))
    }

    const onRequestResponse = (response: RequestResponse) => {
      setLastResponse(response)
    }

    socket.on("connect", onConnect)
    socket.on("disconnect", onDisconnect)
    socket.on("init:history", onInitHistory)
    socket.on("sensor:update", onSensorUpdate)
    socket.on("device:status", onDeviceStatus)
    socket.on("alert:triggered", onAlertTriggered)
    socket.on("request:response", onRequestResponse)

    // Add chart data point every 2 seconds
    const chartInterval = setInterval(addChartPoint, 2000)

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("init:history", onInitHistory)
      socket.off("sensor:update", onSensorUpdate)
      socket.off("device:status", onDeviceStatus)
      socket.off("alert:triggered", onAlertTriggered)
      socket.off("request:response", onRequestResponse)
      socket.disconnect()
      clearInterval(chartInterval)
    }
  }, [addChartPoint])

  // ─── Request Security Status (triggers MQTT Request-Response) ──────
  const requestSecurity = useCallback(async () => {
    try {
      const res = await fetch("/api/request-security", { method: "POST" })
      const data = await res.json()
      return data.correlationId as string
    } catch (err) {
      console.error("[useSensorData] Request security failed:", err)
      return null
    }
  }, [])

  return {
    sensorData,
    deviceStatus,
    alerts,
    chartData,
    lastResponse,
    connected,
    requestSecurity,
  }
}
