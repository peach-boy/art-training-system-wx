import { defineStore } from 'pinia'
import { authAPI } from '@/api'
import { ADMIN_ROLES } from '@/utils/config'
import {
  getToken,
  setToken,
  getUserInfo,
  setUserInfo,
  getCurrentStoreId,
  setCurrentStoreId,
  clearAuth,
  isLoggedIn as storageIsLoggedIn,
  takePendingPcTicket,
  isObserving,
  saveObserverBackup,
  getObserverReturnUrl,
  restoreObserverBackup
} from '@/utils/storage'
import { notifyStoreChanged } from '@/utils/storeEvents'
import { ALL_STORES_ID } from '@/utils/storeScope'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    userInfo: getUserInfo(),
    /** 与 storage 同步，供页面 watch 店铺变更 */
    currentStoreId: getCurrentStoreId(),
    storeRevision: 0,
    /** 管理员正在以家长视角观察 */
    observing: isObserving()
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    role: (state) => state.userInfo?.role || '',
    isTeacher: (state) => state.userInfo?.role === 'teacher',
    isAdmin: (state) => ADMIN_ROLES.includes(state.userInfo?.role),
    isFinanceStaff: (state) => {
      const r = state.userInfo?.role
      return r === 'super_admin' || r === 'finance_admin' || r === 'admin'
    },
    /** 可查看金额（课包实付、课时收入等）；教师角色不可见 */
    canViewAmount: (state) => ADMIN_ROLES.includes(state.userInfo?.role),
    isPrivilegedAdmin: (state) => state.userInfo?.role === 'super_admin',
    displayName: (state) =>
      state.userInfo?.realName || state.userInfo?.username || '用户',
    allowedStoreIds: (state) => state.userInfo?.allowedStoreIds || []
  },

  actions: {
    applyLogin(data) {
      this.token = data.token
      setToken(data.token)
      const info = {
        userId: data.userId,
        teacherId: data.teacherId,
        username: data.username,
        realName: data.realName,
        role: data.role,
        storeId: data.storeId,
        allowedStoreIds: data.allowedStoreIds || []
      }
      this.userInfo = info
      setUserInfo(info)

      const prev = getCurrentStoreId()
      const allowed = info.allowedStoreIds || []

      if (data.role === 'super_admin') {
        if (prev === ALL_STORES_ID || !prev) {
          setCurrentStoreId(ALL_STORES_ID)
          this.currentStoreId = ALL_STORES_ID
        } else {
          this.currentStoreId = String(prev)
        }
      } else if (allowed.length > 1) {
        if (prev === ALL_STORES_ID) {
          this.currentStoreId = ALL_STORES_ID
        } else if (prev && allowed.some((id) => String(id) === String(prev))) {
          this.currentStoreId = String(prev)
        } else if (data.storeId != null) {
          setCurrentStoreId(data.storeId)
          this.currentStoreId = String(data.storeId)
        } else {
          setCurrentStoreId(allowed[0])
          this.currentStoreId = String(allowed[0])
        }
      } else if (data.storeId != null) {
        setCurrentStoreId(data.storeId)
        this.currentStoreId = String(data.storeId)
      } else if (allowed.length) {
        setCurrentStoreId(allowed[0])
        this.currentStoreId = String(allowed[0])
      }
    },

    async fetchCurrentUser() {
      const data = await authAPI.getCurrentUser()
      if (data?.token) {
        this.applyLogin(data)
      } else if (this.token) {
        this.applyLogin({ ...data, token: this.token })
      }
      return this.userInfo
    },

    clearAuth() {
      this.token = ''
      this.userInfo = null
      this.observing = false
      clearAuth()
    },

    /** 管理员进入家长视角：备份自己的登录态，再切换为家长登录态 */
    enterObserver(parentLogin, returnUrl) {
      saveObserverBackup(returnUrl)
      this.applyLogin(parentLogin)
      this.observing = true
    },

    /** 退出观察：结束家长观察会话，恢复管理员登录态 */
    async exitObserver() {
      const returnUrl = getObserverReturnUrl()
      try {
        await authAPI.logout()
      } catch (e) {
        // 观察会话本身会过期，失败不影响返回
      }
      const restored = restoreObserverBackup()
      this.observing = false
      if (!restored) {
        this.clearAuth()
        return ''
      }
      this.token = getToken()
      this.userInfo = getUserInfo()
      this.currentStoreId = getCurrentStoreId()
      this.storeRevision += 1
      return returnUrl || '/pages/students/list'
    },

    async logout() {
      this.clearAuth()
      try {
        await authAPI.logout()
      } catch (e) {
        // 本地已退出，服务端失败不影响
      }
    },

    switchStore(storeId) {
      const id = storeId != null ? String(storeId) : ''
      setCurrentStoreId(storeId)
      if (this.currentStoreId !== id) {
        this.currentStoreId = id
        this.storeRevision += 1
        notifyStoreChanged(storeId)
      }
    }
  }
})

export function requireLogin() {
  if (!storageIsLoggedIn()) {
    uni.reLaunch({ url: '/pages/login/login' })
    return false
  }
  return true
}

export function navigateAfterLogin(role) {
  const ticket = takePendingPcTicket()
  if (ticket) {
    uni.reLaunch({ url: '/pages/pc-confirm/index?scene=' + encodeURIComponent(ticket) })
    return
  }
  if (role === 'parent') {
    uni.reLaunch({ url: '/pages/parent/home' })
    return
  }
  uni.reLaunch({ url: '/pages/home/index' })
}
