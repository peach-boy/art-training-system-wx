<template>
  <PageShell title="课时记录" :tab-bar="true" tab-active="attendance" :show-back="false">
    <view class="entry-wrap">
      <KindTabs kind="care" page="list" />
    </view>

    <view class="filter-card">
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
          <text v-else>共 <text class="date-count-num">{{ total }}</text> 条晚托记录</text>
        </text>
        <text v-if="!isCurrentPeriod" class="date-now" @tap="backToCurrent">回到{{ currentLabel }}</text>
      </view>
    </view>

    <view v-if="!loading && list.length === 0" class="empty">
      <text class="empty-title">这段时间没有晚托课时</text>
      <view v-if="isCurrentPeriod" class="empty-btn" @tap="goForm">去录入晚托课时</view>
    </view>

    <view v-for="group in groups" :key="group.date" class="group">
      <text class="group-date">{{ group.label }}</text>
      <view class="group-card">
        <view v-for="item in group.items" :key="item.recordId" class="rec">
          <view class="rec-avatar">{{ (item.studentName || '学').slice(0, 1) }}</view>
          <view class="rec-main">
            <view class="rec-top">
              <text class="rec-name">{{ item.studentName || '—' }}</text>
              <text v-if="item.studentGrade" class="rec-grade">{{ item.studentGrade }}</text>
            </view>
            <text v-if="item.packageName" class="rec-meta">{{ item.packageName }}</text>
            <text v-if="item.notes" class="rec-meta">备注：{{ item.notes }}</text>
          </view>
          <text class="rec-deduct">-{{ formatClassHours(item.classesDeducted) }}</text>
        </view>
      </view>
    </view>

    <view v-if="list.length" class="more">{{ hasMore ? '上拉加载更多' : '已显示全部' }}</view>
  </PageShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
import PageShell from '@/components/PageShell.vue'
import KindTabs from '@/components/KindTabs.vue'
import { requireLogin, useUserStore } from '@/stores/user'
import { useStoreRefresh } from '@/composables/useStoreRefresh'
import { careAPI } from '@/api'
import { formatClassHours } from '@/utils/classHours'
import {
  PERIOD_MODES,
  todayStr,
  currentMonthStr,
  getDayRange,
  getWeekRange,
  getMonthRange,
  formatDate
} from '@/utils/dateRange'

const PAGE_SIZE = 15
const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const userStore = useUserStore()
const periodModes = PERIOD_MODES

const list = ref([])
const total = ref(0)
const current = ref(1)
const loading = ref(false)
const hasMore = ref(false)
const startDate = ref('')
const endDate = ref('')
const periodMode = ref('day')
const anchorDate = ref(todayStr())
const monthValue = ref(currentMonthStr())

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
  if (periodMode.value === 'week') return '周一至周日 · 点击选择'
  return `${shortDate(startDate.value)} ~ ${shortDate(endDate.value)} · 点击选择月份`
})

const currentLabel = computed(() => ({ day: '今天', week: '本周', month: '本月' }[periodMode.value]))

const isCurrentPeriod = computed(() => {
  if (periodMode.value === 'month') return monthValue.value === currentMonthStr()
  if (periodMode.value === 'week') return startDate.value === getWeekRange(todayStr()).startDate
  return anchorDate.value === todayStr()
})

/** 按上课日期分组 */
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
  let r
  if (periodMode.value === 'day') r = getDayRange(anchorDate.value)
  else if (periodMode.value === 'week') r = getWeekRange(anchorDate.value)
  else r = getMonthRange(monthValue.value)
  startDate.value = r.startDate
  endDate.value = r.endDate
}

async function fetchPage(page, append) {
  const data = await careAPI.eveningPage({
    current: page,
    size: PAGE_SIZE,
    sortBy: 'classDate',
    startDate: startDate.value,
    endDate: endDate.value
  })
  const records = data?.records || data?.content || []
  total.value = Number(data?.total ?? data?.totalElements ?? 0)
  list.value = append ? list.value.concat(records) : records
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
  if (!hasMore.value || loading.value) return
  loading.value = true
  current.value += 1
  try {
    await fetchPage(current.value, true)
  } catch (e) {
    current.value -= 1
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function setPeriodMode(key) {
  if (periodMode.value === key) return
  periodMode.value = key
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

function goForm() {
  uni.reLaunch({ url: '/pages/care/form' })
}

onShow(() => {
  if (!requireLogin()) return
  if (!userStore.isAdmin) {
    uni.reLaunch({ url: '/pages/home/index' })
    return
  }
  reload()
})

useStoreRefresh(() => reload())

onPullDownRefresh(async () => {
  await reload()
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  loadMore()
})
</script>

<style lang="scss" scoped>
$ink: #2a241f;
$muted: #8a8178;
$care: #6d5dfc;

.entry-wrap {
  display: flex;
  margin-bottom: 20rpx;
}

.filter-card {
  margin-bottom: 20rpx;
  padding: 20rpx;
  background: #fff;
  border-radius: 26rpx;
  box-shadow: 0 6rpx 24rpx rgba(42, 36, 31, 0.05);
}

.seg {
  display: flex;
  padding: 6rpx;
  background: #f1eef9;
  border-radius: 999rpx;
}

.seg-item {
  flex: 1;
  height: 60rpx;
  line-height: 60rpx;
  text-align: center;
  font-size: 26rpx;
  color: $muted;
  border-radius: 999rpx;
}

.seg-item.active {
  color: $care;
  font-weight: 700;
  background: #fff;
  box-shadow: 0 3rpx 10rpx rgba(109, 93, 252, 0.18);
}

.date-nav {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
}

.nav-arrow {
  flex-shrink: 0;
  width: 80rpx;
  height: 80rpx;
  line-height: 72rpx;
  text-align: center;
  font-size: 44rpx;
  color: $care;
  border-radius: 20rpx;
}

.nav-arrow--hover { background: rgba(109, 93, 252, 0.1); }

.date-picker { flex: 1; }

.date-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.date-title {
  font-size: 34rpx;
  font-weight: 800;
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
  margin-top: 12rpx;
  padding: 12rpx 8rpx 0;
  border-top: 1rpx dashed #e4def7;
  font-size: 24rpx;
  color: $muted;
}

.date-count-num {
  color: $care;
  font-weight: 700;
  font-size: 28rpx;
  padding: 0 4rpx;
}

.date-now { color: $care; font-weight: 600; }

.group-date {
  display: block;
  margin: 12rpx 6rpx 8rpx;
  font-size: 23rpx;
  font-weight: 700;
  color: $muted;
}

.group-card {
  background: #fff;
  border-radius: 22rpx;
  box-shadow: 0 4rpx 16rpx rgba(42, 36, 31, 0.04);
  overflow: hidden;
}

.rec {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 18rpx 24rpx;
  border-bottom: 1rpx solid #f3eee8;
}

.rec:last-child { border-bottom: none; }

.rec-avatar {
  flex-shrink: 0;
  width: 68rpx;
  height: 68rpx;
  line-height: 68rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 700;
  color: $care;
  background: rgba(109, 93, 252, 0.12);
  border-radius: 24rpx;
}

.rec-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.rec-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.rec-name {
  font-size: 29rpx;
  font-weight: 700;
  color: $ink;
}

.rec-grade {
  padding: 0 12rpx;
  font-size: 20rpx;
  color: $care;
  background: rgba(109, 93, 252, 0.1);
  border-radius: 999rpx;
}

.rec-meta {
  font-size: 22rpx;
  color: $muted;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rec-deduct {
  flex-shrink: 0;
  font-size: 32rpx;
  font-weight: 800;
  color: $care;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding: 80rpx 0;
}

.empty-title {
  font-size: 28rpx;
  color: $muted;
}

.empty-btn {
  padding: 18rpx 44rpx;
  font-size: 27rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #6d5dfc, #8f82ff);
  border-radius: 999rpx;
}

.more {
  text-align: center;
  padding: 16rpx 0 8rpx;
  font-size: 24rpx;
  color: #b7aea4;
}
</style>
