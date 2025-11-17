'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  Machine,
  ReportFormat,
  ReportRangeType,
  ReportRecord,
  ReportStatus,
} from '@/types'
import { machineService, reportService } from '@/services/api'

const statusStyles: Record<ReportStatus, string> = {
  ready: 'bg-green-100 text-green-800 border border-green-200',
  processing: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  failed: 'bg-red-100 text-red-800 border border-red-200',
}

const formatBytes = (value?: number | null) => {
  if (!value || value <= 0) {
    return '—'
  }
  if (value < 1024) {
    return `${value} B`
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

const formatDateTime = (value: string) => {
  try {
    return new Date(value).toLocaleString()
  } catch (_error) {
    return value
  }
}

const todayDateString = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getErrorMessage = (error: unknown) => {
  if (typeof error === 'string') {
    return error
  }
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response
  ) {
    const data = (error as any).response.data
    if (typeof data?.message === 'string') {
      return data.message
    }
  }
  return 'Something went wrong. Please try again.'
}

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) {
    return '00:00:00'
  }
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

const ReportsPanel = () => {
  const [machines, setMachines] = useState<Machine[]>([])
  const [selectedMachine, setSelectedMachine] = useState<number | null>(null)
  const [reports, setReports] = useState<ReportRecord[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [loadingMachines, setLoadingMachines] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [rangeType, setRangeType] = useState<ReportRangeType>('daily')
  const [fileFormat, setFileFormat] = useState<ReportFormat>('pdf')
  const [targetDate, setTargetDate] = useState<string>(todayDateString())

  const machineLabelMap = useMemo(() => {
    const map = new Map<number, string>()
    machines.forEach((machine) => {
      if (machine.fac_machine_number) {
        map.set(machine.fac_machine_number, machine.name)
      }
    })
    return map
  }, [machines])

  const loadMachines = useCallback(async () => {
    setLoadingMachines(true)
    try {
      const data = await machineService.getMachines(1, 100)
      setMachines(data)
      setSelectedMachine((prev) => {
        if (prev !== null && prev !== undefined) {
          return prev
        }
        return data[0]?.fac_machine_number ?? null
      })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoadingMachines(false)
    }
  }, [])

  const loadReports = useCallback(async () => {
    setLoadingReports(true)
    try {
      const result = await reportService.listReports()
      setReports(result.data ?? [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoadingReports(false)
    }
  }, [])

  useEffect(() => {
    loadMachines()
    loadReports()
  }, [loadMachines, loadReports])

  const handleGenerateReport = async () => {
    if (!selectedMachine) {
      setError('Select a machine to generate the report.')
      return
    }

    setIsGenerating(true)
    setError(null)
    setSuccessMessage(null)
    try {
      await reportService.generateReport({
        machine_number: selectedMachine,
        range_type: rangeType,
        date: targetDate,
        format: fileFormat,
      })
      setSuccessMessage('Report generated successfully. It will be available for download shortly.')
      await loadReports()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async (report: ReportRecord) => {
    setError(null)
    setDownloadingId(report.id)

    try {
      const { blob, fileName } = await reportService.downloadReport(report.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = report.file_name || fileName || `report-${report.id}.${report.file_format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Machine Performance Reports</h1>
            <p className="mt-1 text-sm text-gray-500">
              Generate PDF or Excel rollups for today or the trailing 30 days and download them anytime.
            </p>
          </div>
          <button
            type="button"
            onClick={loadReports}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            disabled={loadingReports}
          >
            {loadingReports ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col text-sm font-medium text-gray-700">
            Machine
            <select
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedMachine ?? ''}
              onChange={(event) => setSelectedMachine(Number(event.target.value))}
              disabled={loadingMachines}
            >
              <option value="" disabled>
                {loadingMachines ? 'Loading machines...' : 'Select'}
              </option>
              {machines.map((machine) =>
                machine.fac_machine_number ? (
                  <option key={machine.id} value={machine.fac_machine_number}>
                    {machine.name} (#{machine.fac_machine_number})
                  </option>
                ) : null
              )}
            </select>
          </label>

          <label className="flex flex-col text-sm font-medium text-gray-700">
            Format
            <select
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={fileFormat}
              onChange={(event) => setFileFormat(event.target.value as ReportFormat)}
            >
              <option value="pdf">PDF</option>
              <option value="xlsx">Excel</option>
            </select>
          </label>

          <label className="flex flex-col text-sm font-medium text-gray-700">
            Range
            <select
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={rangeType}
              onChange={(event) => setRangeType(event.target.value as ReportRangeType)}
            >
              <option value="daily">Today / Specific Day</option>
              <option value="last_month">Last 30 Days (rolling)</option>
            </select>
          </label>

          <label className="flex flex-col text-sm font-medium text-gray-700">
            {rangeType === 'daily' ? 'Day' : 'Window End Date'}
            <input
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
              className="mt-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {rangeType === 'last_month' && (
              <span className="mt-1 text-xs text-gray-500">Rolling 30 days ending on this date</span>
            )}
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={isGenerating || !selectedMachine}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </button>
          {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Generated Reports</h2>
            <p className="text-sm text-gray-500">Download historical rollups whenever you need them.</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-3">Machine</th>
                <th className="px-4 py-3">Range</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3">Availability</th>
                <th className="px-4 py-3">Downtime</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingReports ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-gray-500">
                    Loading reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-gray-500">
                    No reports yet. Generate one to see it here.
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const summary = report.rollup_summary
                  return (
                    <tr key={report.id} className="text-gray-900">
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {machineLabelMap.get(report.machine_number) ?? `Machine #${report.machine_number}`}
                        </div>
                        <div className="text-xs text-gray-500">#{report.machine_number}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {summary?.range_label ?? `${report.start_date} → ${report.end_date}`}
                        </div>
                        {summary?.range_type === 'last_month' && (
                          <div className="text-xs text-gray-500">Rolling 30 days</div>
                        )}
                      </td>
                      <td className="px-4 py-3 uppercase">{report.file_format}</td>
                      <td className="px-4 py-3">
                        {summary?.availability_percentage !== undefined
                          ? `${summary.availability_percentage}%`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">{formatDuration(summary?.downtime_seconds)}</td>
                      <td className="px-4 py-3">{formatBytes(report.file_size)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[report.status]}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{formatDateTime(report.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDownload(report)}
                          disabled={report.status !== 'ready' || downloadingId === report.id}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                        >
                          {downloadingId === report.id ? 'Downloading...' : 'Download'}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ReportsPanel

