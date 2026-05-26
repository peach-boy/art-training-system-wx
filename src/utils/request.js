import { BASE_URL } from './config'
import { getToken, getCurrentStoreId, clearAuth } from './storage'

function buildQuery(params) {
  if (!params) return ''
  const parts = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

export function request(options) {
  const token = getToken()
  const header = {
    'Content-Type': 'application/json',
    ...(options.header || {})
  }

  if (token) header.Authorization = `Bearer ${token}`

  const storeId = getCurrentStoreId()
  if (storeId) header['X-Store-Id'] = storeId

  const url = `${BASE_URL}${options.url}${options.params ? buildQuery(options.params) : ''}`

  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: options.method || 'GET',
      data: options.data,
      header,
      timeout: options.timeout || 15000,
      success(res) {
        const body = res.data
        if (res.statusCode === 401) {
          clearAuth()
          uni.reLaunch({ url: '/pages/login/login' })
          reject(new Error('未授权，请重新登录'))
          return
        }
        if (body && body.code === 200) {
          resolve(body.data)
          return
        }
        const msg = (body && body.message) || `请求失败(${res.statusCode})`
        reject(new Error(msg))
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络错误'))
      }
    })
  })
}
