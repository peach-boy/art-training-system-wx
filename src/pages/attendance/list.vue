<template>
  <PageShell :title="listTitle" :tab-bar="true" tab-active="attendance">
    <view v-if="userStore.isTeacher && !filterStudentId" class="filter-hint">仅显示我录入的课时</view>

    <view class="main-tabs card">
      <view
        class="main-tab"
        :class="{ active: listMode === 'records' }"
        @tap="setListMode('records')"
      >课时记录</view>
      <view
        class="main-tab"
        :class="{ active: listMode === 'packages' }"
        @tap="setListMode('packages')"
      >课包核对</view>
    </view>

    <view class="student-filter card">
      <view class="student-filter-head">
        <text class="student-filter-title">学员</text>
        <text v-if="filterStudentId" class="student-clear" @tap="clearStudent">清除</text>
      </view>
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
          class="search-input"
          placeholder="姓名 / 首字母搜索"
          confirm-type="search"
          @confirm="searchStudents"
        />
        <button class="search-btn" size="mini" @tap="searchStudents">搜索</button>
      </view>
      <picker
        v-if="studentOptions.length"
        :range="studentOptions"
        range-key="label"
        @change="onStudentPick"
      >
        <view class="student-picked">{{ studentLabel || '点选搜索结果中的学员' }}</view>
      </picker>
      <view v-else-if="filterStudentId && studentLabel" class="student-picked">{{ studentLabel }}</view>
      <view v-else class="student-hint">不选学员则{{ userStore.isTeacher ? '显示我的课时' : '显示全部学员' }}</view>
    </view>

    <template v-if="listMode === 'records'">
      <view v-if="filterStudentId && packageOptions.length" class="pkg-filter card">
        <text class="pkg-filter-label">课包筛选</text>
        <picker :range="packagePickerRange" range-key="label" @change="onPackageFilterPick">
          <view class="pkg-filter-value">{{ packageFilterLabel }}</view>
        </picker>
      </view>

      <view class="period-tabs card">
        <view
          v-for="m in periodModes"
          :key="m.key"
          class="period-tab"
          :class="{ active: periodMode === m.key }"
          @tap="setPeriodMode(m.key)"
        >{{ m.label }}</view>
      </view>

      <view class="filter card">
        <template v-if="periodMode === 'day'">
          <picker mode="date" :value="anchorDate" @change="onAnchorChange">
            <view class="filter-item filter-item--wide">{{ anchorDate }}</view>
          </picker>
        </template>

        <template v-else-if="periodMode === 'week'">
          <picker mode="date" :value="anchorDate" @change="onAnchorChange">
            <view class="filter-item filter-item--wide">周内任一天：{{ anchorDate }}</view>
          </picker>
          <text class="range-text">{{ rangeLabel }}</text>
        </template>

        <template v-else>
          <picker mode="date" fields="month" :value="monthValue" @change="onMonthChange">
            <view class="filter-item filter-item--wide">{{ monthValue }}</view>
          </picker>
          <text class="range-text">{{ rangeLabel }}</text>
        </template>

        <button class="filter-btn" size="mini" @tap="reload">查询</button>
      </view>

      <scroll-view
        scroll-y
        class="list-scroll"
        refresher-enabled
        :refresher-triggered="refreshing"
        @refresherrefresh="onRefresh"
        @scrolltolower="loadMore"
      >
        <view v-if="loading && list.length === 0" class="empty">加载中...</view>
        <view v-else-if="list.length === 0" class="empty">暂无课时记录</view>
        <view v-for="item in list" :key="item.recordId" class="record card" @tap="goDetail(item)">
          <view class="record-head">
            <text class="record-name">{{ item.studentName || '学员' }}</text>
            <text class="record-date">{{ item.classDate }}</text>
          </view>
          <view class="record-meta">
            <text>{{ item.courseTypeName || '课程' }}</text>
            <text>扣 {{ item.classesDeducted ?? '-' }} 节</text>
          </view>
          <view v-if="item.packageName" class="record-pkg">课包：{{ item.packageName }}</view>
          <view v-if="userStore.isAdmin && item.teacherName" class="record-teacher">
            授课：{{ item.teacherName }}
          </view>
        </view>
        <view v-if="hasMore && list.length" class="load-more">{{ loadingMore ? '加载中...' : '上拉加载更多' }}</view>
      </scroll-view>
    </template>

    <template v-else>
      <view v-if="!filterStudentId" class="empty card empty-block">
        请先搜索并选择学员，再查看其课包与上课记录
      </view>
      <scroll-view v-else scroll-y class="pkg-scroll">
        <view v-if="packagesLoading" class="empty">加载课包...</view>
        <view v-else-if="packageList.length === 0" class="empty card empty-block">该学员暂无课包</view>
        <view
          v-for="pkg in packageList"
          :key="pkg.packageId"
          class="pkg card"
          @tap="goPackageRecords(pkg)"
        >
          <view class="pkg-head">
            <text class="pkg-name">{{ pkg.packageName || '—' }}</text>
            <text class="pkg-status">{{ packageStatusLabel(pkg.status) }}</text>
          </view>
          <view class="pkg-meta">
            <text>剩余 {{ formatRemainingClasses(pkg.remainingClasses) }} / {{ formatRemainingClasses(pkg.totalClasses) }} 节</text>
            <text v-if="pkg.purchaseDate">购于 {{ pkg.purchaseDate }}</text>
          </view>
          <view class="pkg-action">查看上课记录 ›</view>
        </view>
      </scroll-view>
    </template>
  </PageShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'
import PageShell from '@/components/PageShell.vue'
import { requireLogin } from '@/stores/user'
import { useUserStore } from '@/stores/user'
import { useStoreRefresh } from '@/composables/useStoreRefresh'
import { attendanceAPI, studentAPI, coursePackageAPI } from '@/api'
import { formatStudentLabel, packageStatusLabel } from '@/utils/format'
import { formatRemainingClasses } from '@/utils/classHours'
import {
  PERIOD_MODES,
  todayStr,
  currentMonthStr,
  getDayRange,
  getWeekRange,
  getMonthRange,
  weekRangeLabel
} from '@/utils/dateRange'

const userStore = useUserStore()
const periodModes = PERIOD_MODES

const listMode = ref('records')
const list = ref([])
const current = ref(1)
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const refreshing = ref(false)
const startDate = ref('')
const endDate = ref('')
const periodMode = ref('month')
const anchorDate = ref(todayStr())
const monthValue = ref(currentMonthStr())

const hasMore = ref(false)
const filterStudentId = ref(null)
const filterPackageId = ref(null)

const studentScope = ref('mine')
const studentKeyword = ref('')
const studentOptions = ref([])
const studentLabel = ref('')

const packageOptions = ref([])
const packageList = ref([])
const packagesLoading = ref(false)

const listTitle = computed(() => (userStore.isTeacher ? '我的课时' : '课时管理'))

const rangeLabel = computed(() => {
  if (!startDate.value || !endDate.value) return ''
  if (periodMode.value === 'day') return startDate.value
  return weekRangeLabel(startDate.value, endDate.value)
})

const packagePickerRange = computed(() => [
  { value: null, label: '全部课包' },
  ...packageOptions.value
])

const packageFilterLabel = computed(() => {
  if (!filterPackageId.value) return '全部课包'
  const hit = packageOptions.value.find((p) => p.value === filterPackageId.value)
  return hit?.label || '已选课包'
})

function applyPeriodRange() {
  if (periodMode.value === 'day') {
    const r = getDayRange(anchorDate.value)
    startDate.value = r.startDate
    endDate.value = r.endDate
    return
  }
  if (periodMode.value === 'week') {
    const r = getWeekRange(anchorDate.value)
    startDate.value = r.startDate
    endDate.value = r.endDate
    return
  }
  const r = getMonthRange(monthValue.value)
  startDate.value = r.startDate
  endDate.value = r.endDate
}

function initPeriodDefaults() {
  anchorDate.value = todayStr()
  monthValue.value = currentMonthStr()
  applyPeriodRange()
}

async function loadPackagesForStudent(studentId) {
  packageOptions.value = []
  packageList.value = []
  filterPackageId.value = null
  if (!studentId) return
  packagesLoading.value = true
  try {
    const pkgs = await coursePackageAPI.getByStudent(studentId)
    packageList.value = pkgs || []
    packageOptions.value = (pkgs || []).map((p) => ({
      value: p.packageId,
      label: `${p.packageName || '课包'}（剩 ${formatRemainingClasses(p.remainingClasses)} 节）`
    }))
  } catch {
    uni.showToast({ title: '课包加载失败', icon: 'none' })
  } finally {
    packagesLoading.value = false
  }
}

async function prefillStudent(studentId) {
  try {
    const s = await studentAPI.getById(studentId)
    if (!s) return
    filterStudentId.value = s.studentId
    studentLabel.value = formatStudentLabel(s)
    await loadPackagesForStudent(s.studentId)
  } catch {
    filterStudentId.value = studentId
  }
}

onLoad((query) => {
  if (query.studentId) {
    const sid = Number(query.studentId) || query.studentId
    prefillStudent(sid)
  }
  if (query.mode === 'packages') listMode.value = 'packages'
})

onShow(() => {
  if (!requireLogin()) return
  if (!startDate.value) initPeriodDefaults()
  if (listMode.value === 'records') reload()
})

useStoreRefresh(() => {
  if (!startDate.value) initPeriodDefaults()
  if (filterStudentId.value) loadPackagesForStudent(filterStudentId.value)
  return listMode.value === 'records' ? reload() : Promise.resolve()
})

function setListMode(mode) {
  if (listMode.value === mode) return
  listMode.value = mode
  if (mode === 'packages' && filterStudentId.value) {
    loadPackagesForStudent(filterStudentId.value)
  }
  if (mode === 'records') reload()
}

function onStudentScopeChange(scope) {
  if (scope === studentScope.value) return
  studentScope.value = scope
  studentOptions.value = []
  if ((studentKeyword.value || '').trim()) searchStudents()
}

async function searchStudents() {
  const keyword = (studentKeyword.value || '').trim()
  if (!keyword) {
    uni.showToast({ title: '请输入关键字', icon: 'none' })
    return
  }
  try {
    const listRes = await studentAPI.search(keyword, studentScope.value)
    studentOptions.value = (listRes || []).map((s) => ({
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

function onStudentPick(e) {
  const idx = Number(e.detail.value)
  const picked = studentOptions.value[idx]
  if (!picked) return
  filterStudentId.value = picked.value
  studentLabel.value = picked.label
  filterPackageId.value = null
  loadPackagesForStudent(picked.value)
  if (listMode.value === 'records') reload()
}

function clearStudent() {
  filterStudentId.value = null
  filterPackageId.value = null
  studentLabel.value = ''
  studentOptions.value = []
  studentKeyword.value = ''
  packageOptions.value = []
  packageList.value = []
  if (listMode.value === 'records') reload()
}

function onPackageFilterPick(e) {
  const idx = Number(e.detail.value)
  const picked = packagePickerRange.value[idx]
  filterPackageId.value = picked?.value ?? null
  reload()
}

function setPeriodMode(key) {
  if (periodMode.value === key) return
  periodMode.value = key
  applyPeriodRange()
  reload()
}

function onAnchorChange(e) {
  anchorDate.value = e.detail.value
  applyPeriodRange()
}

function onMonthChange(e) {
  monthValue.value = e.detail.value.slice(0, 7)
  applyPeriodRange()
}

async function fetchPage(page, append) {
  const params = {
    current: page,
    size: 15,
    startDate: startDate.value,
    endDate: endDate.value,
    sortBy: 'classDate'
  }
  if (filterStudentId.value) params.studentId = filterStudentId.value
  if (filterPackageId.value) {
    params.packageId = filterPackageId.value
    params.includeCareEvening = true
  }
  if (userStore.isTeacher && userStore.userInfo?.teacherId) {
    params.teacherId = userStore.userInfo.teacherId
  }
  const data = await attendanceAPI.getPage(params)
  const records = data?.records || data?.rows || []
  total.value = data?.total ?? 0
  if (append) {
    list.value = list.value.concat(records)
  } else {
    list.value = records
  }
  hasMore.value = list.value.length < total.value
}

async function reload() {
  applyPeriodRange()
  loading.value = true
  current.value = 1
  try {
    await fetchPage(1, false)
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  current.value += 1
  try {
    await fetchPage(current.value, true)
  } catch {
    current.value -= 1
  } finally {
    loadingMore.value = false
  }
}

async function onRefresh() {
  refreshing.value = true
  await reload()
  refreshing.value = false
}

function goDetail(item) {
  uni.navigateTo({ url: `/pages/attendance/detail?id=${item.recordId}` })
}

function goPackageRecords(pkg) {
  const name = encodeURIComponent(studentLabel.value || pkg.studentName || '')
  uni.navigateTo({
    url: `/pages/students/package-records?packageId=${pkg.packageId}&studentName=${name}`
  })
}
</script>

<style lang="scss" scoped>
.card {
  background: var(--canvas);
  border-radius: var(--radius-md);
  border: 1rpx solid var(--hairline);
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.filter-hint {
  font-size: 24rpx;
  color: var(--primary);
  margin-bottom: 12rpx;
  padding: 0 8rpx;
}

.main-tabs {
  display: flex;
  gap: 12rpx;
  padding: 12rpx 16rpx;
}

.main-tab {
  flex: 1;
  text-align: center;
  padding: 16rpx 0;
  font-size: 28rpx;
  color: var(--text-muted);
  background: var(--bg-page);
  border-radius: var(--radius-sm);
}

.main-tab.active {
  color: #fff;
  background: var(--primary);
  font-weight: 600;
}

.student-filter-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.student-filter-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-ink);
}

.student-clear {
  font-size: 24rpx;
  color: var(--primary);
}

.scope-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.scope-chip {
  padding: 8rpx 20rpx;
  font-size: 24rpx;
  border-radius: 999rpx;
  background: var(--bg-page);
  color: var(--text-muted);
}

.scope-chip.active {
  background: rgba(243, 112, 33, 0.12);
  color: var(--primary);
  font-weight: 600;
}

.search-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.search-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  background: var(--bg-page);
  border-radius: var(--radius-sm);
}

.search-btn {
  background: var(--primary);
  color: #fff;
}

.student-picked {
  font-size: 28rpx;
  color: var(--text-ink);
  padding: 12rpx 0;
}

.student-hint {
  font-size: 24rpx;
  color: var(--text-muted);
}

.pkg-filter {
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-size: 26rpx;
}

.pkg-filter-label {
  color: var(--text-muted);
  flex-shrink: 0;
}

.pkg-filter-value {
  flex: 1;
  padding: 12rpx 16rpx;
  background: var(--bg-page);
  border-radius: var(--radius-sm);
}

.period-tabs {
  display: flex;
  gap: 12rpx;
  padding: 16rpx 20rpx;
}

.period-tab {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  font-size: 26rpx;
  color: var(--text-muted);
  background: var(--bg-page);
  border-radius: var(--radius-sm);
}

.period-tab.active {
  color: #fff;
  background: var(--primary);
  font-weight: 600;
}

.filter {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12rpx;
  font-size: 24rpx;
}

.filter-item {
  padding: 12rpx 20rpx;
  background: var(--bg-page);
  border-radius: var(--radius-sm);
}

.filter-item--wide {
  min-width: 200rpx;
}

.range-text {
  flex: 1;
  min-width: 100%;
  font-size: 22rpx;
  color: var(--text-muted);
}

.filter-btn {
  margin-left: auto;
  background: var(--primary);
  color: #fff;
}

.list-scroll {
  height: calc(100vh - 720rpx);
  min-height: 320rpx;
}

.pkg-scroll {
  height: calc(100vh - 520rpx);
  min-height: 400rpx;
}

.record-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.record-name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-ink);
}

.record-date {
  font-size: 24rpx;
  color: var(--text-muted);
}

.record-meta {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: var(--text-muted);
}

.record-pkg {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--text-muted);
}

.record-teacher {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--text-muted);
}

.pkg-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.pkg-name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-ink);
  flex: 1;
}

.pkg-status {
  font-size: 22rpx;
  color: var(--primary);
}

.pkg-meta {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  font-size: 24rpx;
  color: var(--text-muted);
  margin-bottom: 12rpx;
}

.pkg-action {
  font-size: 26rpx;
  color: var(--primary);
  font-weight: 500;
}

.empty,
.load-more {
  text-align: center;
  padding: 40rpx;
  color: var(--text-muted);
  font-size: 26rpx;
}

.empty-block {
  margin-top: 8rpx;
}
</style>
