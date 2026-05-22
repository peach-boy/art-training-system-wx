const { BASE_URL } = require('./config')
const storage = require('./storage')

function buildQuery(params) {
  if (!params) return ''
  const parts = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

function request(options) {
  const token = storage.getToken()
  const header = Object.assign({
    'Content-Type': 'application/json'
  }, options.header || {})

  if (token) header.Authorization = `Bearer ${token}`

  const url = `${BASE_URL}${options.url}${options.params ? buildQuery(options.params) : ''}`

  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: options.method || 'GET',
      data: options.data,
      header,
      timeout: options.timeout || 15000,
      success(res) {
        const body = res.data
        if (res.statusCode === 401) {
          storage.clearAuth()
          wx.reLaunch({ url: '/pages/login/login' })
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

module.exports = { request }
