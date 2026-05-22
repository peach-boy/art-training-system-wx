function formatStudentLabel(s) {
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

function formatDateTime(str) {
  if (!str) return '-'
  return String(str).replace('T', ' ').substring(0, 16)
}

module.exports = {
  formatStudentLabel,
  formatDateTime
}
