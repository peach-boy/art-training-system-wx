import { defineStore } from 'pinia'
import { authAPI } from '@/api'
import { ADMIN_ROLES } from '@/utils/config'
import {
  getToken,
  setToken,
  getUserInfo,
  setUserInfo,
  setCurrentStoreId,
  clearAuth,
  isLoggedIn as storageIsLoggedIn
} from '@/utils/storage'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: getToken(),
    userInfo: getUserInfo()
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
      if (data.storeId != null) {
        setCurrentStoreId(data.storeId)
      } else if (info.allowedStoreIds?.length) {
        setCurrentStoreId(info.allowedStoreIds[0])
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
      try {
        await authAPI.logout()
      } catch (e) {
        // ignore
      }
      this.clearAuth()
    },

    switchStore(storeId) {
      setCurrentStoreId(storeId)
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

export function navigateAfterLogin() {
  uni.reLaunch({ url: '/pages/home/index' })
}
