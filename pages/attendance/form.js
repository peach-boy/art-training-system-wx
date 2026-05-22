const {
  studentAPI,
  attendanceAPI,
  coursePackageAPI,
  courseTypeAPI,
  coursewareAPI
} = require('../../api/index')
const { LESSON_TYPES, dayOfWeekFromDate } = require('../../utils/lessonType')
const { formatStudentLabel } = require('../../utils/format')
const { imageFullUrl } = require('../../utils/media')
const { uploadLessonImage } = require('../../utils/upload')
const storage = require('../../utils/storage')

function todayStr() {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

Page({
  data: {
    mode: 'create',
    recordId: '',
    studentScope: 'mine',
    studentKeyword: '',
    studentOptions: [],
    studentId: null,
    studentLabel: '',
    lessonTypeLabels: LESSON_TYPES.map((t) => t.label),
    lessonTypeIndex: 0,
    lessonType: 'regular',
    packageOptions: [],
    packageId: null,
    packageLabel: '',
    courseTypeOptions: [],
    courseTypeId: null,
    courseTypeLabel: '',
    coursewareOptions: [{ value: '', label: '不选课件' }],
    coursewareId: null,
    coursewareLabel: '',
    customCoursewareName: '',
    teacherOptions: [{ value: '', label: '未指定' }],
    teacherId: null,
    teacherLabel: '',
    classDate: todayStr(),
    classesDeducted: 1,
    deductOptions: ['0.5', '1', '1.5', '2', '2.5', '3'],
    income: '',
    notes: '',
    submitting: false,
    selfTeacherName: '',
    imageUrl: '',
    imagePreview: '',
    uploadingImage: false
  },

  onLoad(options) {
    if (!storage.isLoggedIn()) {
      wx.reLaunch({ url: '/pages/login/login' })
      return
    }
    wx.setNavigationBarTitle({
      title: options.mode === 'edit' ? '修正课时' : '录入课时'
    })
    this.setData({
      mode: options.mode || 'create',
      recordId: options.id || ''
    })
    this.initOptions()
  },

  async initOptions() {
    const user = storage.getUserInfo() || {}
    const selfTeacherId = user.teacherId || null
    const selfTeacherName = user.realName || user.username || ''
    try {
      const courseTypes = await courseTypeAPI.getList()
      this.setData({
        courseTypeOptions: (courseTypes || [])
          .filter((c) => c.status === 'active')
          .map((c) => ({ value: c.typeId, label: c.typeName })),
        teacherId: selfTeacherId,
        teacherLabel: selfTeacherName,
        selfTeacherName
      })
      if (this.data.mode === 'edit' && this.data.recordId) {
        await this.loadRecord(this.data.recordId)
      }
    } catch (e) {
      wx.showToast({ title: e.message || '初始化失败', icon: 'none' })
    }
  },

  resolveStoreId() {
    return undefined
  },

  async loadRecord(id) {
    const record = await attendanceAPI.getById(id)
    const lessonTypeIndex = Math.max(0, LESSON_TYPES.findIndex((t) => t.value === record.lessonType))
    this.setData({
      studentId: record.studentId,
      studentLabel: record.studentName || '',
      lessonTypeIndex,
      lessonType: record.lessonType || 'regular',
      packageId: record.packageId,
      packageLabel: record.packageName || '',
      courseTypeId: record.courseTypeId,
      courseTypeLabel: record.courseTypeName || '',
      coursewareId: record.coursewareId,
      coursewareLabel: record.coursewareName || '',
      teacherId: record.teacherId,
      teacherLabel: record.teacherName || '',
      classDate: record.classDate,
      classesDeducted: record.classesDeducted,
      income: record.income != null ? String(record.income) : '',
      notes: record.notes || '',
      imageUrl: record.imageUrl || '',
      imagePreview: imageFullUrl(record.imageUrl)
    })
    if (record.studentId) {
      await this.loadPackages(record.studentId)
    }
    if (record.courseTypeId) {
      await this.loadCourseware(record.courseTypeId)
    }
  },

  onStudentKeywordInput(e) {
    this.setData({ studentKeyword: e.detail.value })
    if (this._searchTimer) clearTimeout(this._searchTimer)
    this._searchTimer = setTimeout(() => this.searchStudents(), 300)
  },

  onStudentScopeChange(e) {
    const scope = e.currentTarget.dataset.scope
    if (scope === this.data.studentScope) return
    this.setData({
      studentScope: scope,
      studentOptions: [],
      studentId: null,
      studentLabel: ''
    })
    if ((this.data.studentKeyword || '').trim()) {
      this.searchStudents()
    }
  },

  async searchStudents() {
    const keyword = (this.data.studentKeyword || '').trim()
    try {
      const list = await studentAPI.search(keyword, this.data.studentScope)
      const studentOptions = (list || []).map((s) => ({
        value: s.studentId,
        label: formatStudentLabel(s)
      }))
      this.setData({ studentOptions })
      if (!studentOptions.length) {
        wx.showToast({ title: '未找到学员', icon: 'none' })
      }
    } catch (e) {
      wx.showToast({ title: e.message || '搜索失败', icon: 'none' })
    }
  },

  async onStudentPick(e) {
    const idx = Number(e.detail.value)
    const picked = this.data.studentOptions[idx]
    if (!picked) return
    this.setData({
      studentId: picked.value,
      studentLabel: picked.label,
      packageId: null,
      packageLabel: '',
      packageOptions: []
    })
    await this.loadPackages(picked.value)
    try {
      const last = await attendanceAPI.getLatestRecordByStudent(picked.value)
      if (last) {
        const updates = {}
        if (last.courseTypeId) {
          updates.courseTypeId = last.courseTypeId
          updates.courseTypeLabel = last.courseTypeName || ''
        }
        if (last.teacherId) {
          updates.teacherId = last.teacherId
          updates.teacherLabel = last.teacherName || ''
        }
        const user = storage.getUserInfo() || {}
        if (user.teacherId) {
          updates.teacherId = user.teacherId
          updates.teacherLabel = user.realName || user.username || ''
        }
        this.setData(updates)
        if (last.courseTypeId) await this.loadCourseware(last.courseTypeId)
      }
    } catch (err) {
      // ignore
    }
  },

  async loadPackages(studentId) {
    const pkgs = await coursePackageAPI.getByStudent(studentId)
    const packageOptions = (pkgs || []).map((p) => {
      const dateStr = p.purchaseDate ? `（${p.purchaseDate}）` : ''
      return { value: p.packageId, label: `${p.packageName}${dateStr}` }
    })
    this.setData({ packageOptions })
  },

  onLessonTypeChange(e) {
    const idx = Number(e.detail.value)
    this.setData({
      lessonTypeIndex: idx,
      lessonType: LESSON_TYPES[idx].value
    })
  },

  onPackagePick(e) {
    const idx = Number(e.detail.value)
    const picked = this.data.packageOptions[idx]
    if (!picked) return
    this.setData({ packageId: picked.value, packageLabel: picked.label })
  },

  onCourseTypePick(e) {
    const idx = Number(e.detail.value)
    const picked = this.data.courseTypeOptions[idx]
    if (!picked) return
    this.setData({
      courseTypeId: picked.value,
      courseTypeLabel: picked.label,
      coursewareId: null,
      coursewareLabel: '',
      coursewareOptions: [{ value: '', label: '不选课件' }]
    })
    this.loadCourseware(picked.value)
  },

  async loadCourseware(courseTypeId) {
    const list = await coursewareAPI.listByCourseType(courseTypeId, '')
    this.setData({
      coursewareOptions: [{ value: '', label: '不选课件' }].concat(
        (list || []).map((c) => ({ value: c.coursewareId, label: c.name || c.coursewareName }))
      )
    })
  },

  onCoursewarePick(e) {
    const idx = Number(e.detail.value)
    const picked = this.data.coursewareOptions[idx]
    this.setData({
      coursewareId: picked && picked.value ? picked.value : null,
      coursewareLabel: picked ? picked.label : '',
      customCoursewareName: ''
    })
  },

  onCustomCoursewareInput(e) {
    this.setData({
      customCoursewareName: e.detail.value,
      coursewareId: null,
      coursewareLabel: ''
    })
  },

  onTeacherPick(e) {
    const idx = Number(e.detail.value)
    const picked = this.data.teacherOptions[idx]
    this.setData({
      teacherId: picked && picked.value ? picked.value : null,
      teacherLabel: picked ? picked.label : ''
    })
  },

  onClassDateChange(e) {
    this.setData({ classDate: e.detail.value })
  },

  onDeductChange(e) {
    this.setData({ classesDeducted: Number(this.data.deductOptions[e.detail.value]) })
  },

  onIncomeInput(e) {
    this.setData({ income: e.detail.value })
  },

  onNotesInput(e) {
    this.setData({ notes: e.detail.value })
  },

  chooseImage() {
    if (this.data.uploadingImage) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const file = res.tempFiles && res.tempFiles[0]
        if (!file || !file.tempFilePath) return
        this.compressAndUpload(file.tempFilePath)
      }
    })
  },

  compressAndUpload(filePath) {
    wx.compressImage({
      src: filePath,
      quality: 80,
      compressedWidth: 1920,
      success: (res) => {
        this.uploadImage(res.tempFilePath || filePath)
      },
      fail: () => {
        this.uploadImage(filePath)
      }
    })
  },

  async uploadImage(filePath) {
    this.setData({
      uploadingImage: true,
      imagePreview: filePath
    })
    try {
      const url = await uploadLessonImage(filePath)
      this.setData({
        imageUrl: url,
        imagePreview: imageFullUrl(url)
      })
      wx.showToast({ title: '上传成功', icon: 'success' })
    } catch (e) {
      this.setData({ imageUrl: '', imagePreview: '' })
      wx.showToast({ title: e.message || '上传失败', icon: 'none' })
    } finally {
      this.setData({ uploadingImage: false })
    }
  },

  removeImage() {
    this.setData({ imageUrl: '', imagePreview: '' })
  },

  previewImage() {
    if (!this.data.imagePreview) return
    wx.previewImage({ urls: [this.data.imagePreview] })
  },

  noop() {},

  buildSubmitData() {
    const d = this.data
    const isCustom = !!d.customCoursewareName.trim()
    return {
      studentId: d.studentId,
      lessonType: d.lessonType,
      packageId: (d.lessonType === 'regular' || d.lessonType === 'renewal_pending') ? (d.packageId || null) : null,
      courseTypeId: d.courseTypeId || null,
      coursewareId: isCustom ? null : (d.coursewareId || null),
      coursewareName: isCustom ? d.customCoursewareName.trim() : undefined,
      teacherId: d.teacherId || (storage.getUserInfo() || {}).teacherId || null,
      classDate: d.classDate,
      dayOfWeek: dayOfWeekFromDate(d.classDate),
      classesDeducted: d.lessonType === 'temp' ? 0 : d.classesDeducted,
      income: d.lessonType === 'temp' ? Number(d.income) : undefined,
      notes: d.notes || '',
      imageUrl: d.imageUrl || null
    }
  },

  validate() {
    const d = this.data
    if (d.uploadingImage) {
      wx.showToast({ title: '图片上传中，请稍候', icon: 'none' })
      return false
    }
    if (!d.studentId || !d.classDate) {
      wx.showToast({ title: '请填写学员和日期', icon: 'none' })
      return false
    }
    if (d.lessonType === 'regular' && !d.packageId) {
      wx.showToast({ title: '正式课需选择课包', icon: 'none' })
      return false
    }
    if (d.lessonType === 'temp' && !d.income) {
      wx.showToast({ title: '临时课需填写收入', icon: 'none' })
      return false
    }
    return true
  },

  async handleSubmit() {
    if (this.data.submitting || !this.validate()) return
    const payload = this.buildSubmitData()
    this.setData({ submitting: true })
    try {
      if (this.data.mode === 'edit') {
        await attendanceAPI.update(this.data.recordId, payload)
        wx.showToast({ title: '保存成功', icon: 'success' })
      } else {
        const dup = await attendanceAPI.checkDuplicate({
          studentId: payload.studentId,
          packageId: payload.packageId,
          classDate: payload.classDate,
          coursewareId: payload.coursewareId,
          coursewareName: payload.coursewareName
        })
        if (dup && dup.count > 0) {
          const ok = await new Promise((resolve) => {
            wx.showModal({
              title: '可能重复',
              content: `该学员在 ${payload.classDate} 已有类似记录（${dup.count} 条），仍要录入吗？`,
              success: (res) => resolve(!!res.confirm)
            })
          })
          if (!ok) {
            this.setData({ submitting: false })
            return
          }
        }
        await attendanceAPI.create(payload)
        wx.showToast({ title: '录入成功', icon: 'success' })
      }
      setTimeout(() => wx.navigateBack(), 500)
    } catch (e) {
      wx.showToast({ title: e.message || '提交失败', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  }
})
