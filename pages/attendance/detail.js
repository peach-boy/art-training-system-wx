const { attendanceAPI } = require('../../api/index')
const { labelOf } = require('../../utils/lessonType')
const { formatDateTime } = require('../../utils/format')
const { imageFullUrl } = require('../../utils/media')
const storage = require('../../utils/storage')

Page({
  data: {
    id: '',
    record: null,
    lessonTypeLabel: '',
    recordedAtText: '-',
    imagePreview: ''
  },

  onLoad(options) {
    if (!storage.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }
    this.setData({ id: options.id || '' })
    this.loadDetail()
  },

  async loadDetail() {
    try {
      const record = await attendanceAPI.getById(this.data.id)
      this.setData({
        record,
        lessonTypeLabel: labelOf(record.lessonType),
        recordedAtText: formatDateTime(record.recordedAt),
        imagePreview: imageFullUrl(record.imageUrl)
      })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    }
  },

  goEdit() {
    wx.navigateTo({ url: `/pages/attendance/form?mode=edit&id=${this.data.id}` })
  },

  previewImage() {
    if (!this.data.imagePreview) return
    wx.previewImage({ urls: [this.data.imagePreview] })
  }
})
