import { useSensorData } from "@/hooks/useSensorData"
import { DeviceStatusPanel } from "@/components/DeviceStatusPanel"
import { SensorCard } from "@/components/SensorCard"
import { LiveChart } from "@/components/LiveChart"
import { AlertLog } from "@/components/AlertLog"
import { RequestPanel } from "@/components/RequestPanel"

const SENSOR_CARDS = [
  { title: "Suhu Kelas", topic: "its/dti/kelas/suhu", unit: "°C", thresholds: { warning: 35, critical: 38 } },
  { title: "Kelembapan", topic: "its/dti/kelas/kelembapan", unit: "%" },
  { title: "Okupansi", topic: "its/dti/kelas/okupansi", unit: "orang" },
  { title: "Suhu Lab", topic: "its/dti/lab/suhu", unit: "°C", thresholds: { warning: 35, critical: 38 } },
  { title: "CO2 Lab", topic: "its/dti/lab/co2", unit: "ppm", thresholds: { warning: 1000, critical: 1200 } },
  { title: "Peralatan", topic: "its/dti/lab/peralatan", unit: "status" },
  { title: "Gerak", topic: "its/dti/keamanan/gerak", unit: "boolean" },
  { title: "Pintu", topic: "its/dti/keamanan/pintu", unit: "status" },
  { title: "Akses", topic: "its/dti/keamanan/akses", unit: "event" },
]

export function App() {
  const {
    sensorData,
    deviceStatus,
    alerts,
    chartData,
    lastResponse,
    connected,
    requestSecurity,
  } = useSensorData()

  return (
    <div className="dark min-h-svh bg-background text-foreground">
      
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-heading font-bold tracking-tight">
              observIT
            </h1>
            <p className="text-xs text-muted-foreground">
              Smart Campus Environment Monitoring — DTI ITS
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${connected ? "bg-[#2ea043]" : "bg-[#f85149]"}`}
              />
              <span className="text-xs text-muted-foreground">
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>
      </header>

      
      <main className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        
        <DeviceStatusPanel deviceStatus={deviceStatus} />

        
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          
          <div className="grid grid-cols-3 gap-3">
            {SENSOR_CARDS.map((sc) => (
              <SensorCard
                key={sc.topic}
                title={sc.title}
                topic={sc.topic}
                unit={sc.unit}
                sensorData={sensorData}
                thresholds={sc.thresholds}
              />
            ))}
          </div>

          
          <div className="flex flex-col gap-6 h-full">
            <AlertLog alerts={alerts} />
            <div className="flex-1 min-h-0">
              <RequestPanel lastResponse={lastResponse} requestSecurity={requestSecurity} />
            </div>
          </div>
        </div>

        
        <LiveChart chartData={chartData} />
      </main>

      
      <footer className="border-t border-border py-3 text-center">
        <p className="text-xs text-muted-foreground">
          Institut Teknologi Sepuluh Nopember — Departemen Teknologi Informasi
        </p>
      </footer>
    </div>
  )
}
