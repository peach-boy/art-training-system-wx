<template>
  <PageShell :title="listTitle" :tab-bar="true" tab-active="attendance">
    <view v-if="filterStudentId" class="filter-hint">仅显示该学员的课时记录</view>
    <view v-else-if="userStore.isTeacher" class="filter-hint">仅显示我录入的课时</view>

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
        <view v-if="userStore.isAdmin && item.teacherName" class="record-teacher">
          授课：{{ item.teacherName }}
        </view>
      </view>
      <view v-if="hasMore && list.length" class="load-more">{{ loadingMore ? '加载中...' : '上拉加载更多' }}</view>
    </scroll-view>
  </PageShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'
import PageShell from '@/components/PageShell.vue'
import { requireLogin } from '@/stores/user'
import { useUserStore } from '@/stores/user'
import { useStoreRefresh } from '@/composables/useStoreRefresh'
import { attendanceAPI } from '@/api'
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

const listTitle = computed(() => (userStore.isTeacher ? '我的课时' : '课时管理'))

const rangeLabel = computed(() => {
  if (!startDate.value || !endDate.value) return ''
  if (periodMode.value === 'day') return startDate.value
  return weekRangeLabel(startDate.value, endDate.value)
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

onLoad((query) => {
  if (query.studentId) filterStudentId.value = Number(query.studentId) || query.studentId
})

onShow(() => {
  if (!requireLogin()) return
  if (!startDate.value) initPeriodDefaults()
  reload()
})

useStoreRefresh(() => {
  if (!startDate.value) initPeriodDefaults()
  return reload()
})

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
  } catch (e) {
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
  height: calc(100vh - 420rpx);
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

.record-teacher {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--text-muted);
}

.empty,
.load-more {
  text-align: center;
  padding: 40rpx;
  color: var(--text-muted);
  font-size: 26rpx;
}
</style>
