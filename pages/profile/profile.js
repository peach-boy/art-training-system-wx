const { authAPI, storeAPI } = require('../../api/index')
const storage = require('../../utils/storage')
const { ICP_NUMBER } = require('../../utils/config')

const ROLE_MAP = {
  super_admin: '超级管理员',
  admin: '管理员',
  finance_admin: '财务管理员',
  teacher: '教师'
}

Page({
  data: {
    displayName: '',
    username: '',
    roleLabel: '',
    storeOptions: [],
    storeIndex: 0,
    currentStoreLabel: '-',
    icpNumber: ICP_NUMBER
  },

  onShow() {
    if (!storage.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }
    this.loadProfile()
  },

  async loadProfile() {
    const user = storage.getUserInfo() || {}
    const currentId = storage.getCurrentStoreId()
    let storeOptions = []

    try {
      const stores = await storeAPI.getList()
      const allowed = Array.isArray(user.allowedStoreIds) ? user.allowedStoreIds.map(String) : []
      if (user.role === 'teacher' || user.teacherId) {
        const allowed = Array.isArray(user.allowedStoreIds) ? user.allowedStoreIds.map(String) : []
        storeOptions = (stores || [])
          .filter((s) => allowed.includes(String(s.storeId)))
          .map((s) => ({ value: String(s.storeId), label: s.storeName }))
      } else if (user.role === 'super_admin') {
        storeOptions = [{ value: 'all', label: '全部店铺（仅查看）' }].concat(
          (stores || []).filter((s) => s.status === 'active').map((s) => ({
            value: String(s.storeId),
            label: s.storeName
          }))
        )
      } else if (allowed.length) {
        storeOptions = (stores || [])
          .filter((s) => allowed.includes(String(s.storeId)))
          .map((s) => ({ value: String(s.storeId), label: s.storeName }))
      } else if (user.storeId != null) {
        const found = (stores || []).find((s) => String(s.storeId) === String(user.storeId))
        storeOptions = [{ value: String(user.storeId), label: found ? found.storeName : `店铺 #${user.storeId}` }]
      }
    } catch (e) {
      // ignore
    }

    let storeIndex = storeOptions.findIndex((s) => s.value === currentId)
    if (storeIndex < 0) storeIndex = 0
    const currentStoreLabel = storeOptions[storeIndex] ? storeOptions[storeIndex].label : currentId || '-'

    this.setData({
      displayName: user.realName || user.username || '老师',
      username: user.username || '-',
      roleLabel: '教师',
      avatarText: (user.realName || user.username || '师').slice(0, 1),
      storeOptions,
      storeIndex,
      currentStoreLabel
    })
  },

  onStoreChange(e) {
    const idx = Number(e.detail.value)
    const picked = this.data.storeOptions[idx]
    if (!picked) return
    storage.setCurrentStoreId(picked.value)
    this.setData({
      storeIndex: idx,
      currentStoreLabel: picked.label
    })
    wx.showToast({ title: '门店已切换', icon: 'success' })
  },

  async handleLogout() {
    try {
      await authAPI.logout()
    } catch (e) {
      // ignore
    }
    storage.clearAuth()
    wx.reLaunch({ url: '/pages/login/login' })
  },

  copyBeian() {
    wx.setClipboardData({ data: ICP_NUMBER })
  }
})
