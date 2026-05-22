Component({
  properties: {
    active: {
      type: String,
      value: 'home'
    }
  },

  methods: {
    onSwitch(e) {
      const path = e.currentTarget.dataset.path
      const key = e.currentTarget.dataset.key
      if (!path || key === this.data.active) return
      wx.reLaunch({ url: path })
    },

    onAdd() {
      wx.navigateTo({ url: '/pages/attendance/form?mode=create' })
    }
  }
})
