const TOKEN_KEY = 'token'
const USER_INFO_KEY = 'userInfo'
const STORE_ID_KEY = 'currentStoreId'

export function getToken() {
  return uni.getStorageSync(TOKEN_KEY) || ''
}

export function setToken(token) {
  uni.setStorageSync(TOKEN_KEY, token || '')
}

export function getUserInfo() {
  try {
    return uni.getStorageSync(USER_INFO_KEY) || null
  } catch (e) {
    return null
  }
}

export function setUserInfo(info) {
  uni.setStorageSync(USER_INFO_KEY, info || null)
}

export function getCurrentStoreId() {
  return uni.getStorageSync(STORE_ID_KEY) || ''
}

export function setCurrentStoreId(storeId) {
  uni.setStorageSync(STORE_ID_KEY, storeId != null ? String(storeId) : '')
}

export function clearAuth() {
  uni.removeStorageSync(TOKEN_KEY)
  uni.removeStorageSync(USER_INFO_KEY)
  uni.removeStorageSync(STORE_ID_KEY)
}

export function isLoggedIn() {
  return !!getToken()
}
