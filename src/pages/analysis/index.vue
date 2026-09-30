<template>
  <PageShell title="数据分析" :tab-bar="true" tab-active="analysis" :show-back="false">
    <StoreSwitcher v-if="userStore.isAdmin" />

    <!-- 课时统计 -->
    <view class="stat-card">
      <view class="stat-head">
        <text class="stat-title">课时统计</text>
        <text class="stat-date">{{ todayText }}</text>
      </view>

      <view v-if="userStore.isAdmin" class="kind-seg">
        <view
          v-for="k in kindModes"
          :key="k.key"
          class="kind-item"
          :class="['kind-item--' + k.key, { active: kind === k.key }]"
          @tap="setKind(k.key)"
        >{{ k.label }}</view>
      </view>

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
            <text class="date-sub">点击选择月份</text>
          </view>
        </picker>
        <picker v-else class="date-picker" mode="date" :value="anchorDate" @change="onAnchorChange">
          <view class="date-main">
            <text class="date-title">{{ dateTitle }}</text>
            <text class="date-sub">{{ periodMode === 'day' ? weekdayOf(anchorDate) + ' · ' : '周一至周日 · ' }}点击选择</text>
          </view>
        </picker>
        <view class="nav-arrow" hover-class="nav-arrow--hover" @tap="shiftPeriod(1)">›</view>
      </view>

      <view class="sum-grid" :class="'sum-grid--' + kind">
        <view class="sum-cell">
          <text class="sum-val">{{ bucket.classes }}</text>
          <text class="sum-label">课时数</text>
        </view>
        <view class="sum-cell sum-cell--money">
          <text class="sum-val">{{ bucket.income }}</text>
          <text class="sum-label">金额</text>
        </view>
        <view class="sum-cell">
          <text class="sum-val">{{ bucket.records }}</text>
          <text class="sum-label">记录数</text>
        </view>
        <view class="sum-cell">
          <text class="sum-val">{{ bucket.students }}</text>
          <text class="sum-label">学员数</text>
        </view>
      </view>

      <view v-if="kind === 'all' && userStore.isAdmin" class="split">
        <text class="split-art">美术 {{ artClassesText }} · {{ artIncomeText }}</text>
        <text class="split-care">晚托 {{ careClassesText }} · {{ careIncomeText }}</text>
      </view>

      <view v-if="periodMode !== 'day'" class="chart">
        <view v-for="bar in bars" :key="bar.date" class="bar-col">
          <view class="bar-stack" :style="{ height: chartHeight + 'rpx' }">
            <view v-if="bar.care > 0" class="bar bar--care" :style="{ height: bar.careH + 'rpx' }" />
            <view v-if="bar.art > 0" class="bar bar--art" :style="{ height: bar.artH + 'rpx' }" />
          </view>
          <text class="bar-label">{{ bar.label }}</text>
        </view>
      </view>
      <view v-if="periodMode !== 'day'" class="legend">
        <text v-if="kind !== 'care'" class="legend-item"><text class="dot dot--art" />美术</text>
        <text v-if="kind !== 'art' && userStore.isAdmin" class="legend-item"><text class="dot dot--care" />晚托</text>
      </view>
      <view v-if="statLoading" class="stat-loading">统计中…</view>
    </view>

    <!-- 美术课时 -->
    <view v-if="userStore.isTeacher || showAdminStats" class="sec sec--art" hover-class="sec--hover" @tap="goAttendance">
      <view class="tag tag--art">
        <text>美术课时 · {{ userStore.isTeacher ? '本月' : '本周' }}</text>
        <text class="go">查看记录 ›</text>
      </view>
      <view v-if="userStore.isTeacher" class="grid">
        <view class="cell">
          <text class="val">{{ monthClassHours }}</text>
          <text class="label">本月课时</text>
        </view>
        <view class="cell">
          <text class="val">{{ recordTotal }}</text>
          <text class="label">记录总数</text>
        </view>
      </view>
      <view v-else class="grid">
        <view class="cell">
          <text class="val">{{ adminStats.totalCount }}</text>
          <text class="label">本周课时</text>
        </view>
        <view class="cell">
          <text class="val">{{ adminStats.distinctStudents }}</text>
          <text class="label">上课学员</text>
        </view>
        <view class="cell cell--warn">
          <text class="val">{{ adminStats.feeOverdue }}</text>
          <text class="label">待续费</text>
        </view>
      </view>
    </view>

    <view v-if="userStore.isPrivilegedAdmin" class="admin-hint">
      超级管理员：门店美术统计与财务报表请在 PC 后台查看
    </view>

    <view class="foot">下拉刷新数据</view>
  </PageShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import PageShell from '@/components/PageShell.vue'
import StoreSwitcher from '@/components/StoreSwitcher.vue'
import { useUserStore, requireLogin } from '@/stores/user'
import { useStoreRefresh } from '@/composables/useStoreRefresh'
import { attendanceAPI, dashboardAPI } from '@/api'
import { formatClassHours } from '@/utils/classHours'
import { formatMoney } from '@/utils/format'
import {
  PERIOD_MODES,
  todayStr,
  currentMonthStr,
  getDayRange,
  getWeekRange,
  getMonthRange,
  formatDate
} from '@/utils/dateRange'

const userStore = useUserStore()

// —— 课时统计：全部 / 美术 / 晚托 × 按日 / 按周 / 按月 ——
const kindModes = [
  { key: 'all', label: '全部' },
  { key: 'art', label: '美术' },
  { key: 'care', label: '晚托' }
]
const periodModes = PERIOD_MODES
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const chartHeight = 200

const kind = ref(userStore.isAdmin ? 'all' : 'art')
const periodMode = ref('week')
const anchorDate = ref(todayStr())
const monthValue = ref(currentMonthStr())
const statLoading = ref(false)
const emptyBucket = () => ({ classes: 0, income: 0, records: 0, students: 0 })
const summary = ref({ all: emptyBucket(), art: emptyBucket(), care: emptyBucket(), rows: [] })

function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return WEEK[new Date(y, m - 1, d).getDay()]
}

function currentRange() {
  if (periodMode.value === 'day') return getDayRange(anchorDate.value)
  if (periodMode.value === 'week') return getWeekRange(anchorDate.value)
  return getMonthRange(monthValue.value)
}

const dateTitle = computed(() => {
  if (periodMode.value === 'day') return anchorDate.value
  if (periodMode.value === 'month') {
    const [y, m] = monthValue.value.split('-')
    return `${y} 年 ${Number(m)} 月`
  }
  const r = getWeekRange(anchorDate.value)
  return `${r.startDate.slice(5)} ~ ${r.endDate.slice(5)}`
})

const bucket = computed(() => {
  const b = summary.value[kind.value] || emptyBucket()
  return {
    classes: formatClassHours(b.classes),
    income: formatMoney(b.income),
    records: b.records ?? 0,
    students: b.students ?? 0
  }
})

const artClassesText = computed(() => formatClassHours(summary.value.art?.classes))
const careClassesText = computed(() => formatClassHours(summary.value.care?.classes))
const artIncomeText = computed(() => formatMoney(summary.value.art?.income))
const careIncomeText = computed(() => formatMoney(summary.value.care?.income))

const bars = computed(() => {
  const showArt = kind.value !== 'care'
  const showCare = kind.value !== 'art' && userStore.isAdmin
  const rows = (summary.value.rows || []).map((r) => ({
    date: r.date,
    art: showArt ? Number(r.artClasses) || 0 : 0,
    care: showCare ? Number(r.careClasses) || 0 : 0
  }))
  const max = Math.max(1, ...rows.map((r) => r.art + r.care))
  const isWeek = periodMode.value === 'week'
  return rows.map((r, i) => {
    const day = Number(r.date.slice(8))
    const label = isWeek
      ? weekdayOf(r.date).replace('周', '')
      : i === 0 || day % 5 === 0 || i === rows.length - 1
        ? String(day)
        : ''
    const h = (v) => (v > 0 ? Math.max(8, Math.round((v / max) * chartHeight)) : 0)
    return { ...r, label, artH: h(r.art), careH: h(r.care) }
  })
})

async function loadSummary() {
  const { startDate, endDate } = currentRange()
  statLoading.value = true
  try {
    const data = await attendanceAPI.classHoursSummary(startDate, endDate)
    summary.value = {
      all: data?.all || emptyBucket(),
      art: data?.art || emptyBucket(),
      care: data?.care || emptyBucket(),
      rows: data?.rows || []
    }
  } catch (e) {
    summary.value = { all: emptyBucket(), art: emptyBucket(), care: emptyBucket(), rows: [] }
    uni.showToast({ title: e.message || '课时统计加载失败', icon: 'none' })
  } finally {
    statLoading.value = false
  }
}

function setKind(key) {
  if (kind.value === key) return
  kind.value = key
}

function setPeriodMode(key) {
  if (periodMode.value === key) return
  periodMode.value = key
  loadSummary()
}

function onAnchorChange(e) {
  anchorDate.value = e.detail.value
  loadSummary()
}

function onMonthChange(e) {
  monthValue.value = e.detail.value.slice(0, 7)
  loadSummary()
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
  loadSummary()
}

const monthClassHours = ref('-')
const recordTotal = ref('-')
const adminStats = ref({ totalCount: '-', distinctStudents: '-', feeOverdue: '-' })

const todayText = computed(() => {
  const d = new Date()
  const w = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日 ${w}`
})

/** 普通/财务管理员展示门店统计；超管移动端不拉美术统计 */
const showAdminStats = computed(() => userStore.isAdmin && !userStore.isPrivilegedAdmin)

function fmt(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function weekRange() {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: fmt(monday), end: fmt(sunday) }
}

async function loadTeacherStats() {
  try {
    const [summary, pageData] = await Promise.all([
      attendanceAPI.getMonthlySummary(),
      attendanceAPI.getPage({ current: 1, size: 1 })
    ])
    monthClassHours.value = summary?.classHoursTotal != null ? String(summary.classHoursTotal) : '0'
    recordTotal.value = pageData?.total != null ? String(pageData.total) : '0'
  } catch (e) {
    monthClassHours.value = '-'
    recordTotal.value = '-'
  }
}

async function loadAdminStats() {
  try {
    const { start, end } = weekRange()
    const [stats, counts] = await Promise.all([
      dashboardAPI.getStats(start, end),
      dashboardAPI.getStudentCounts()
    ])
    const rows = stats?.rows || []
    adminStats.value = {
      totalCount: rows.reduce((s, r) => s + Number(r.count || 0), 0),
      distinctStudents: stats?.distinctStudents ?? '-',
      feeOverdue: counts?.feeOverdue ?? '-'
    }
  } catch (e) {
    adminStats.value = { totalCount: '-', distinctStudents: '-', feeOverdue: '-' }
  }
}

async function loadAll() {
  const tasks = [loadSummary()]
  if (userStore.isTeacher) tasks.push(loadTeacherStats())
  else if (showAdminStats.value) tasks.push(loadAdminStats())
  await Promise.all(tasks)
}

onShow(() => {
  if (!requireLogin()) return
  if (userStore.role === 'parent') {
    uni.reLaunch({ url: '/pages/parent/home' })
    return
  }
  loadAll()
})

useStoreRefresh(() => loadAll())

onPullDownRefresh(async () => {
  await loadAll()
  uni.stopPullDownRefresh()
})

function goAttendance() {
  uni.reLaunch({ url: '/pages/attendance/list' })
}
</script>

<style lang="scss" scoped>
$ink: #2a241f;
$muted: #8a8178;

.stat-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.stat-date {
  font-size: 24rpx;
  color: $muted;
}

.sec {
  margin-bottom: 20rpx;
  padding: 26rpx 12rpx 26rpx 26rpx;
  border-radius: 26rpx;
  box-shadow: 0 6rpx 24rpx rgba(42, 36, 31, 0.05);
}

.sec--art { background: #fff6ee; }
.sec--care { background: #f1efff; }
.sec--hover { opacity: 0.88; }

.tag {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 20rpx;
  font-size: 28rpx;
  font-weight: 800;
}

.tag--art { color: #f37021; }
.tag--care { color: #6d5dfc; }

.go {
  font-size: 23rpx;
  font-weight: 400;
  color: $muted;
}

.grid {
  display: flex;
  margin-top: 26rpx;
}

.cell {
  flex: 1;
  min-width: 0;
  text-align: center;
  border-right: 1rpx solid rgba(42, 36, 31, 0.08);
}

.cell:last-child { border-right: none; }

.val {
  display: block;
  font-size: 52rpx;
  font-weight: 800;
  line-height: 1.2;
  color: $ink;
}

.sub {
  font-size: 26rpx;
  font-weight: 600;
  color: $muted;
}

.cell--warn .val { color: #c13515; }

.label {
  display: block;
  margin-top: 6rpx;
  font-size: 23rpx;
  color: $muted;
}

.stat-card {
  margin-bottom: 20rpx;
  padding: 26rpx;
  background: #fff;
  border-radius: 26rpx;
  box-shadow: 0 6rpx 24rpx rgba(42, 36, 31, 0.05);
}

.stat-title {
  margin-bottom: 0;
  font-size: 30rpx;
  font-weight: 800;
  color: $ink;
}

.kind-seg {
  display: flex;
  margin-bottom: 16rpx;
  padding: 6rpx;
  background: #f6f2ec;
  border-radius: 18rpx;
}

.kind-item {
  flex: 1;
  padding: 14rpx 0;
  text-align: center;
  font-size: 27rpx;
  font-weight: 600;
  color: $muted;
  border-radius: 14rpx;
}

.kind-item.active { color: #fff; font-weight: 800; }
.kind-item--all.active { background: #2a241f; }
.kind-item--art.active { background: linear-gradient(135deg, #f37021, #ff9a4d); }
.kind-item--care.active { background: linear-gradient(135deg, #6d5dfc, #8f82ff); }

.seg {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.seg-item {
  flex: 1;
  padding: 12rpx 0;
  text-align: center;
  font-size: 25rpx;
  color: $muted;
  border: 1rpx solid #e6dfd6;
  border-radius: 999rpx;
}

.seg-item.active {
  color: $ink;
  font-weight: 800;
  border-color: $ink;
  background: #faf7f2;
}

.date-nav {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
}

.nav-arrow {
  width: 68rpx;
  height: 68rpx;
  line-height: 62rpx;
  text-align: center;
  font-size: 44rpx;
  color: $ink;
  background: #f6f2ec;
  border-radius: 18rpx;
}

.nav-arrow--hover { opacity: 0.7; }

.date-picker { flex: 1; }

.date-main {
  text-align: center;
}

.date-title {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: $ink;
}

.date-sub {
  display: block;
  margin-top: 2rpx;
  font-size: 21rpx;
  color: #b7aea4;
}

.sum-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx 0 8rpx;
  background: #faf7f2;
  border-radius: 20rpx;
}

.sum-grid--art { background: #fff6ee; }
.sum-grid--care { background: #f1efff; }

.sum-cell {
  flex: 0 0 50%;
  box-sizing: border-box;
  padding: 16rpx 0;
  text-align: center;
  border-bottom: 1rpx solid rgba(42, 36, 31, 0.06);
}

.sum-cell:nth-child(odd) {
  border-right: 1rpx solid rgba(42, 36, 31, 0.06);
}

.sum-cell:nth-last-child(-n + 2) {
  border-bottom: none;
}

.sum-cell--money .sum-val {
  font-size: 40rpx;
  color: #c13515;
}

.sum-val {
  display: block;
  font-size: 52rpx;
  font-weight: 800;
  line-height: 1.2;
  color: $ink;
}

.sum-label {
  display: block;
  margin-top: 6rpx;
  font-size: 23rpx;
  color: $muted;
}

.split {
  display: flex;
  justify-content: center;
  gap: 40rpx;
  margin-top: 16rpx;
  font-size: 24rpx;
  font-weight: 700;
}

.split-art { color: #f37021; }
.split-care { color: #6d5dfc; }

.chart {
  display: flex;
  align-items: flex-end;
  gap: 4rpx;
  margin-top: 28rpx;
}

.bar-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.bar-stack {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
}

.bar {
  width: 70%;
  max-width: 44rpx;
}

.bar--art { background: linear-gradient(180deg, #ff9a4d, #f37021); border-radius: 6rpx 6rpx 0 0; }
.bar--care { background: linear-gradient(180deg, #8f82ff, #6d5dfc); border-radius: 6rpx 6rpx 0 0; }

.bar-label {
  margin-top: 8rpx;
  height: 28rpx;
  font-size: 19rpx;
  color: $muted;
  white-space: nowrap;
}

.legend {
  display: flex;
  justify-content: center;
  gap: 32rpx;
  margin-top: 14rpx;
  font-size: 22rpx;
  color: $muted;
}

.dot {
  display: inline-block;
  width: 16rpx;
  height: 16rpx;
  margin-right: 8rpx;
  border-radius: 50%;
}

.dot--art { background: #f37021; }
.dot--care { background: #6d5dfc; }

.stat-loading {
  margin-top: 12rpx;
  text-align: center;
  font-size: 22rpx;
  color: #b7aea4;
}

.admin-hint {
  margin-bottom: 20rpx;
  padding: 18rpx 24rpx;
  font-size: 23rpx;
  line-height: 1.5;
  color: #ad6800;
  background: #fffbe6;
  border-radius: 16rpx;
}

.foot {
  padding: 16rpx 0;
  text-align: center;
  font-size: 22rpx;
  color: #b7aea4;
}
</style>
