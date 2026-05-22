const storage = require('./utils/storage')

App({
  onLaunch() {
    if (!storage.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' })
    }
  },

  globalData: {
    userInfo: null
  }
})
