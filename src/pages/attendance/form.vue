<template>
  <view class="page-form">
    <view class="form-section">
      <view class="section-head">学员信息</view>
      <view class="form-card">
        <view class="field-block">
          <view class="field-label">学员 *</view>
          <view v-if="userStore.isAdmin" class="scope-row">
            <view
              class="scope-chip"
              :class="{ active: studentScope === 'mine' }"
              @tap="onStudentScopeChange('mine')"
            >我的学员</view>
            <view
              class="scope-chip"
              :class="{ active: studentScope === 'all' }"
              @tap="onStudentScopeChange('all')"
            >全部学员</view>
          </view>
          <view class="search-row">
            <input
              v-model="studentKeyword"
              class="input search-input"
              placeholder="姓名模糊 / 首字母搜索"
              confirm-type="search"
              @input="onStudentKeywordInput"
              @confirm="searchStudents"
            />
            <button class="btn-ghost search-btn" size="mini" @tap="searchStudents">搜索</button>
          </view>
          <picker
            v-if="studentOptions.length"
            :range="studentOptions"
            range-key="label"
            @change="onStudentPick"
          >
            <view class="cell-value">{{ studentLabel || '请选择学员' }}</view>
          </picker>
          <view v-else class="text-muted tips">输入关键字后搜索学员</view>
        </view>
      </view>
    </view>

    <view class="form-section">
      <view class="section-head">课程信息</view>
      <view class="form-card">
        <view class="cell">
          <text class="cell-label">课时类型 *</text>
          <picker :range="lessonTypeLabels" :value="lessonTypeIndex" @change="onLessonTypeChange">
            <view class="cell-value arrow">{{ lessonTypeLabels[lessonTypeIndex] }}</view>
          </picker>
        </view>

        <view v-if="lessonType === 'regular' || lessonType === 'renewal_pending'" class="cell">
          <text class="cell-label">课包 {{ lessonType === 'regular' ? '*' : '' }}</text>
          <picker :range="packageOptions" range-key="label" @change="onPackagePick">
            <view class="cell-value arrow" :class="{ placeholder: !packageLabel }">
              {{ packageLabel || '请选择课包' }}
            </view>
          </picker>
        </view>

        <view v-if="lessonType === 'temp'" class="field-block inner">
          <view class="field-label">课时收入（元） *</view>
          <input v-model="income" class="input" type="digit" placeholder="请输入金额" />
        </view>

        <view class="cell">
          <text class="cell-label">课程类型</text>
          <picker :range="courseTypeOptions" range-key="label" @change="onCourseTypePick">
            <view class="cell-value arrow" :class="{ placeholder: !courseTypeLabel }">
              {{ courseTypeLabel || '请选择' }}
            </view>
          </picker>
        </view>

        <view class="field-block inner">
          <view class="field-label">课件</view>
          <picker :range="coursewareOptions" range-key="label" @change="onCoursewarePick">
            <view class="cell-value" :class="{ placeholder: !coursewareLabel }">
              {{ coursewareLabel || '可选' }}
            </view>
          </picker>
          <input
            v-model="customCoursewareName"
            class="input custom-name"
            placeholder="或输入自定义课件名"
            @input="onCustomCoursewareInput"
          />
        </view>
      </view>
    </view>

    <view class="form-section">
      <view class="section-head">上课信息</view>
      <view class="form-card">
        <view class="cell">
          <text class="cell-label">授课老师 *</text>
          <picker
            v-if="userStore.isAdmin"
            :range="teacherOptions"
            range-key="label"
            @change="onTeacherPick"
          >
            <view class="cell-value arrow" :class="{ placeholder: !teacherLabel }">
              {{ teacherLabel || '请选择授课老师' }}
            </view>
          </picker>
          <view v-else class="cell-value">{{ selfTeacherName || '当前登录教师' }}</view>
        </view>
        <view class="cell">
          <text class="cell-label">上课日期 *</text>
          <picker mode="date" :value="classDate" @change="onClassDateChange">
            <view class="cell-value arrow">{{ classDate || '请选择日期' }}</view>
          </picker>
        </view>
        <view v-if="lessonType !== 'temp'" class="cell">
          <text class="cell-label">扣除课时</text>
          <picker :range="deductOptions" @change="onDeductChange">
            <view class="cell-value arrow">{{ classesDeducted }}</view>
          </picker>
        </view>
      </view>
    </view>

    <view class="form-section">
      <view class="section-head">课堂照片</view>
      <view class="form-card">
        <view class="upload-area">
          <view v-if="imagePreview" class="upload-preview-wrap">
            <image class="upload-preview" :src="imagePreview" mode="aspectFill" @tap="previewImage" />
            <view class="upload-remove" @tap.stop="removeImage">×</view>
          </view>
          <view v-else class="upload-placeholder" @tap="chooseImage">
            <view class="upload-plus">+</view>
            <text>上传课堂照片</text>
            <text class="upload-hint">支持相册或拍照</text>
          </view>
          <view v-if="uploadingImage" class="upload-loading">{{ uploadStatusText }}</view>
        </view>
      </view>
    </view>

    <view class="form-section">
      <view class="section-head">备注</view>
      <view class="form-card">
        <textarea v-model="notes" class="textarea" placeholder="备注信息（可选）" />
      </view>
    </view>

    <view class="form-footer">
      <button class="btn-primary footer-btn" :loading="submitting" @tap="handleSubmit">
        {{ mode === 'edit' ? '保存修改' : '提交录入' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  studentAPI,
  attendanceAPI,
  coursePackageAPI,
  courseTypeAPI,
  coursewareAPI,
  teacherAPI
} from '@/api'
import { isAllStores } from '@/utils/finance'
import { LESSON_TYPES, dayOfWeekFromDate } from '@/utils/lessonType'
import { formatStudentLabel } from '@/utils/format'
import { imageFullUrl } from '@/utils/media'
import { uploadLessonImage } from '@/utils/upload'
import { prepareImageForUpload } from '@/utils/imageCompress'
import { requireLogin, useUserStore } from '@/stores/user'

const userStore = useUserStore()

function todayStr() {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const mode = ref('create')
const recordId = ref('')
const studentScope = ref('mine')
const studentKeyword = ref('')
const studentOptions = ref([])
const studentId = ref(null)
const studentLabel = ref('')
const lessonTypeIndex = ref(0)
const lessonType = ref('regular')
const lessonTypeLabels = LESSON_TYPES.map((t) => t.label)
const packageOptions = ref([])
const packageId = ref(null)
const packageLabel = ref('')
const courseTypeOptions = ref([])
const courseTypeId = ref(null)
const courseTypeLabel = ref('')
const coursewareOptions = ref([{ value: '', label: '不选课件' }])
const coursewareId = ref(null)
const coursewareLabel = ref('')
const customCoursewareName = ref('')
const teacherOptions = ref([])
const teacherId = ref(null)
const teacherLabel = ref('')
const selfTeacherName = ref('')
const classDate = ref(todayStr())
const classesDeducted = ref(1)
const deductOptions = ['0.5', '1', '1.5', '2', '2.5', '3']
const income = ref('')
const notes = ref('')
const submitting = ref(false)
const imageUrl = ref('')
const imagePreview = ref('')
const uploadingImage = ref(false)
const uploadStatusText = ref('')

let searchTimer = null

onLoad((query) => {
  if (!requireLogin()) return
  mode.value = query.mode || 'create'
  recordId.value = query.id || ''
  uni.setNavigationBarTitle({ title: mode.value === 'edit' ? '修正课时' : '录入课时' })
  initOptions().then(() => {
    if (query.studentId && mode.value === 'create') {
      prefillStudent(query.studentId)
    }
  })
})

async function prefillStudent(sid) {
  try {
    const s = await studentAPI.getById(sid)
    if (!s) return
    studentId.value = s.studentId
    studentLabel.value = formatStudentLabel(s)
    await loadPackages(s.studentId)
    const last = await attendanceAPI.getLatestRecordByStudent(s.studentId).catch(() => null)
    if (last?.courseTypeId) {
      courseTypeId.value = last.courseTypeId
      courseTypeLabel.value = last.courseTypeName || ''
      await loadCourseware(last.courseTypeId)
    }
  } catch {
    // ignore
  }
}

async function initOptions() {
  const user = userStore.userInfo || {}
  const selfTeacherId = user.teacherId || null
  const name = user.realName || user.username || ''
  try {
    const courseTypes = await courseTypeAPI.getList()
    courseTypeOptions.value = (courseTypes || [])
      .filter((c) => c.status === 'active')
      .map((c) => ({ value: c.typeId, label: c.typeName }))

    if (userStore.isAdmin) {
      const teachers = await teacherAPI.getList()
      teacherOptions.value = (teachers || []).map((t) => ({
        value: t.teacherId,
        label: t.name || t.phone || `教师#${t.teacherId}`
      }))
      if (mode.value !== 'edit') {
        teacherId.value = null
        teacherLabel.value = ''
      }
    } else {
      teacherId.value = selfTeacherId
      teacherLabel.value = name
      selfTeacherName.value = name
      studentScope.value = 'mine'
    }

    if (mode.value === 'edit' && recordId.value) {
      await loadRecord(recordId.value)
    }
  } catch (e) {
    uni.showToast({ title: e.message || '初始化失败', icon: 'none' })
  }
}

function onTeacherPick(e) {
  const idx = Number(e.detail.value)
  const picked = teacherOptions.value[idx]
  if (!picked) return
  teacherId.value = picked.value
  teacherLabel.value = picked.label
}

async function loadRecord(id) {
  const record = await attendanceAPI.getById(id)
  const idx = Math.max(0, LESSON_TYPES.findIndex((t) => t.value === record.lessonType))
  studentId.value = record.studentId
  studentLabel.value = record.studentName || ''
  lessonTypeIndex.value = idx
  lessonType.value = record.lessonType || 'regular'
  packageId.value = record.packageId
  packageLabel.value = record.packageName || ''
  courseTypeId.value = record.courseTypeId
  courseTypeLabel.value = record.courseTypeName || ''
  coursewareId.value = record.coursewareId
  coursewareLabel.value = record.coursewareName || ''
  teacherId.value = record.teacherId
  teacherLabel.value = record.teacherName || ''
  classDate.value = record.classDate
  classesDeducted.value = record.classesDeducted
  income.value = record.income != null ? String(record.income) : ''
  notes.value = record.notes || ''
  imageUrl.value = record.imageUrl || ''
  imagePreview.value = imageFullUrl(record.imageUrl)
  if (record.studentId) await loadPackages(record.studentId)
  if (record.courseTypeId) await loadCourseware(record.courseTypeId)
}

function onStudentKeywordInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => searchStudents(), 300)
}

function onStudentScopeChange(scope) {
  if (scope === studentScope.value) return
  studentScope.value = scope
  studentOptions.value = []
  studentId.value = null
  studentLabel.value = ''
  if ((studentKeyword.value || '').trim()) searchStudents()
}

async function searchStudents() {
  const keyword = (studentKeyword.value || '').trim()
  try {
    const list = await studentAPI.search(keyword, studentScope.value)
    studentOptions.value = (list || []).map((s) => ({
      value: s.studentId,
      label: formatStudentLabel(s)
    }))
    if (!studentOptions.value.length) {
      uni.showToast({ title: '未找到学员', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: e.message || '搜索失败', icon: 'none' })
  }
}

async function onStudentPick(e) {
  const idx = Number(e.detail.value)
  const picked = studentOptions.value[idx]
  if (!picked) return
  studentId.value = picked.value
  studentLabel.value = picked.label
  packageId.value = null
  packageLabel.value = ''
  packageOptions.value = []
  await loadPackages(picked.value)
  try {
    const last = await attendanceAPI.getLatestRecordByStudent(picked.value)
    if (last) {
      if (last.courseTypeId) {
        courseTypeId.value = last.courseTypeId
        courseTypeLabel.value = last.courseTypeName || ''
      }
      if (userStore.isAdmin && last.teacherId) {
        teacherId.value = last.teacherId
        teacherLabel.value = last.teacherName || ''
        const hit = teacherOptions.value.find((t) => t.value === last.teacherId)
        if (hit) teacherLabel.value = hit.label
      }
      if (last.courseTypeId) await loadCourseware(last.courseTypeId)
    }
  } catch {
    // ignore
  }
}

async function loadPackages(sid) {
  const pkgs = await coursePackageAPI.getByStudent(sid)
  packageOptions.value = (pkgs || []).map((p) => {
    const dateStr = p.purchaseDate ? `（${p.purchaseDate}）` : ''
    return { value: p.packageId, label: `${p.packageName}${dateStr}` }
  })
}

function onLessonTypeChange(e) {
  const idx = Number(e.detail.value)
  lessonTypeIndex.value = idx
  lessonType.value = LESSON_TYPES[idx].value
}

function onPackagePick(e) {
  const idx = Number(e.detail.value)
  const picked = packageOptions.value[idx]
  if (!picked) return
  packageId.value = picked.value
  packageLabel.value = picked.label
}

async function onCourseTypePick(e) {
  const idx = Number(e.detail.value)
  const picked = courseTypeOptions.value[idx]
  if (!picked) return
  courseTypeId.value = picked.value
  courseTypeLabel.value = picked.label
  coursewareId.value = null
  coursewareLabel.value = ''
  coursewareOptions.value = [{ value: '', label: '不选课件' }]
  await loadCourseware(picked.value)
}

async function loadCourseware(typeId) {
  const list = await coursewareAPI.listByCourseType(typeId, '')
  coursewareOptions.value = [{ value: '', label: '不选课件' }].concat(
    (list || []).map((c) => ({
      value: c.coursewareId,
      label: c.name || c.coursewareName
    }))
  )
}

function onCoursewarePick(e) {
  const idx = Number(e.detail.value)
  const picked = coursewareOptions.value[idx]
  coursewareId.value = picked && picked.value ? picked.value : null
  coursewareLabel.value = picked ? picked.label : ''
  customCoursewareName.value = ''
}

function onCustomCoursewareInput() {
  coursewareId.value = null
  coursewareLabel.value = ''
}

function onClassDateChange(e) {
  classDate.value = e.detail.value
}

function onDeductChange(e) {
  classesDeducted.value = Number(deductOptions[e.detail.value])
}

function chooseImage() {
  if (uploadingImage.value) return
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success(res) {
      const filePath = res.tempFilePaths && res.tempFilePaths[0]
      if (!filePath) return
      compressAndUpload(filePath)
    }
  })
}

async function compressAndUpload(filePath) {
  if (uploadingImage.value) return
  uploadingImage.value = true
  uploadStatusText.value = '压缩中…'
  imagePreview.value = filePath
  try {
    const prepared = await prepareImageForUpload(filePath, {
      maxLongEdge: 1280,
      jpegQuality: 0.78
    })
    uploadStatusText.value = '上传中…'
    const url = await uploadLessonImage(prepared)
    imageUrl.value = url
    imagePreview.value = imageFullUrl(url)
    uni.showToast({ title: '上传成功', icon: 'success' })
  } catch (e) {
    imageUrl.value = ''
    imagePreview.value = ''
    uni.showToast({ title: e.message || '上传失败', icon: 'none' })
  } finally {
    uploadingImage.value = false
    uploadStatusText.value = ''
  }
}

function removeImage() {
  imageUrl.value = ''
  imagePreview.value = ''
}

function previewImage() {
  if (!imagePreview.value) return
  uni.previewImage({ urls: [imagePreview.value] })
}

function buildSubmitData() {
  const isCustom = !!customCoursewareName.value.trim()
  const user = userStore.userInfo || {}
  return {
    studentId: studentId.value,
    lessonType: lessonType.value,
    packageId:
      lessonType.value === 'regular' || lessonType.value === 'renewal_pending'
        ? packageId.value || null
        : null,
    courseTypeId: courseTypeId.value || null,
    coursewareId: isCustom ? null : coursewareId.value || null,
    coursewareName: isCustom ? customCoursewareName.value.trim() : undefined,
    teacherId: userStore.isAdmin
      ? teacherId.value
      : user.teacherId || teacherId.value || null,
    classDate: classDate.value,
    dayOfWeek: dayOfWeekFromDate(classDate.value),
    classesDeducted: lessonType.value === 'temp' ? 0 : classesDeducted.value,
    income: lessonType.value === 'temp' ? Number(income.value) : undefined,
    notes: notes.value || '',
    imageUrl: imageUrl.value || null
  }
}

function validate() {
  if (uploadingImage.value) {
    uni.showToast({ title: '图片上传中，请稍候', icon: 'none' })
    return false
  }
  if (userStore.isAdmin && isAllStores()) {
    uni.showToast({ title: '请先在首页选择店铺', icon: 'none' })
    return false
  }
  if (userStore.isAdmin && !teacherId.value) {
    uni.showToast({ title: '请选择授课老师', icon: 'none' })
    return false
  }
  if (!userStore.isAdmin && !userStore.userInfo?.teacherId) {
    uni.showToast({ title: '当前账号未绑定教师', icon: 'none' })
    return false
  }
  if (!studentId.value || !classDate.value) {
    uni.showToast({ title: '请填写学员和日期', icon: 'none' })
    return false
  }
  if (lessonType.value === 'regular' && !packageId.value) {
    uni.showToast({ title: '正式课需选择课包', icon: 'none' })
    return false
  }
  if (lessonType.value === 'temp' && !income.value) {
    uni.showToast({ title: '临时课需填写收入', icon: 'none' })
    return false
  }
  return true
}

async function handleSubmit() {
  if (submitting.value || !validate()) return
  const payload = buildSubmitData()
  submitting.value = true
  try {
    if (mode.value === 'edit') {
      await attendanceAPI.update(recordId.value, payload)
      uni.showToast({ title: '保存成功', icon: 'success' })
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
          uni.showModal({
            title: '可能重复',
            content: `该学员在 ${payload.classDate} 已有类似记录（${dup.count} 条），仍要录入吗？`,
            success: (res) => resolve(!!res.confirm)
          })
        })
        if (!ok) {
          submitting.value = false
          return
        }
      }
      await attendanceAPI.create(payload)
      uni.showToast({ title: '录入成功', icon: 'success' })
    }
    setTimeout(() => {
      uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/attendance/list' }) })
    }, 500)
  } catch (e) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.page-form {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

.form-section {
  padding: 24rpx 24rpx 0;
}

.section-head {
  font-size: 26rpx;
  color: var(--text-muted);
  margin-bottom: 12rpx;
  padding-left: 8rpx;
}

.form-card {
  background: var(--canvas);
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1rpx solid var(--hairline);
}

.cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid var(--hairline);
}

.cell:last-child {
  border-bottom: none;
}

.cell-label {
  flex-shrink: 0;
  font-size: 28rpx;
  color: var(--text-ink);
}

.cell-value {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: var(--text-ink);
}

.cell-value.placeholder {
  color: #bbb;
}

.cell-value.arrow::after {
  content: ' ›';
  color: #ccc;
}

.field-block.inner {
  padding: 0 24rpx 24rpx;
}

.scope-row {
  display: flex;
  gap: 16rpx;
  padding: 0 24rpx 16rpx;
}

.scope-chip {
  padding: 10rpx 24rpx;
  border-radius: var(--radius-full);
  font-size: 24rpx;
  color: var(--text-muted);
  background: var(--bg-page);
}

.scope-chip.active {
  color: var(--primary);
  background: var(--primary-light);
  font-weight: 500;
}

.search-row {
  display: flex;
  gap: 16rpx;
  align-items: center;
  padding: 0 24rpx 16rpx;
}

.search-input {
  flex: 1;
}

.search-btn {
  flex-shrink: 0;
  background: var(--primary-light);
  color: var(--primary);
}

.field-block {
  padding-top: 24rpx;
}

.field-label {
  padding: 0 24rpx 12rpx;
  font-size: 26rpx;
  color: var(--text-muted);
}

.input,
.textarea,
.field-block .cell-value {
  background: var(--bg-page);
  border: 1rpx solid var(--hairline);
  border-radius: var(--radius-sm);
  padding: 20rpx 24rpx;
  font-size: 28rpx;
}

.field-block .cell-value {
  margin: 0 24rpx 16rpx;
}

.textarea {
  width: calc(100% - 48rpx);
  min-height: 160rpx;
  margin: 0 24rpx 24rpx;
  box-sizing: border-box;
}

.custom-name {
  margin: 12rpx 24rpx 24rpx;
}

.tips {
  padding: 0 24rpx 24rpx;
  font-size: 24rpx;
}

.upload-area {
  padding: 24rpx;
  position: relative;
}

.upload-placeholder {
  height: 280rpx;
  border: 2rpx dashed var(--hairline);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  color: var(--text-muted);
  font-size: 28rpx;
  background: var(--bg-page);
}

.upload-plus {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 48rpx;
  line-height: 68rpx;
  text-align: center;
}

.upload-hint {
  font-size: 22rpx;
  color: #bbb;
}

.upload-preview-wrap {
  position: relative;
  width: 100%;
  height: 360rpx;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.upload-preview {
  width: 100%;
  height: 100%;
}

.upload-remove {
  position: absolute;
  top: 16rpx;
  right: 16rpx;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  text-align: center;
  line-height: 44rpx;
  font-size: 36rpx;
}

.upload-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.72);
  color: var(--text-muted);
  font-size: 28rpx;
}

.form-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid var(--hairline);
}

.footer-btn,
.btn-primary {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 32rpx;
  background: var(--primary);
  color: #fff;
}
</style>
