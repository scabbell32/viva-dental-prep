// Returns the current program week number (1-20) based on today's date.
// Program starts June 30, 2026.
const PROGRAM_START = new Date('2026-06-30')

export function getCurrentWeekNumber(): number {
  const now = new Date()
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const elapsed = now.getTime() - PROGRAM_START.getTime()
  if (elapsed < 0) return 1
  const week = Math.floor(elapsed / msPerWeek) + 1
  return Math.min(week, 20)
}
