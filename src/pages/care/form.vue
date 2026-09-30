<template>
  <view class="page">
    <view class="top">
      <KindTabs kind="care" page="form" />
    </view>

    <view class="sub-seg">
      <view class="sub-item" :class="{ active: mode === 'today' }" @tap="mode = 'today'">今日扣课</view>
      <view class="sub-item" :class="{ active: mode === 'manual' }" @tap="mode = 'manual'">手动录入</view>
    </view>

    <!-- 今日批量扣课 -->
    <template v-if="mode === 'today'">
      <view class="date-bar">
        <picker mode="date" :value="sessionDate" @change="onSessionDateChange">
          <view class="date-pill">{{ sessionDate }} ▾</view>
        </picker>
        <text class="date-today" @tap="setToday">今天</text>
        <text class="date-count">共 {{ sessions.length }} 位 · 已扣 {{ attendedCount }}</text>
      </view>

      <view v-if="sessionLoading && !sessions.length" class="empty">加载中…</view>
      <view v-else-if="!sessions.length" class="empty">
        没有晚托学员。请确认已选具体店铺，且学员有「晚托」标签或课包名含「晚托」
      </view>

      <view v-for="s in sessions" :key="s.studentId" class="session">
        <view class="session-avatar">{{ (s.studentName || '学').slice(0, 1) }}</view>
        <view class="session-main">
          <view class="session-top">
            <text class="session-name">{{ s.studentName }}</text>
            <text v-if="s.grade" class="session-grade">{{ s.grade }}</text>
          </view>
          <text class="session-meta">
            {{ s.packageName || '无晚托课包' }}<text v-if="s.remainingClasses != null"> · 剩余 {{ formatRemainingClasses(s.remainingClasses) }}</text>
          </text>
        </view>
        <text v-if="s.attended" class="session-done">已扣 {{ formatClassHours(s.classesDeducted ?? 1) }}</text>
        <view
          v-else
          class="session-btn"
          :class="{ 'session-btn--busy': deductingId === s.studentId }"
          hover-class="session-btn--hover"
          @tap="deductSession(s)"
        >{{ deductingId === s.studentId ? '扣课中…' : '扣课' }}</view>
      </view>
    </template>

    <!-- 手动录入 -->
    <template v-else>
      <view class="card">
        <text class="label">学员</text>
        <view v-if="studentId" class="picked">
          <view class="picked-avatar">{{ studentLabel.slice(0, 1) }}</view>
          <text class="picked-name">{{ studentLabel }}</text>
          <text class="picked-change" @tap="clearStudent">更换</text>
        </view>
        <template v-else>
          <view class="search">
            <input
              v-model="keyword"
              class="search-input"
              placeholder="搜索晚托学员：姓名 / 拼音首字母"
              placeholder-class="search-ph"
              confirm-type="search"
              @input="onKeywordInput"
              @confirm="searchStudents"
            />
            <view class="search-go" @tap="searchStudents">搜索</view>
          </view>
          <view v-if="studentsLoading" class="hint">搜索中…</view>
          <view v-else-if="studentOptions.length === 0" class="hint">没有找到晚托学员</view>
          <scroll-view v-else scroll-y class="results">
            <view
              v-for="s in studentOptions"
              :key="s.studentId"
              class="result"
              hover-class="result--hover"
              @tap="pickStudent(s)"
            >
              <text class="result-name">{{ s.name }}</text>
              <text class="result-sub">{{ studentSub(s) }}</text>
            </view>
          </scroll-view>
        </template>
      </view>

      <view class="card card--rows">
        <picker mode="date" :value="formDate" :end="today" @change="onFormDateChange">
          <view class="row">
            <text class="row-label">上课日期</text>
            <text class="row-value">{{ formDate }}</text>
            <text class="row-arrow">›</text>
          </view>
        </picker>

        <picker
          :range="packageOptions"
          range-key="label"
          :disabled="!studentId || !packageOptions.length"
          @change="onPackagePick"
        >
          <view class="row">
            <text class="row-label">晚托课包</text>
            <text class="row-value" :class="{ 'row-value--empty': !packageLabel }">
              {{ packageLabel || (studentId ? '该学员没有可用的晚托课包' : '请先选择学员') }}
            </text>
            <text class="row-arrow">›</text>
          </view>
        </picker>

        <view class="row row--chips">
          <text class="row-label">扣除课时</text>
          <view class="chips">
            <view
              v-for="c in DEDUCT_CHOICES"
              :key="c.label"
              class="chip"
              :class="{ active: isDeductSelected(c.value) }"
              @tap="classesDeducted = c.value"
            >{{ c.label }}</view>
          </view>
        </view>
      </view>

      <view class="footer">
        <view class="footer-info">
          <text class="footer-name">{{ studentLabel || '未选择学员' }}</text>
          <text v-if="missingHint" class="footer-meta footer-meta--warn">{{ missingHint }}</text>
          <text v-else class="footer-meta">晚托 · 扣 {{ formatClassHours(classesDeducted) }} 节 · {{ formDate }}</text>
        </view>
        <view
          class="footer-btn"
          :class="{ 'footer-btn--disabled': submitting }"
          @tap="handleSubmit"
        >{{ submitting ? '提交中…' : '提交' }}</view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import KindTabs from '@/components/KindTabs.vue'
import { requireLogin, useUserStore } from '@/stores/user'
import { studentAPI, coursePackageAPI, careAPI } from '@/api'
import { isAllStores } from '@/utils/finance'
import { formatClassHours, formatRemainingClasses } from '@/utils/classHours'

const CARE_TAG = '晚托'
const DEDUCT_CHOICES = [
  { value: 1, label: '1' },
  { value: 0.6667, label: '2/3' },
  { value: 0.5, label: '0.5' },
  { value: 1.5, label: '1.5' }
]

const userStore = useUserStore()
const mode = ref('today')

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const today = todayStr()

// —— 今日扣课 ——
const sessionDate = ref(today)
const sessions = ref([])
const sessionLoading = ref(false)
const deductingId = ref(null)

const attendedCount = computed(() => sessions.value.filter((s) => s.attended).length)

function storeProblem() {
  if (userStore.isAdmin && isAllStores()) return '请先在首页选择具体店铺'
  return ''
}

async function loadSessions() {
  const problem = storeProblem()
  if (problem) {
    sessions.value = []
    uni.showToast({ title: problem, icon: 'none' })
    return
  }
  sessionLoading.value = true
  try {
    sessions.value = (await careAPI.dailySessions(sessionDate.value)) || []
  } catch (e) {
    sessions.value = []
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    sessionLoading.value = false
  }
}

function onSessionDateChange(e) {
  sessionDate.value = e.detail.value
  loadSessions()
}

function setToday() {
  sessionDate.value = todayStr()
  loadSessions()
}

function deductSession(s) {
  if (deductingId.value) return
  uni.showModal({
    title: '确认扣课',
    content: `${s.studentName} · ${sessionDate.value} 扣 1 课时？`,
    success: async (res) => {
      if (!res.confirm) return
      deductingId.value = s.studentId
      try {
        await careAPI.deduct({
          studentId: s.studentId,
          sessionDate: sessionDate.value,
          packageId: s.packageId || undefined
        })
        uni.showToast({ title: '扣课成功', icon: 'success' })
        await loadSessions()
      } catch (e) {
        uni.showToast({ title: e.message || '扣课失败', icon: 'none' })
      } finally {
        deductingId.value = null
      }
    }
  })
}

// —— 手动录入 ——
const keyword = ref('')
const studentOptions = ref([])
const studentsLoading = ref(false)
const studentId = ref(null)
const studentLabel = ref('')
const packageOptions = ref([])
const packageId = ref(null)
const packageLabel = ref('')
const formDate = ref(today)
const classesDeducted = ref(1)
const submitting = ref(false)
let searchTimer = null

function isDeductSelected(v) {
  return Math.abs(Number(classesDeducted.value) - v) < 0.002
}

function studentSub(s) {
  return [s.nickname, s.grade].filter(Boolean).join(' · ')
}

async function searchStudents() {
  studentsLoading.value = true
  try {
    studentOptions.value = (await studentAPI.search(keyword.value.trim(), 'mine', CARE_TAG)) || []
  } catch (e) {
    studentOptions.value = []
  } finally {
    studentsLoading.value = false
  }
}

function onKeywordInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(searchStudents, 300)
}

function isSelectablePackage(pkg) {
  return (
    String(pkg.packageName || '').includes(CARE_TAG) &&
    pkg.status === 'active' &&
    Number(pkg.remainingClasses) > 0
  )
}

async function pickStudent(s) {
  studentId.value = s.studentId
  studentLabel.value = [s.name, s.grade].filter(Boolean).join(' · ')
  packageOptions.value = []
  packageId.value = null
  packageLabel.value = ''
  try {
    const list = (await coursePackageAPI.getByStudent(s.studentId)) || []
    packageOptions.value = list.filter(isSelectablePackage).map((p) => ({
      value: p.packageId,
      label: `${p.packageName}（剩余 ${formatRemainingClasses(p.remainingClasses)}）`
    }))
    if (packageOptions.value.length) {
      packageId.value = packageOptions.value[0].value
      packageLabel.value = packageOptions.value[0].label
    }
  } catch (e) {
    uni.showToast({ title: e.message || '加载课包失败', icon: 'none' })
  }
}

function clearStudent() {
  studentId.value = null
  studentLabel.value = ''
  packageOptions.value = []
  packageId.value = null
  packageLabel.value = ''
}

function onPackagePick(e) {
  const opt = packageOptions.value[Number(e.detail.value)]
  if (!opt) return
  packageId.value = opt.value
  packageLabel.value = opt.label
}

function onFormDateChange(e) {
  formDate.value = e.detail.value
}

function getMissing() {
  const problem = storeProblem()
  if (problem) return problem
  if (!studentId.value) return '请先选择学员'
  if (!formDate.value) return '请选择上课日期'
  if (!packageId.value) return '请选择晚托课包'
  return ''
}

const missingHint = computed(() => getMissing())

async function handleSubmit() {
  if (submitting.value) return
  const msg = getMissing()
  if (msg) {
    uni.showModal({ title: '还不能提交', content: msg, showCancel: false, confirmText: '知道了' })
    return
  }
  submitting.value = true
  try {
    await careAPI.deduct({
      studentId: studentId.value,
      sessionDate: formDate.value,
      packageId: packageId.value,
      classesDeducted: classesDeducted.value
    })
    uni.showToast({ title: '晚托课时录入成功', icon: 'success' })
    setTimeout(() => uni.reLaunch({ url: '/pages/care/list' }), 600)
  } catch (e) {
    uni.showToast({ title: e.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onShow(() => {
  if (!requireLogin()) return
  if (!userStore.isAdmin) {
    uni.reLaunch({ url: '/pages/home/index' })
    return
  }
  loadSessions()
  searchStudents()
})
</script>

<style lang="scss" scoped>
$ink: #2a241f;
$muted: #8a8178;
$care: #6d5dfc;

.page {
  min-height: 100vh;
  padding: 0 24rpx calc(200rpx + env(safe-area-inset-bottom));
  background: #f6f2ec;
  box-sizing: border-box;
}

.top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx 0 16rpx;
}

.sub-seg {
  display: flex;
  margin-bottom: 20rpx;
  border-bottom: 2rpx solid #ebe4dc;
}

.sub-item {
  flex: 1;
  text-align: center;
  padding: 18rpx 0;
  font-size: 28rpx;
  color: $muted;
  border-bottom: 6rpx solid transparent;
  margin-bottom: -2rpx;
}

.sub-item.active {
  color: $care;
  font-weight: 700;
  border-bottom-color: $care;
}

.date-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.date-pill {
  padding: 12rpx 26rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: $ink;
  background: #fff;
  border-radius: 999rpx;
  box-shadow: 0 4rpx 14rpx rgba(42, 36, 31, 0.05);
}

.date-today {
  font-size: 26rpx;
  color: $care;
}

.date-count {
  margin-left: auto;
  font-size: 23rpx;
  color: $muted;
}

.session {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-bottom: 14rpx;
  padding: 20rpx 22rpx;
  background: #fff;
  border-radius: 22rpx;
  box-shadow: 0 4rpx 16rpx rgba(42, 36, 31, 0.04);
}

.session-avatar,
.picked-avatar {
  flex-shrink: 0;
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  color: $care;
  background: rgba(109, 93, 252, 0.12);
  border-radius: 24rpx;
}

.session-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.session-top {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.session-name {
  font-size: 29rpx;
  font-weight: 700;
  color: $ink;
}

.session-grade {
  padding: 0 12rpx;
  font-size: 20rpx;
  color: $care;
  background: rgba(109, 93, 252, 0.1);
  border-radius: 999rpx;
}

.session-meta {
  font-size: 22rpx;
  color: $muted;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-done {
  flex-shrink: 0;
  padding: 6rpx 20rpx;
  font-size: 23rpx;
  color: #3b7d1f;
  background: rgba(76, 154, 42, 0.14);
  border-radius: 999rpx;
}

.session-btn {
  flex-shrink: 0;
  padding: 14rpx 36rpx;
  font-size: 27rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #6d5dfc, #8f82ff);
  border-radius: 999rpx;
}

.session-btn--hover { opacity: 0.85; }
.session-btn--busy { opacity: 0.5; }

.empty {
  padding: 70rpx 40rpx;
  text-align: center;
  font-size: 25rpx;
  line-height: 1.7;
  color: $muted;
}

.card {
  margin-bottom: 16rpx;
  padding: 22rpx 24rpx;
  background: #fff;
  border-radius: 22rpx;
  box-shadow: 0 4rpx 16rpx rgba(42, 36, 31, 0.04);
}

.card--rows { padding: 0 24rpx; }

.label {
  display: block;
  margin-bottom: 14rpx;
  font-size: 24rpx;
  color: $muted;
}

.picked {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.picked-name {
  flex: 1;
  min-width: 0;
  font-size: 30rpx;
  font-weight: 700;
  color: $ink;
}

.picked-change {
  font-size: 26rpx;
  color: $care;
}

.search {
  display: flex;
  align-items: center;
  height: 80rpx;
  padding: 0 6rpx 0 24rpx;
  background: #f6f2ec;
  border-radius: 999rpx;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  font-size: 27rpx;
}

.search-ph {
  font-size: 25rpx;
  color: #b7aea4;
}

.search-go {
  height: 68rpx;
  line-height: 68rpx;
  padding: 0 32rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
  background: $care;
  border-radius: 999rpx;
}

.hint {
  padding: 24rpx 0 8rpx;
  text-align: center;
  font-size: 24rpx;
  color: #b7aea4;
}

.results {
  max-height: 360rpx;
  margin-top: 12rpx;
}

.result {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12rpx;
  padding: 20rpx 8rpx;
  border-bottom: 1rpx solid #f3eee8;
}

.result--hover { background: #faf7f3; }

.result-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $ink;
}

.result-sub {
  font-size: 22rpx;
  color: $muted;
}

.row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  min-height: 100rpx;
  border-bottom: 1rpx solid #f3eee8;
}

.row:last-child { border-bottom: none; }

.row-label {
  flex-shrink: 0;
  width: 150rpx;
  font-size: 27rpx;
  color: $muted;
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

.row-value--empty { color: #b7aea4; }

.row-arrow {
  font-size: 36rpx;
  color: #cfc6bc;
}

.row--chips { padding: 16rpx 0; }

.chips {
  flex: 1;
  display: flex;
  justify-content: flex-end;
  gap: 12rpx;
}

.chip {
  min-width: 84rpx;
  height: 64rpx;
  line-height: 60rpx;
  padding: 0 12rpx;
  text-align: center;
  font-size: 27rpx;
  color: $muted;
  background: #f6f2ec;
  border: 2rpx solid transparent;
  border-radius: 18rpx;
  box-sizing: border-box;
}

.chip.active {
  color: $care;
  font-weight: 700;
  background: rgba(109, 93, 252, 0.1);
  border-color: $care;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -6rpx 24rpx rgba(42, 36, 31, 0.08);
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

.footer-meta--warn {
  color: #c13515;
  font-weight: 600;
}

.footer-btn {
  flex-shrink: 0;
  min-width: 240rpx;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #6d5dfc, #8f82ff);
  border-radius: 999rpx;
}

.footer-btn--disabled { opacity: 0.55; }
</style>
