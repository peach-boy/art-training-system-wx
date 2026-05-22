const { attendanceAPI } = require('../../api/index')
const { labelOf } = require('../../utils/lessonType')
const { imageFullUrl } = require('../../utils/media')
const storage = require('../../utils/storage')

Page({
  data: {
    list: [],
    current: 1,
    size: 10,
    total: 0,
    startDate: '',
    endDate: '',
    loading: false,
    loadingMore: false,
    hasMore: false
  },

  onShow() {
    if (!storage.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }
    this.reload()
  },

  onPullDownRefresh() {
    this.reload().finally(() => wx.stopPullDownRefresh())
  },

  mapRecord(item) {
    return Object.assign({}, item, {
      lessonTypeLabel: labelOf(item.lessonType),
      imagePreview: imageFullUrl(item.imageUrl)
    })
  },

  async fetchPage(reset) {
    const page = reset ? 1 : this.data.current
    const data = await attendanceAPI.getPage({
      current: page,
      size: this.data.size,
      startDate: this.data.startDate || undefined,
      endDate: this.data.endDate || undefined,
      sortBy: 'classDate'
    })
    const records = (data.records || []).map(this.mapRecord)
    const total = data.total || 0
    const merged = reset ? records : this.data.list.concat(records)
    return {
      list: merged,
      current: page,
      total,
      hasMore: merged.length < total
    }
  },

  async reload() {
    this.setData({ loading: true, current: 1 })
    try {
      const res = await this.fetchPage(true)
      this.setData(Object.assign(res, { current: 2 }))
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadMore() {
    if (!this.data.hasMore || this.data.loadingMore) return
    this.setData({ loadingMore: true })
    try {
      const res = await this.fetchPage(false)
      this.setData({
        list: res.list,
        hasMore: res.hasMore,
        current: this.data.current + 1
      })
    } catch (e) {
      wx.showToast({ title: e.message || '加载失败', icon: 'none' })
    } finally {
      this.setData({ loadingMore: false })
    }
  },

  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value })
  },

  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value })
  },

  onSearch() {
    this.reload()
  },

  onReset() {
    this.setData({ startDate: '', endDate: '' })
    this.reload()
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/attendance/detail?id=${id}` })
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/attendance/form?mode=create' })
  }
})
