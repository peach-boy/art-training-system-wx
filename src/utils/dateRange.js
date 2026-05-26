/** 课时列表：按日 / 按周 / 按月计算查询区间 */

export const PERIOD_MODES = [
  { key: 'day', label: '按日' },
  { key: 'week', label: '按周' },
  { key: 'month', label: '按月' }
]

function pad2(n) {
  return String(n).padStart(2, '0')
}

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** @param {string} dateStr YYYY-MM-DD */
export function getDayRange(dateStr) {
  return { startDate: dateStr, endDate: dateStr }
}

/** 周一至周日（ISO 周，周一为第一天） */
export function getWeekRange(anchorDate) {
  const d = parseDate(anchorDate)
  const day = d.getDay() || 7
  const monday = new Date(d)
  monday.setDate(d.getDate() - day + 1)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    startDate: formatDate(monday),
    endDate: formatDate(sunday)
  }
}

/** @param {string} monthStr YYYY-MM */
export function getMonthRange(monthStr) {
  const [y, m] = monthStr.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return {
    startDate: `${y}-${pad2(m)}-01`,
    endDate: `${y}-${pad2(m)}-${pad2(last)}`
  }
}

export function formatDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function parseDate(str) {
  const [y, m, d] = (str || todayStr()).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function weekRangeLabel(startDate, endDate) {
  return `${startDate} ~ ${endDate}`
}

export function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}
