<template>
  <PageShell title="课时列表" :tab-bar="true" tab-active="attendance">
    <view v-if="userStore.isAdmin" class="entry-wrap">
      <KindTabs kind="art" page="list" />
    </view>
    <view class="filter-card">
      <!-- 时间 -->
      <view class="block block--time">
        <view class="seg">
          <view
            v-for="m in periodModes"
            :key="m.key"
            class="seg-item"
            :class="{ active: periodMode === m.key }"
            @tap="setPeriodMode(m.key)"
          >{{ m.label }}</view>
        </view>

        <view class="date-nav">
          <view class="nav-arrow" hover-class="nav-arrow--hover" @tap="shiftPeriod(-1)">‹</view>
          <picker
            v-if="periodMode === 'month'"
            class="date-picker"
            mode="date"
            fields="month"
            :value="monthValue"
            @change="onMonthChange"
          >
            <view class="date-main">
              <text class="date-title">{{ dateTitle }}</text>
              <text class="date-sub">{{ dateSub }}</text>
            </view>
          </picker>
          <picker v-else class="date-picker" mode="date" :value="anchorDate" @change="onAnchorChange">
            <view class="date-main">
              <text class="date-title">{{ dateTitle }}</text>
              <text class="date-sub">{{ dateSub }}</text>
            </view>
          </picker>
          <view class="nav-arrow" hover-class="nav-arrow--hover" @tap="shiftPeriod(1)">›</view>
        </view>

        <view class="date-foot">
          <text class="date-count">
            <text v-if="loading && !list.length">查询中…</text>
            <text v-else>共 <text class="date-count-num">{{ total }}</text> 条记录</text>
          </text>
          <text v-if="!isCurrentPeriod" class="date-now" @tap="backToCurrent">回到{{ currentLabel }}</text>
        </view>
      </view>

      <view class="divider" />

      <!-- 学员 -->
      <view class="block block--student">
        <view v-if="filterStudentId" class="picked">
          <view class="picked-chip">
            <text class="picked-name">{{ studentLabel }}</text>
            <text class="picked-x" @tap="clearStudent">×</text>
          </view>
          <picker v-if="packageOptions.length" :range="packagePickerRange" range-key="label" @change="onPackageFilterPick">
            <view class="pkg-chip" :class="{ on: filterPackageId }">
              <text class="pkg-chip-text">{{ packageFilterLabel }}</text>
              <text class="pkg-chip-arrow">▾</text>
            </view>
          </picker>
        </view>

        <view v-else class="search">
          <input
            v-model="studentKeyword"
            class="search-input"
            placeholder="搜索学员：姓名 / 小名 / 拼音首字母"
            placeholder-class="search-ph"
            confirm-type="search"
            @input="onStudentKeywordInput"
            @confirm="searchStudents"
          />
          <view v-if="studentKeyword" class="search-clear" @tap="resetSearch">×</view>
          <view class="search-go" hover-class="search-go--hover" @tap="searchStudents">
            {{ studentSearching ? '…' : '搜索' }}
          </view>
        </view>

        <view v-if="!filterStudentId && studentOptions.length" class="results">
          <view
            v-for="opt in studentOptions"
            :key="opt.value"
            class="result"
            hover-class="result--hover"
            @tap="applyStudent(opt)"
          >
            <text class="result-name">{{ opt.label }}</text>
            <text v-if="opt.storeName" class="result-store">{{ opt.storeName }}</text>
          </view>
        </view>
        <view v-else-if="!filterStudentId && !studentKeyword" class="hint">
          不选学员时，显示{{ userStore.isTeacher ? '我录入的' : '本店全部' }}课时
        </view>
      </view>
    </view>

    <!-- 列表 -->
    <view v-if="loading && list.length === 0" class="state">
      <view class="skeleton" v-for="n in 3" :key="n" />
    </view>
    <view v-else-if="list.length === 0" class="state state--empty">
      <view class="empty-mark">课</view>
      <text class="empty-title">这个范围内还没有课时记录</text>
      <text class="empty-sub">换个日期，或清除学员筛选试试</text>
      <view class="empty-actions">
        <view v-if="filterStudentId" class="empty-btn" @tap="clearStudent">清除学员</view>
        <view v-if="!isCurrentPeriod" class="empty-btn empty-btn--primary" @tap="backToCurrent">回到{{ currentLabel }}</view>
        <view v-if="isCurrentPeriod && !filterStudentId" class="empty-btn empty-btn--primary" @tap="goForm">去录入课时</view>
      </view>
    </view>

    <template v-else>
      <view v-for="group in groups" :key="group.date" class="group">
        <view class="group-head">
          <text class="group-date">{{ group.label }}</text>
          <text class="group-count">{{ group.items.length }} 节</text>
        </view>
        <view
          v-for="item in group.items"
          :key="item.recordId"
          class="record"
          :class="'record--' + (item.lessonType || 'regular')"
          hover-class="record--hover"
          @tap="goDetail(item)"
        >
          <view class="record-head">
            <text class="record-name">{{ item.studentName || '学员' }}</text>
            <text class="record-tag" :class="'record-tag--' + (item.lessonType || 'regular')">{{ lessonTypeLabel(item.lessonType) }}</text>
            <text class="record-arrow">›</text>
          </view>
          <view class="record-meta">
            <text class="record-course">{{ item.courseTypeName || '未填课程类型' }}</text>
            <text v-if="item.lessonType !== 'temp'" class="record-deduct">扣 {{ formatClassHours(item.classesDeducted) }} 节</text>
            <text v-else-if="item.income != null" class="record-deduct">¥{{ item.income }}</text>
          </view>
          <view v-if="item.packageName || item.coursewareName" class="record-extra">
            <text v-if="item.packageName" class="extra-item">课包 {{ item.packageName }}</text>
            <text v-if="item.coursewareName" class="extra-item">课件 {{ item.coursewareName }}</text>
          </view>
        </view>
      </view>
      <view v-if="hasMore" class="load-more">{{ loadingMore ? '加载中…' : '上拉加载更多' }}</view>
      <view v-else class="load-more load-more--end">已显示全部</view>
    </template>
  </PageShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onLoad, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import PageShell from '@/components/PageShell.vue'
import KindTabs from '@/components/KindTabs.vue'
import { requireLogin } from '@/stores/user'
import { useUserStore } from '@/stores/user'
import { useStoreRefresh } from '@/composables/useStoreRefresh'
import { attendanceAPI, studentAPI, coursePackageAPI } from '@/api'
import { formatStudentLabel } from '@/utils/format'
import { formatRemainingClasses, formatClassHours } from '@/utils/classHours'
import {
  PERIOD_MODES,
  todayStr,
  currentMonthStr,
  getDayRange,
  getWeekRange,
  getMonthRange,
  formatDate
} from '@/utils/dateRange'
import { labelOf as lessonTypeLabel } from '@/utils/lessonType'

const userStore = useUserStore()
const periodModes = PERIOD_MODES
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const list = ref([])
const current = ref(1)
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const startDate = ref('')
const endDate = ref('')
const periodMode = ref('month')
const anchorDate = ref(todayStr())
const monthValue = ref(currentMonthStr())

const hasMore = ref(false)
const filterStudentId = ref(null)
const filterPackageId = ref(null)

/** 搜索学员默认范围：全部学员 */
const studentScope = 'all'
const studentKeyword = ref('')
const studentOptions = ref([])
const studentLabel = ref('')
const studentSearching = ref(false)
let searchTimer = null
let reloadSeq = 0

const packageOptions = ref([])

const packagePickerRange = computed(() => [
  { value: null, label: '全部课包' },
  ...packageOptions.value
])

const packageFilterLabel = computed(() => {
  if (!filterPackageId.value) return '全部课包'
  const hit = packageOptions.value.find((p) => p.value === filterPackageId.value)
  return hit?.label || '已选课包'
})

function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return WEEK[new Date(y, m - 1, d).getDay()]
}

function shortDate(dateStr) {
  return dateStr ? dateStr.slice(5) : ''
}

const dateTitle = computed(() => {
  if (periodMode.value === 'day') return anchorDate.value
  if (periodMode.value === 'week') return `${shortDate(startDate.value)} ~ ${shortDate(endDate.value)}`
  const [y, m] = monthValue.value.split('-')
  return `${y} 年 ${Number(m)} 月`
})

const dateSub = computed(() => {
  if (periodMode.value === 'day') return `${weekdayOf(anchorDate.value)} · 点击选择日期`
  if (periodMode.value === 'week') return '本周一至周日 · 点击选择'
  return `${shortDate(startDate.value)} ~ ${shortDate(endDate.value)} · 点击选择月份`
})

const currentLabel = computed(() => ({ day: '今天', week: '本周', month: '本月' }[periodMode.value]))

const isCurrentPeriod = computed(() => {
  if (periodMode.value === 'month') return monthValue.value === currentMonthStr()
  if (periodMode.value === 'week') return startDate.value === getWeekRange(todayStr()).startDate
  return anchorDate.value === todayStr()
})

/** 按上课日期分组，日期倒序沿用接口顺序 */
const groups = computed(() => {
  const out = []
  for (const item of list.value) {
    const date = item.classDate || ''
    const last = out[out.length - 1]
    if (last && last.date === date) {
      last.items.push(item)
    } else {
      out.push({
        date,
        label: date ? `${shortDate(date)} ${weekdayOf(date)}` : '未填日期',
        items: [item]
      })
    }
  }
  return out
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

function mapStudentOption(s) {
  return {
    value: s.studentId,
    label: formatStudentLabel(s),
    storeName: s.storeName || ''
  }
}

async function loadPackagesForStudent(studentId) {
  packageOptions.value = []
  filterPackageId.value = null
  if (!studentId) return
  try {
    const pkgs = await coursePackageAPI.getByStudent(studentId)
    packageOptions.value = (pkgs || []).map((p) => ({
      value: p.packageId,
      label: `${p.packageName || '课包'}（剩 ${formatRemainingClasses(p.remainingClasses)} 节）`
    }))
  } catch {
    packageOptions.value = []
  }
}

async function prefillStudent(studentId) {
  try {
    const s = await studentAPI.getById(studentId)
    if (!s) return
    applyStudent(mapStudentOption(s), { skipReload: false })
  } catch {
    filterStudentId.value = studentId
  }
}

onLoad((query) => {
  if (query.studentId) {
    const sid = Number(query.studentId) || query.studentId
    prefillStudent(sid)
  }
})

onShow(() => {
  if (!requireLogin()) return
  if (!startDate.value) initPeriodDefaults()
  reload()
})

useStoreRefresh(() => {
  if (!startDate.value) initPeriodDefaults()
  if (filterStudentId.value) loadPackagesForStudent(filterStudentId.value)
  return reload()
})

onReachBottom(() => {
  loadMore()
})

onPullDownRefresh(async () => {
  await reload()
  uni.stopPullDownRefresh()
})

function onStudentKeywordInput() {
  if (searchTimer) clearTimeout(searchTimer)
  const kw = (studentKeyword.value || '').trim()
  if (!kw) {
    studentOptions.value = []
    return
  }
  searchTimer = setTimeout(() => {
    searchStudents({ silent: true })
  }, 400)
}

function resetSearch() {
  studentKeyword.value = ''
  studentOptions.value = []
}

async function searchStudents(opts = {}) {
  const silent = opts && opts.silent === true
  const keyword = (studentKeyword.value || '').trim()
  if (!keyword) {
    if (!silent) uni.showToast({ title: '请输入姓名或首字母', icon: 'none' })
    return
  }
  studentSearching.value = true
  try {
    let rows = await studentAPI.search(keyword, studentScope)
    if (!rows?.length) {
      const page = await studentAPI.getPage({
        current: 1,
        size: 40,
        name: keyword
      })
      rows = page?.records || []
    }
    // 输入已被清空或改动时，丢弃过期结果
    if ((studentKeyword.value || '').trim() !== keyword) return
    studentOptions.value = (rows || []).map(mapStudentOption)
    if (studentOptions.value.length === 1) {
      applyStudent(studentOptions.value[0])
      return
    }
    if (!studentOptions.value.length) {
      uni.showToast({
        title: '未找到学员，请检查姓名、拼音首字母或当前店铺',
        icon: 'none',
        duration: 2500
      })
    }
  } catch (e) {
    if (!silent) uni.showToast({ title: e.message || '搜索失败', icon: 'none' })
  } finally {
    studentSearching.value = false
  }
}

function applyStudent(opt, { skipReload = false } = {}) {
  if (!opt?.value) return
  filterStudentId.value = opt.value
  studentLabel.value = opt.label
  studentOptions.value = []
  studentKeyword.value = ''
  filterPackageId.value = null
  loadPackagesForStudent(opt.value)
  if (!skipReload) reload()
}

function clearStudent() {
  filterStudentId.value = null
  filterPackageId.value = null
  studentLabel.value = ''
  studentOptions.value = []
  studentKeyword.value = ''
  packageOptions.value = []
  reload()
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
  reload()
}

function onMonthChange(e) {
  monthValue.value = e.detail.value.slice(0, 7)
  reload()
}

function shiftPeriod(dir) {
  if (periodMode.value === 'month') {
    const [y, m] = monthValue.value.split('-').map(Number)
    const d = new Date(y, m - 1 + dir, 1)
    monthValue.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  } else {
    const [y, m, day] = anchorDate.value.split('-').map(Number)
    const step = periodMode.value === 'week' ? 7 : 1
    anchorDate.value = formatDate(new Date(y, m - 1, day + dir * step))
  }
  reload()
}

function backToCurrent() {
  anchorDate.value = todayStr()
  monthValue.value = currentMonthStr()
  reload()
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
  const seq = ++reloadSeq
  loading.value = true
  current.value = 1
  try {
    await fetchPage(1, false)
  } catch (e) {
    if (seq === reloadSeq) uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    if (seq === reloadSeq) loading.value = false
  }
}

async function loadMore() {
  if (loading.value || loadingMore.value || !hasMore.value) return
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

function goDetail(item) {
  uni.navigateTo({ url: `/pages/attendance/detail?id=${item.recordId}` })
}

function goForm() {
  uni.navigateTo({ url: '/pages/attendance/form' })
}
</script>

<style lang="scss" scoped>
$ink: #2a241f;
$muted: #8a8178;
$line: #efe9e2;
$orange: #f37021;
$blue: #2f6bff;

/* 筛选卡：一张白卡，两个模块用小色块区分 */
.entry-wrap {
  display: flex;
  margin-bottom: 20rpx;
}

.filter-card {
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 8rpx 32rpx rgba(42, 36, 31, 0.06);
  overflow: hidden;
  margin-bottom: 24rpx;
}

.block {
  position: relative;
  padding: 24rpx 24rpx 24rpx 32rpx;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 24rpx;
    bottom: 24rpx;
    width: 8rpx;
    border-radius: 0 8rpx 8rpx 0;
  }
}

.block--time {
  background: linear-gradient(180deg, #f5f8ff 0%, #fff 70%);
  &::before { background: $blue; }
}

.block--student {
  background: linear-gradient(180deg, #fff7f1 0%, #fff 70%);
  &::before { background: $orange; }
}

.divider {
  height: 1rpx;
  background: $line;
}

/* 分段控件 */
.seg {
  display: flex;
  padding: 6rpx;
  background: #e9eefb;
  border-radius: 20rpx;
}

.seg-item {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  font-size: 26rpx;
  color: #5b6b91;
  border-radius: 16rpx;
  transition: all 0.2s;
}

.seg-item.active {
  background: #fff;
  color: $blue;
  font-weight: 700;
  box-shadow: 0 4rpx 12rpx rgba(47, 107, 255, 0.18);
}

/* 日期导航 */
.date-nav {
  display: flex;
  align-items: stretch;
  gap: 12rpx;
  margin-top: 20rpx;
}

.nav-arrow {
  width: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
  line-height: 1;
  color: $blue;
  background: #fff;
  border: 1rpx solid #dbe5ff;
  border-radius: 20rpx;
}

.nav-arrow--hover {
  background: #e9eefb;
}

.date-picker {
  flex: 1;
  min-width: 0;
}

.date-main {
  height: 100%;
  padding: 16rpx 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  background: #fff;
  border: 1rpx solid #dbe5ff;
  border-radius: 20rpx;
}

.date-title {
  font-size: 34rpx;
  font-weight: 700;
  color: $ink;
}

.date-sub {
  font-size: 22rpx;
  color: $muted;
}

.date-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
  font-size: 24rpx;
  color: $muted;
}

.date-count-num {
  color: $blue;
  font-weight: 700;
  font-size: 30rpx;
  padding: 0 4rpx;
}

.date-now {
  color: $blue;
  font-weight: 600;
  padding: 6rpx 8rpx;
}

/* 学员 */
.scope {
  display: inline-flex;
  gap: 12rpx;
}

.scope-item {
  padding: 8rpx 22rpx;
  font-size: 24rpx;
  border-radius: 999rpx;
  color: $muted;
  background: #fff;
  border: 1rpx solid $line;
}

.scope-item.active {
  color: $orange;
  border-color: rgba(243, 112, 33, 0.4);
  background: rgba(243, 112, 33, 0.1);
  font-weight: 600;
}

.search {
  position: relative;
  display: flex;
  align-items: center;
  margin-top: 18rpx;
  height: 84rpx;
  padding: 0 8rpx 0 24rpx;
  background: #fff;
  border: 2rpx solid #f3d9c7;
  border-radius: 999rpx;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  font-size: 27rpx;
  color: $ink;
}

.search-ph {
  color: #b7aea4;
  font-size: 26rpx;
}

.search-clear {
  width: 48rpx;
  height: 48rpx;
  line-height: 44rpx;
  text-align: center;
  font-size: 34rpx;
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

.search-go--hover {
  opacity: 0.85;
}

.results {
  margin-top: 14rpx;
  max-height: 360rpx;
  overflow-y: auto;
  background: #fff;
  border: 1rpx solid $line;
  border-radius: 20rpx;
}

.result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  padding: 22rpx 24rpx;
  border-bottom: 1rpx solid $line;
}

.result:last-child { border-bottom: none; }
.result--hover { background: #fff3ea; }

.result-name {
  font-size: 28rpx;
  color: $ink;
  font-weight: 500;
}

.result-store {
  flex-shrink: 0;
  font-size: 22rpx;
  color: $orange;
  background: rgba(243, 112, 33, 0.1);
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}

.hint {
  margin-top: 14rpx;
  font-size: 22rpx;
  color: $muted;
}

.picked {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 18rpx;
}

.picked-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 10rpx 10rpx 10rpx 24rpx;
  color: #fff;
  background: $orange;
  border-radius: 999rpx;
}

.picked-name {
  font-size: 26rpx;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picked-x {
  margin-left: 12rpx;
  width: 44rpx;
  height: 44rpx;
  line-height: 42rpx;
  text-align: center;
  font-size: 32rpx;
  background: rgba(255, 255, 255, 0.28);
  border-radius: 50%;
}

.pkg-chip {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  max-width: 100%;
  padding: 12rpx 22rpx;
  font-size: 24rpx;
  color: #0e7c7c;
  background: #e6f6f6;
  border: 1rpx solid #b9e4e4;
  border-radius: 999rpx;
}

.pkg-chip.on {
  background: #13a8a8;
  border-color: #13a8a8;
  color: #fff;
}

.pkg-chip-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pkg-chip-arrow { font-size: 20rpx; }

/* 分组与记录 */
.group { margin-bottom: 8rpx; }

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 8rpx 14rpx;
}

.group-date {
  font-size: 28rpx;
  font-weight: 700;
  color: $ink;
}

.group-count {
  font-size: 22rpx;
  color: $muted;
}

.record {
  position: relative;
  margin-bottom: 16rpx;
  padding: 24rpx 24rpx 24rpx 32rpx;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 6rpx 24rpx rgba(42, 36, 31, 0.05);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 8rpx;
    background: #3d7dff;
  }
}

.record--hover { background: #fbf8f5; }
.record--trial::before { background: #1aa6a6; }
.record--gift::before { background: #4c9a2a; }
.record--temp::before { background: #e07a1a; }
.record--renewal_pending::before { background: #7a45c9; }

.record-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.record-name {
  min-width: 0;
  font-size: 32rpx;
  font-weight: 700;
  color: $ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-tag {
  flex-shrink: 0;
  font-size: 21rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  color: #3d7dff;
  background: rgba(61, 125, 255, 0.12);
}

.record-tag--trial { color: #0e8a8a; background: rgba(26, 166, 166, 0.14); }
.record-tag--gift { color: #3b7d1f; background: rgba(76, 154, 42, 0.14); }
.record-tag--temp { color: #b85f0c; background: rgba(224, 122, 26, 0.14); }
.record-tag--renewal_pending { color: #6533b3; background: rgba(122, 69, 201, 0.14); }

.record-arrow {
  margin-left: auto;
  font-size: 40rpx;
  line-height: 1;
  color: #cfc6bc;
}

.record-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: 14rpx;
}

.record-course {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  color: #5c534b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-deduct {
  flex-shrink: 0;
  font-size: 26rpx;
  font-weight: 700;
  color: $orange;
}

.record-extra {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 14rpx;
}

.extra-item {
  max-width: 100%;
  font-size: 22rpx;
  color: $muted;
  padding: 4rpx 14rpx;
  background: #f6f2ed;
  border-radius: 10rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 状态 */
.state { padding-top: 8rpx; }

.skeleton {
  height: 156rpx;
  margin-bottom: 16rpx;
  border-radius: 24rpx;
  background: linear-gradient(90deg, #f1ebe4 25%, #f8f4ef 37%, #f1ebe4 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}

@keyframes shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

.state--empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56rpx 40rpx 24rpx;
}

.empty-mark {
  width: 120rpx;
  height: 120rpx;
  line-height: 120rpx;
  text-align: center;
  font-size: 52rpx;
  font-weight: 700;
  color: $orange;
  background: rgba(243, 112, 33, 0.1);
  border-radius: 36rpx;
}

.empty-title {
  margin-top: 28rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: $ink;
}

.empty-sub {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: $muted;
}

.empty-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 32rpx;
}

.empty-btn {
  padding: 16rpx 34rpx;
  font-size: 26rpx;
  color: #5c534b;
  background: #fff;
  border: 1rpx solid $line;
  border-radius: 999rpx;
}

.empty-btn--primary {
  color: #fff;
  background: $orange;
  border-color: $orange;
  font-weight: 600;
}

.load-more {
  text-align: center;
  padding: 24rpx 0 8rpx;
  font-size: 24rpx;
  color: $muted;
}

.load-more--end { color: #c2b9af; }
</style>
