<template>
  <view class="page-form">
    <scroll-view scroll-y class="form-scroll">
      <view class="form-inner">
        <view class="top">
          <BackBar />
          <text class="top-title">{{ mode === 'edit' ? '修正课时' : '录入课时' }}</text>
        </view>

        <!-- 学员 -->
        <view class="card card--student">
          <view v-if="studentId && studentLabel" class="picked">
            <view class="picked-avatar">{{ studentLabel.slice(0, 1) }}</view>
            <text class="picked-name">{{ studentLabel }}</text>
            <text class="picked-change" @tap="clearStudentPick">更换</text>
          </view>
          <template v-else>
            <view class="search">
              <input
                v-model="studentKeyword"
                class="search-input"
                placeholder="搜索学员：姓名 / 拼音首字母"
                placeholder-class="search-ph"
                confirm-type="search"
                :adjust-position="true"
                :cursor-spacing="120"
                @input="onStudentKeywordInput"
                @confirm="searchStudents"
              />
              <view class="search-go" @tap="searchStudents">搜索</view>
            </view>
            <view v-if="!studentOptions.length" class="search-tip">支持姓名、小名或拼音首字母，如「zs」</view>
            <scroll-view v-if="studentOptions.length" scroll-y class="results">
              <view
                v-for="opt in studentOptions"
                :key="opt.value"
                class="result"
                hover-class="result--hover"
                @tap="pickStudent(opt)"
              >{{ opt.label }}</view>
            </scroll-view>
          </template>
        </view>

        <!-- 课时类型 -->
        <view class="types">
          <view
            v-for="(t, idx) in LESSON_TYPES"
            :key="t.value"
            class="type"
            :class="['type--' + t.value, { active: lessonTypeIndex === idx }]"
            @tap="setLessonType(idx)"
          >{{ t.label }}</view>
        </view>

        <!-- 主要信息 -->
        <view class="card card--rows">
          <view
            v-if="lessonType === 'regular' || lessonType === 'renewal_pending'"
            class="row row--tap"
            hover-class="row--hover"
            @tap="openPackagePicker"
          >
            <text class="row-label">课包<text v-if="lessonType === 'regular'" class="req">*</text></text>
            <text class="row-value" :class="{ ph: !packageLabel }">
              {{ packageLabel || (packageOptions.length ? '请选择' : studentId ? '该学员暂无可用课包' : '先选学员') }}
            </text>
            <text class="row-arrow">›</text>
          </view>

          <view v-if="lessonType === 'temp'" class="row">
            <text class="row-label">收入<text class="req">*</text></text>
            <input
              v-model="income"
              class="row-input"
              type="digit"
              placeholder="请输入金额（元）"
              :adjust-position="true"
              :cursor-spacing="120"
            />
          </view>

          <picker :range="courseTypeOptions" range-key="label" @change="onCourseTypePick">
            <view class="row row--tap">
              <text class="row-label">课程类型</text>
              <text class="row-value" :class="{ ph: !courseTypeLabel }">{{ courseTypeLabel || '请选择' }}</text>
              <text class="row-arrow">›</text>
            </view>
          </picker>

          <view v-if="userStore.isAdmin" class="row-wrap">
            <picker :range="teacherOptions" range-key="label" @change="onTeacherPick">
              <view class="row row--tap">
                <text class="row-label">上课员工<text class="req">*</text></text>
                <text class="row-value" :class="{ ph: !teacherLabel }">{{ teacherLabel || '请选择' }}</text>
                <text class="row-arrow">›</text>
              </view>
            </picker>
          </view>

          <picker mode="date" :value="classDate" @change="onClassDateChange">
            <view class="row row--tap">
              <text class="row-label">上课日期</text>
              <text class="row-value">{{ classDate }}<text v-if="classDate === today" class="row-tag">今天</text></text>
              <text class="row-arrow">›</text>
            </view>
          </picker>

          <view v-if="lessonType !== 'temp'" class="row">
            <text class="row-label">扣除课时</text>
            <view class="deduct">
              <view
                v-for="d in deductChoices"
                :key="d.value"
                class="deduct-chip"
                :class="{ active: isDeductSelected(d.value) }"
                @tap="classesDeducted = d.value"
              >{{ d.label }}</view>
            </view>
          </view>

          <!-- 照片：同一行，拍照 / 相册 -->
          <view class="row row--photo">
            <text class="row-label">课堂照片</text>
            <view v-if="imagePreview" class="thumb-wrap">
              <image class="thumb" :src="imagePreview" mode="aspectFill" @tap="previewImage" />
              <view v-if="uploadingImage" class="thumb-loading">{{ uploadStatusText }}</view>
              <view v-else class="thumb-x" @tap.stop="removeImage">×</view>
            </view>
            <view v-else class="photo-actions">
              <view class="photo-btn photo-btn--primary" @tap.stop="pickImage('camera')">拍照</view>
              <view class="photo-btn" @tap.stop="pickImage('album')">相册</view>
            </view>
          </view>
        </view>

        <!-- 更多：折叠 -->
        <view class="more-toggle" @tap="showMore = !showMore">
          <text class="more-text">课件、备注<text v-if="!showMore && moreFilled" class="more-dot">已填</text></text>
          <text class="more-arrow" :class="{ open: showMore }">›</text>
        </view>
        <view v-if="showMore" class="card card--more">
          <picker :range="coursewareOptions" range-key="label" @change="onCoursewarePick">
            <view class="row row--tap">
              <text class="row-label">课件</text>
              <text class="row-value" :class="{ ph: !coursewareLabel }">{{ coursewareLabel || '从列表选择（可选）' }}</text>
              <text class="row-arrow">›</text>
            </view>
          </picker>
          <view class="row">
            <text class="row-label">自定义课件</text>
            <input
              v-model="customCoursewareName"
              class="row-input"
              placeholder="没有合适的可直接输入"
              :adjust-position="true"
              :cursor-spacing="120"
              @input="onCustomCoursewareInput"
            />
          </view>
          <view class="notes-wrap">
            <textarea
              v-model="notes"
              class="textarea"
              placeholder="备注（可选）"
              :adjust-position="true"
              :cursor-spacing="160"
              :show-confirm-bar="false"
            />
          </view>
        </view>

        <view class="scroll-bottom-spacer" />
      </view>
    </scroll-view>

    <view class="form-footer">
      <view class="footer-info">
        <text class="footer-name">{{ studentLabel || '未选择学员' }}</text>
        <text class="footer-meta">{{ summaryMeta }}</text>
      </view>
      <view
        class="footer-btn"
        :class="{ 'footer-btn--disabled': submitting || uploadingImage }"
        @tap="handleSubmit"
      >
        {{ submitting ? '提交中…' : mode === 'edit' ? '保存修改' : '提交' }}
      </view>
    </view>

    <!-- #ifdef MP-WEIXIN -->
    <view v-if="showPrivacy" class="privacy-mask" @tap.stop>
      <view class="privacy-box">
        <text class="privacy-title">隐私保护提示</text>
        <text class="privacy-desc">拍摄或选择课堂照片前，请先阅读并同意{{ privacyContractName || '用户隐私保护指引' }}。</text>
        <button
          id="agree-btn"
          class="privacy-agree"
          open-type="agreePrivacyAuthorization"
          @agreeprivacyauthorization="onPrivacyAgree"
        >同意</button>
        <button class="privacy-cancel" @tap="onPrivacyDisagree">暂不</button>
      </view>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
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
import { formatClassHours } from '@/utils/classHours'
import { imageFullUrl } from '@/utils/media'
import { uploadLessonImage } from '@/utils/upload'
import { prepareImageForUpload } from '@/utils/imageCompress'
import { requireLogin, useUserStore } from '@/stores/user'
import BackBar from '@/components/BackBar.vue'

const userStore = useUserStore()

function todayStr() {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const mode = ref('create')
const recordId = ref('')
/** 录入时搜索全部学员，不再区分「我的学员」 */
const studentScope = 'all'
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
const classDate = ref(todayStr())
const classesDeducted = ref(1)
const today = todayStr()
const showMore = ref(false)
const income = ref('')
const notes = ref('')
const submitting = ref(false)
const imageUrl = ref('')
const imagePreview = ref('')
const uploadingImage = ref(false)
const uploadStatusText = ref('')
const showPrivacy = ref(false)
const privacyContractName = ref('')
let resolvePrivacyAuthorization = null

let searchTimer = null

const moreFilled = computed(() => !!(coursewareLabel.value || customCoursewareName.value.trim() || notes.value.trim()))

const summaryMeta = computed(() => {
  const type = lessonTypeLabels[lessonTypeIndex.value]
  if (lessonType.value === 'temp') {
    return `${type} · ${income.value ? '¥' + income.value : '待填收入'} · ${classDate.value}`
  }
  return `${type} · 扣 ${formatClassHours(classesDeducted.value)} 节 · ${classDate.value}`
})

/** 与 PC 端一致：1、2/3、0.5、1.5 */
const BASE_DEDUCT_CHOICES = [
  { value: 1, label: '1' },
  { value: 0.6667, label: '2/3' },
  { value: 0.5, label: '0.5' },
  { value: 1.5, label: '1.5' }
]

function isDeductSelected(v) {
  return Math.abs(Number(classesDeducted.value) - v) < 0.002
}

/** 修正旧记录时，如果原扣课不在标准选项里（如 2），额外保留一个选项，避免被改掉 */
const deductChoices = computed(() => {
  if (BASE_DEDUCT_CHOICES.some((d) => isDeductSelected(d.value))) return BASE_DEDUCT_CHOICES
  const n = Number(classesDeducted.value)
  if (!Number.isFinite(n) || n <= 0) return BASE_DEDUCT_CHOICES
  return [...BASE_DEDUCT_CHOICES, { value: n, label: formatClassHours(n) }]
})

onLoad((query) => {
  if (!requireLogin()) return
  setupPhotoPrivacy()
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
        label: t.name || t.phone || `员工#${t.teacherId}`
      }))
      if (mode.value !== 'edit') {
        teacherId.value = null
        teacherLabel.value = ''
      }
    } else {
      teacherId.value = selfTeacherId
      teacherLabel.value = name
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
  showMore.value = moreFilled.value
}

function onStudentKeywordInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => searchStudents(), 350)
}

async function searchStudents() {
  const keyword = (studentKeyword.value || '').trim()
  if (!keyword) {
    uni.showToast({ title: '请输入搜索关键字', icon: 'none' })
    return
  }
  try {
    let list = await studentAPI.search(keyword, studentScope)
    if (!list?.length) {
      const page = await studentAPI.getPage({ current: 1, size: 40, name: keyword })
      list = page?.records || []
    }
    studentOptions.value = (list || []).map((s) => ({
      value: s.studentId,
      label: formatStudentLabel(s)
    }))
    if (studentOptions.value.length === 1) {
      await pickStudent(studentOptions.value[0])
      return
    }
    if (!studentOptions.value.length) {
      uni.showToast({ title: '未找到学员', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: e.message || '搜索失败', icon: 'none' })
  }
}

function clearStudentPick() {
  studentId.value = null
  studentLabel.value = ''
  packageId.value = null
  packageLabel.value = ''
  packageOptions.value = []
}

async function pickStudent(picked) {
  if (!picked?.value) return
  studentId.value = picked.value
  studentLabel.value = picked.label
  studentOptions.value = []
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

function setLessonType(idx) {
  lessonTypeIndex.value = idx
  lessonType.value = LESSON_TYPES[idx].value
}

function openPackagePicker() {
  if (!packageOptions.value.length) {
    uni.showToast({ title: '请先选学员或该学员无课包', icon: 'none' })
    return
  }
  uni.showActionSheet({
    itemList: packageOptions.value.map((p) => p.label),
    success: (res) => {
      const picked = packageOptions.value[res.tapIndex]
      if (picked) {
        packageId.value = picked.value
        packageLabel.value = picked.label
      }
    }
  })
}

async function loadPackages(sid) {
  const pkgs = await coursePackageAPI.getByStudent(sid)
  packageOptions.value = (pkgs || []).map((p) => {
    const dateStr = p.purchaseDate ? ` · ${p.purchaseDate}` : ''
    const rem = p.remainingClasses != null ? ` · 剩${p.remainingClasses}节` : ''
    return { value: p.packageId, label: `${p.packageName}${dateStr}${rem}` }
  })
  if (packageOptions.value.length === 1 && lessonType.value === 'regular') {
    packageId.value = packageOptions.value[0].value
    packageLabel.value = packageOptions.value[0].label
  }
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

function showImageSourceSheet() {
  uni.showActionSheet({
    itemList: ['拍照', '从相册选择'],
    success: (res) => {
      pickImage(res.tapIndex === 0 ? 'camera' : 'album')
    }
  })
}

function setupPhotoPrivacy() {
  // #ifdef MP-WEIXIN
  if (typeof wx === 'undefined') return
  if (wx.onNeedPrivacyAuthorization) {
    wx.onNeedPrivacyAuthorization((resolve) => {
      resolvePrivacyAuthorization = resolve
      showPrivacy.value = true
    })
  }
  // #endif
}

function onPrivacyAgree() {
  if (resolvePrivacyAuthorization) {
    resolvePrivacyAuthorization({ buttonId: 'agree-btn', event: 'agree' })
    resolvePrivacyAuthorization = null
  }
  showPrivacy.value = false
}

function onPrivacyDisagree() {
  if (resolvePrivacyAuthorization) {
    resolvePrivacyAuthorization({ event: 'disagree' })
    resolvePrivacyAuthorization = null
  }
  showPrivacy.value = false
}

function handlePickFail(err) {
  const msg = err?.errMsg || ''
  if (/cancel/i.test(msg)) return
  if (/112|scope is not declared/i.test(msg)) {
    uni.showModal({
      title: '公众平台未声明相册/摄像头',
      content: '请到微信公众平台的用户隐私保护指引里勾选「选中的照片或视频」和「摄像头」，审核通过后再试。仅在小程序里点同意无法代替这一项。',
      showCancel: false
    })
    return
  }
  if (/privacy/i.test(msg)) {
    showPrivacy.value = true
    return
  }
  if (/auth deny|authorize|permission/i.test(msg)) {
    uni.showModal({
      title: '需要相机或相册权限',
      content: '请在手机系统设置中允许微信使用相机和相册，再回到小程序重试。',
      showCancel: false
    })
    return
  }
  uni.showToast({ title: msg.replace(/^choose\w+:fail\s*/i, '') || '无法打开相机或相册', icon: 'none' })
}

function openImagePicker(source) {
  const sourceType = source === 'camera' ? ['camera'] : ['album']
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed', 'original'],
    sourceType,
    success(res) {
      const filePath = res.tempFilePaths && res.tempFilePaths[0]
      if (filePath) compressAndUpload(filePath)
    },
    fail: handlePickFail
  })
}

function pickImage(source) {
  if (uploadingImage.value) return
  openImagePicker(source)
}

async function compressAndUpload(filePath) {
  if (uploadingImage.value) return
  uploadingImage.value = true
  uploadStatusText.value = '处理中…'
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
    uni.showToast({ title: '照片已上传', icon: 'success' })
  } catch (e) {
    imageUrl.value = ''
    imagePreview.value = ''
    uni.showToast({ title: e.message || '上传失败', icon: 'none', duration: 2800 })
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
    uni.showToast({ title: '请选择上课员工', icon: 'none' })
    return false
  }
  if (!userStore.isAdmin && !userStore.userInfo?.teacherId) {
    uni.showToast({ title: '账号未关联上课员工，请联系管理员', icon: 'none' })
    return false
  }
  if (!studentId.value || !classDate.value) {
    uni.showToast({ title: '请选择学员和日期', icon: 'none' })
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
  if (submitting.value || uploadingImage.value || !validate()) return
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
$ink: #2a241f;
$muted: #8a8178;
$line: #f0eae3;
$orange: #f37021;

.page-form {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f6f2ec;
  box-sizing: border-box;
}

.form-scroll {
  flex: 1;
  height: 0;
}

.form-inner {
  padding: 8rpx 24rpx 0;
}

.top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx 0 16rpx;
}

.top-title {
  font-size: 36rpx;
  font-weight: 700;
  color: $ink;
}

.card {
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 6rpx 24rpx rgba(42, 36, 31, 0.05);
  margin-bottom: 20rpx;
  overflow: hidden;
}

/* 学员 */
.card--student {
  padding: 20rpx;
  background: linear-gradient(180deg, #fff6ee 0%, #fff 80%);
}

.search {
  display: flex;
  align-items: center;
  height: 84rpx;
  padding: 0 8rpx 0 26rpx;
  background: #fff;
  border: 2rpx solid #f3d9c7;
  border-radius: 999rpx;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  font-size: 28rpx;
  color: $ink;
}

.search-ph {
  font-size: 26rpx;
  color: #b7aea4;
}

.search-go {
  flex-shrink: 0;
  height: 68rpx;
  line-height: 68rpx;
  padding: 0 36rpx;
  font-size: 27rpx;
  font-weight: 600;
  color: #fff;
  background: $orange;
  border-radius: 999rpx;
}

.search-tip {
  margin-top: 14rpx;
  padding-left: 8rpx;
  font-size: 22rpx;
  color: $muted;
}

.results {
  margin-top: 14rpx;
  max-height: 340rpx;
  background: #fff;
  border: 1rpx solid $line;
  border-radius: 18rpx;
}

.result {
  padding: 22rpx 24rpx;
  font-size: 28rpx;
  color: $ink;
  border-bottom: 1rpx solid $line;
}

.result--hover { background: #fff3ea; }

.picked {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 4rpx 4rpx;
}

.picked-avatar {
  flex-shrink: 0;
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: 700;
  color: #fff;
  background: $orange;
  border-radius: 24rpx;
}

.picked-name {
  flex: 1;
  min-width: 0;
  font-size: 32rpx;
  font-weight: 700;
  color: $ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picked-change {
  flex-shrink: 0;
  padding: 8rpx 22rpx;
  font-size: 24rpx;
  color: $orange;
  background: rgba(243, 112, 33, 0.1);
  border-radius: 999rpx;
}

/* 课时类型 */
.types {
  display: flex;
  gap: 10rpx;
  margin-bottom: 20rpx;
}

.type {
  flex: 1;
  padding: 18rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: #6f665d;
  background: #fff;
  border: 2rpx solid transparent;
  border-radius: 18rpx;
  box-shadow: 0 4rpx 14rpx rgba(42, 36, 31, 0.04);
  white-space: nowrap;
}

.type.active { color: #fff; font-weight: 700; }
.type--regular.active { background: #3d7dff; }
.type--trial.active { background: #1aa6a6; }
.type--gift.active { background: #4c9a2a; }
.type--temp.active { background: #e07a1a; }
.type--renewal_pending.active { background: #7a45c9; }

/* 行 */
.row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-height: 100rpx;
  padding: 0 28rpx;
  border-bottom: 1rpx solid $line;
  box-sizing: border-box;
}

.row:last-child { border-bottom: none; }
.row--hover { background: #faf6f1; }

.row-label {
  flex-shrink: 0;
  min-width: 140rpx;
  font-size: 28rpx;
  color: #5c534b;
}

.req {
  color: #d4380d;
  margin-left: 4rpx;
}

.row-value {
  flex: 1;
  min-width: 0;
  text-align: right;
  font-size: 28rpx;
  color: $ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-value.ph { color: #b7aea4; }

.row-tag {
  margin-left: 12rpx;
  padding: 2rpx 12rpx;
  font-size: 20rpx;
  color: $orange;
  background: rgba(243, 112, 33, 0.1);
  border-radius: 999rpx;
}

.row-arrow {
  flex-shrink: 0;
  font-size: 36rpx;
  line-height: 1;
  color: #cfc6bc;
}

.row-input {
  flex: 1;
  min-width: 0;
  height: 100rpx;
  text-align: right;
  font-size: 28rpx;
  color: $ink;
}

/* 扣课选项 */
.deduct {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: flex-end;
  gap: 10rpx;
}

.deduct-chip {
  min-width: 84rpx;
  padding: 14rpx 18rpx;
  text-align: center;
  font-size: 28rpx;
  color: #5c534b;
  background: #f6f2ec;
  border: 2rpx solid transparent;
  border-radius: 16rpx;
}

.deduct-chip.active {
  color: #fff;
  font-weight: 700;
  background: $orange;
}

/* 照片 */
.row--photo {
  min-height: 112rpx;
}

.photo-actions {
  margin-left: auto;
  display: flex;
  gap: 12rpx;
}

.photo-btn {
  padding: 14rpx 32rpx;
  font-size: 26rpx;
  color: #6533b3;
  background: rgba(122, 69, 201, 0.1);
  border-radius: 999rpx;
}

.photo-btn--primary {
  color: #fff;
  background: #7a45c9;
  font-weight: 600;
}

.thumb-wrap {
  position: relative;
  margin-left: auto;
  width: 88rpx;
  height: 88rpx;
}

.thumb {
  width: 88rpx;
  height: 88rpx;
  border-radius: 16rpx;
  background: #f6f2ec;
}

.thumb-x {
  position: absolute;
  top: -12rpx;
  right: -12rpx;
  width: 36rpx;
  height: 36rpx;
  line-height: 34rpx;
  text-align: center;
  font-size: 26rpx;
  color: #fff;
  background: rgba(42, 36, 31, 0.75);
  border-radius: 50%;
}

.thumb-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: #fff;
  background: rgba(42, 36, 31, 0.55);
  border-radius: 16rpx;
}

/* 更多 */
.more-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 8rpx;
  margin-bottom: 8rpx;
}

.more-text {
  font-size: 26rpx;
  color: $muted;
}

.more-dot {
  margin-left: 12rpx;
  padding: 2rpx 12rpx;
  font-size: 20rpx;
  color: $orange;
  background: rgba(243, 112, 33, 0.1);
  border-radius: 999rpx;
}

.more-arrow {
  font-size: 36rpx;
  line-height: 1;
  color: #cfc6bc;
  transform: rotate(90deg);
  transition: transform 0.2s;
}

.more-arrow.open { transform: rotate(-90deg); }

.notes-wrap {
  padding: 8rpx 28rpx 24rpx;
}

.textarea {
  width: 100%;
  height: 160rpx;
  padding: 20rpx;
  box-sizing: border-box;
  font-size: 27rpx;
  background: #f9f6f1;
  border-radius: 16rpx;
}

.scroll-bottom-spacer { height: 32rpx; }

/* 底部提交栏 */
.form-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid rgba(42, 36, 31, 0.08);
}

.footer-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.footer-name {
  font-size: 28rpx;
  font-weight: 700;
  color: $ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footer-meta {
  font-size: 22rpx;
  color: $muted;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footer-btn {
  flex-shrink: 0;
  min-width: 240rpx;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-weight: 700;
  background: $orange;
  color: #fff;
}

.footer-btn--disabled { opacity: 0.55; }

.privacy-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(42, 36, 31, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}

.privacy-box {
  width: 100%;
  background: #fff;
  border-radius: 24rpx;
  padding: 36rpx 32rpx 28rpx;
}

.privacy-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
}

.privacy-desc {
  display: block;
  font-size: 26rpx;
  color: #595959;
  line-height: 1.5;
  margin-bottom: 28rpx;
}

.privacy-agree {
  background: $orange;
  color: #fff;
  border-radius: 16rpx;
  font-size: 30rpx;
}

.privacy-agree::after { border: none; }

.privacy-cancel {
  margin-top: 12rpx;
  background: transparent;
  color: $muted;
  font-size: 28rpx;
}

.privacy-cancel::after { border: none; }
</style>
