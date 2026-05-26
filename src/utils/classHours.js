export function formatClassHours(val) {
  const num = parseFloat(val)
  if (isNaN(num)) return '—'
  if (Math.abs(num - 2 / 3) < 0.001) return '2/3'
  const rounded = Math.round(num * 100) / 100
  return rounded % 1 === 0 ? String(rounded) : String(parseFloat(rounded.toFixed(2)))
}

export function formatRemainingClasses(val) {
  const num = parseFloat(val)
  if (isNaN(num)) return '—'
  const rounded = Math.round(num * 100) / 100
  return rounded % 1 === 0 ? String(rounded) : String(parseFloat(rounded.toFixed(2)))
}

export function packageProgressPercent(pkg) {
  const total = parseFloat(pkg?.totalClasses)
  const remaining = parseFloat(pkg?.remainingClasses)
  if (!total || total <= 0 || isNaN(total)) return 0
  const used = total - (isNaN(remaining) ? 0 : remaining)
  return Math.min(100, Math.max(0, Math.round((used / total) * 100)))
}
