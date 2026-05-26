export const LESSON_TYPES = [
  { value: 'regular', label: '正式课' },
  { value: 'trial', label: '试听课' },
  { value: 'gift', label: '赠送课' },
  { value: 'temp', label: '临时课' },
  { value: 'renewal_pending', label: '超出课时' }
]

export function labelOf(type) {
  if (type === 'marketing') return '营销活动课'
  const item = LESSON_TYPES.find((t) => t.value === type)
  return item ? item.label : '正式课'
}

export function dayOfWeekFromDate(dateStr) {
  const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const d = new Date(`${dateStr}T00:00:00`)
  return map[d.getDay()]
}
