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
  takePendingPcTicket
} from '@/utils/storage'
import { notifyStoreChanged } from '@/utils/storeEvents'
import { ALL_STORES_ID } from '@/utils/storeScope'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    userInfo: getUserInfo(),
    /** 与 storage 同步，供页面 watch 店铺变更 */
    currentStoreId: getCurrentStoreId(),
    storeRevision: 0
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
      clearAuth()
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
