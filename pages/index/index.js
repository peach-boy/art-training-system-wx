Page({
  data: {
    displayName: '',
    avatarText: '师',
    monthLabel: '',
    monthClassHours: '-',
    recordTotal: '-'
  },

  onShow() {
    const storage = require('../../utils/storage')
    if (!storage.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }
    this.loadHeader()
    this.loadStats()
  },

  loadHeader() {
    const storage = require('../../utils/storage')
    const user = storage.getUserInfo() || {}
    const name = user.realName || user.username || '老师'
    this.setData({
      displayName: name,
      avatarText: name.slice(0, 1)
    })
  },

  async loadStats() {
    const { attendanceAPI } = require('../../api/index')
    try {
      const [summary, pageData] = await Promise.all([
        attendanceAPI.getMonthlySummary(),
        attendanceAPI.getPage({ current: 1, size: 1 })
      ])
      const hours = summary && summary.classHoursTotal != null
        ? String(summary.classHoursTotal)
        : '0'
      this.setData({
        monthLabel: (summary && summary.month) || '',
        monthClassHours: hours,
        recordTotal: pageData.total != null ? String(pageData.total) : '0'
      })
    } catch (e) {
      this.setData({ monthClassHours: '-', recordTotal: '-' })
    }
  },

  goAttendanceList() {
    wx.reLaunch({ url: '/pages/attendance/list' })
  },

  goAddRecord() {
    wx.navigateTo({ url: '/pages/attendance/form?mode=create' })
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      success: async (res) => {
        if (!res.confirm) return
        const storage = require('../../utils/storage')
        const { authAPI } = require('../../api/index')
        try {
          await authAPI.logout()
        } catch (e) {
          // ignore
        }
        storage.clearAuth()
        wx.reLaunch({ url: '/pages/login/login' })
      }
    })
  }
})
