const TOKEN_KEY = 'token'
const USER_INFO_KEY = 'userInfo'
const STORE_ID_KEY = 'currentStoreId'
const SKIP_SILENT_LOGIN_KEY = 'skipSilentWechatLogin'

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
  uni.removeStorageSync(OBSERVER_BACKUP_KEY)
}

/** 管理员「观察员」：进入家长视角前，先备份管理员自己的登录态 */
const OBSERVER_BACKUP_KEY = 'observerBackup'

export function isObserving() {
  return !!uni.getStorageSync(OBSERVER_BACKUP_KEY)
}

export function saveObserverBackup(returnUrl) {
  uni.setStorageSync(OBSERVER_BACKUP_KEY, {
    token: getToken(),
    userInfo: getUserInfo(),
    storeId: getCurrentStoreId(),
    returnUrl: returnUrl || ''
  })
}

/** 退出观察后回到哪个页面（进入观察时所在的学员详情） */
export function getObserverReturnUrl() {
  const backup = uni.getStorageSync(OBSERVER_BACKUP_KEY)
  return (backup && backup.returnUrl) || ''
}

/** 恢复管理员登录态；没有备份返回 false */
export function restoreObserverBackup() {
  const backup = uni.getStorageSync(OBSERVER_BACKUP_KEY)
  uni.removeStorageSync(OBSERVER_BACKUP_KEY)
  if (!backup || !backup.token) return false
  setToken(backup.token)
  setUserInfo(backup.userInfo)
  setCurrentStoreId(backup.storeId)
  return true
}

/** 用户主动退出后，不要用已绑定的微信 openid 立刻静默登录回去 */
export function setSkipSilentWechatLogin(skip) {
  if (skip) uni.setStorageSync(SKIP_SILENT_LOGIN_KEY, '1')
  else uni.removeStorageSync(SKIP_SILENT_LOGIN_KEY)
}

export function shouldSkipSilentWechatLogin() {
  return uni.getStorageSync(SKIP_SILENT_LOGIN_KEY) === '1'
}

const PENDING_PC_TICKET_KEY = 'pendingPcLoginTicket'

export function setPendingPcTicket(ticket) {
  if (ticket) uni.setStorageSync(PENDING_PC_TICKET_KEY, ticket)
  else uni.removeStorageSync(PENDING_PC_TICKET_KEY)
}

export function takePendingPcTicket() {
  const ticket = uni.getStorageSync(PENDING_PC_TICKET_KEY) || ''
  if (ticket) uni.removeStorageSync(PENDING_PC_TICKET_KEY)
  return ticket
}

export function isLoggedIn() {
  return !!getToken()
}
