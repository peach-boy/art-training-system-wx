import { BASE_URL } from './config'

export function imageFullUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('blob:') || trimmed.startsWith('wxfile://') || trimmed.startsWith('http://tmp/')) {
    return trimmed
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }
  const path = trimmed.startsWith('/files/') ? trimmed : `/files/${trimmed.replace(/^\//, '')}`
  return `${BASE_URL}${path}`
}
