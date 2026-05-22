const { authAPI } = require('../../api/index')
const storage = require('../../utils/storage')
const { ICP_NUMBER } = require('../../utils/config')

Page({
  data: {
    phone: '',
    password: '',
    loading: false,
    icpNumber: ICP_NUMBER
  },

  onLoad() {
    if (storage.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/index/index' })
    }
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  async handleLogin() {
    const { phone, password, loading } = this.data
    if (loading) return
    const phoneTrim = (phone || '').trim()
    if (!phoneTrim || !password) {
      wx.showToast({ title: '请填写手机号和密码', icon: 'none' })
      return
    }

    this.setData({ loading: true })
    try {
      const data = await authAPI.teacherLogin({
        phone: phoneTrim,
        password
      })

      storage.setToken(data.token)
      storage.setUserInfo({
        teacherId: data.teacherId,
        username: data.username,
        realName: data.realName,
        role: data.role
      })

      wx.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => wx.reLaunch({ url: '/pages/index/index' }), 400)
    } catch (e) {
      wx.showToast({ title: e.message || '登录失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  openBeian() {
    wx.setClipboardData({ data: ICP_NUMBER })
  }
})
