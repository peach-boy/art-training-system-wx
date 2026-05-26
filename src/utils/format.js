export function formatStudentLabel(s) {
  if (!s) return ''
  const name = s.name || ''
  const nick = s.nickname ? `（${s.nickname}）` : ''
  const base = `${name}${nick}`
  const st = s.status
  if (st === 'active') return base
  if (st === 'notStart' || st === 'not_start' || st === 'prospective') return `${base}[未开始]`
  if (st === 'graduated') return `${base}[不续费]`
  if (st === 'suspended') return `${base}[暂停]`
  return base
}

export function formatDateTime(str) {
  if (!str) return '-'
  return String(str).replace('T', ' ').substring(0, 16)
}

export function statusLabel(status) {
  const map = {
    active: '在读',
    notStart: '未开始',
    not_start: '未开始',
    prospective: '意向',
    graduated: '不续费',
    suspended: '暂停'
  }
  return map[status] || status || '—'
}

export function feeStatusLabel(feeStatus) {
  const map = {
    overdue: '待续费',
    warning: '预警',
    normal: '正常',
    not_started: '未开始'
  }
  return map[feeStatus] || feeStatus || '—'
}

export function packageStatusLabel(status) {
  const map = {
    active: '使用中',
    expired: '已过期',
    consumed: '已结束',
    suspended: '暂停',
    transferred: '已转移'
  }
  return map[status] || status || '—'
}

export function packageKindLabel(kind) {
  return kind === 'activity' ? '活动' : '正常'
}

export function formatMoney(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  if (isNaN(n)) return '—'
  return `¥${n.toFixed(2)}`
}
