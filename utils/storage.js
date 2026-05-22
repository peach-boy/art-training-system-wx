const TOKEN_KEY = 'token'
const USER_INFO_KEY = 'userInfo'

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || ''
}

function setToken(token) {
  wx.setStorageSync(TOKEN_KEY, token || '')
}

function getUserInfo() {
  try {
    return wx.getStorageSync(USER_INFO_KEY) || null
  } catch (e) {
    return null
  }
}

function setUserInfo(info) {
  wx.setStorageSync(USER_INFO_KEY, info || null)
}

function clearAuth() {
  wx.removeStorageSync(TOKEN_KEY)
  wx.removeStorageSync(USER_INFO_KEY)
}

function isLoggedIn() {
  return !!getToken()
}

module.exports = {
  getToken,
  setToken,
  getUserInfo,
  setUserInfo,
  clearAuth,
  isLoggedIn
}
