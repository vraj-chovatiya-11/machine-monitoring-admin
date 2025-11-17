import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Calculate machine efficiency based on runtime and stop time
 * Efficiency = (Runtime in minutes) / (Runtime in minutes + Stop time in minutes) * 100
 *
 * @param stopTimeSeconds - Total stop time in seconds
 * @param runtimeMinutes - Runtime in minutes (optional, will calculate from start of day if not provided)
 * @returns Efficiency percentage (0-100)
 */
export function calculateEfficiency(stopTimeSeconds: number, runtimeMinutes?: number): number {
  // Convert stop time from seconds to minutes
  const stopTimeMinutes = stopTimeSeconds / 60

  // If runtime is not provided, calculate from start of day
  if (runtimeMinutes === undefined) {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const elapsedMinutes = (now.getTime() - startOfDay.getTime()) / (1000 * 60)
    runtimeMinutes = elapsedMinutes - stopTimeMinutes
  }

  // Ensure runtime is not negative
  const runtime = Math.max(0, runtimeMinutes)

  // Calculate efficiency: runtime / (runtime + stop time) * 100
  const totalTime = runtime + stopTimeMinutes
  if (totalTime === 0) return 0

  const efficiency = (runtime / totalTime) * 100
  return Math.min(100, Math.max(0, Math.round(efficiency * 100) / 100))
}

