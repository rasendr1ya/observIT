import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Thermometer, Wind } from "lucide-react"
import type { ChartPoint } from "@/hooks/useSensorData"

interface LiveChartProps {
  chartData: ChartPoint[]
}

const tooltipStyle = {
  backgroundColor: "#161b22",
  border: "1px solid rgba(230,237,243,0.1)",
  borderRadius: "8px",
  color: "#e6edf3",
  fontSize: "12px",
}

export function LiveChart({ chartData }: LiveChartProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {/* Chart A — Temperature */}
      <Card size="sm" className="border border-[#21262d]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wider">
            <Thermometer size={16} className="text-[#38bdf8]" />
            Suhu
            <span className="text-muted-foreground/60 normal-case tracking-normal text-[11px] ml-1">(&deg;C)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(230,237,243,0.08)" />
                <XAxis dataKey="time" stroke="#8b949e" tick={{ fontSize: 10 }} />
                <YAxis
                  yAxisId="left"
                  stroke="#8b949e"
                  tick={{ fontSize: 10 }}
                  domain={[0, 50]}
                  label={{ value: "\u00B0C", position: "insideLeft", style: { fill: "#8b949e", fontSize: 10 } }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  wrapperStyle={{ fontSize: "11px", color: "#e6edf3", display: "flex", justifyContent: "center" }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="kelasSuhu"
                  name="Kelas"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="labSuhu"
                  name="Lab"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Chart B — CO2 */}
      <Card size="sm" className="border border-[#21262d]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wider">
            <Wind size={16} className="text-[#f87171]" />
            CO2 Lab
            <span className="text-muted-foreground/60 normal-case tracking-normal text-[11px] ml-1">(ppm)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(230,237,243,0.08)" />
                <XAxis dataKey="time" stroke="#8b949e" tick={{ fontSize: 10 }} />
                <YAxis
                  yAxisId="left"
                  stroke="#8b949e"
                  tick={{ fontSize: 10 }}
                  domain={[0, 2000]}
                  label={{ value: "ppm", position: "insideLeft", style: { fill: "#8b949e", fontSize: 10 } }}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  wrapperStyle={{ fontSize: "11px", color: "#e6edf3", display: "flex", justifyContent: "center" }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="labCO2"
                  name="CO2"
                  stroke="#f87171"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
