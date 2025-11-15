'use client'

interface Metric {
  label: string
  value: number | string
}

const metrics: Metric[] = [
  { label: 'Total Stitches', value: 0 },
  { label: 'Avg Speed (RPM)', value: 0 },
  { label: 'Running', value: 0 },
  { label: 'Stopped', value: 0 },
  { label: 'Total Stop Events', value: 0 },
  { label: 'All Machines', value: 0 },
]

export default function MetricsBar() {
  return (
    <div className="px-6 py-4">
      <div className="flex items-center gap-8 flex-wrap">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">{metric.label}</span>
            <span className="text-lg font-semibold text-gray-900">{metric.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

