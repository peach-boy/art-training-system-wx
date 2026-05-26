<template>
  <PageShell title="课时" :tab-bar="true" tab-active="attendance">
    <view v-if="filterStudentId" class="filter-hint">仅显示该学员的课时记录</view>
    <view class="filter card">
      <picker mode="date" :value="startDate" @change="onStartChange">
        <view class="filter-item">{{ startDate || '开始日期' }}</view>
      </picker>
      <text class="filter-sep">至</text>
      <picker mode="date" :value="endDate" @change="onEndChange">
        <view class="filter-item">{{ endDate || '结束日期' }}</view>
      </picker>
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
      </view>
      <view v-if="hasMore && list.length" class="load-more">{{ loadingMore ? '加载中...' : '上拉加载更多' }}</view>
    </scroll-view>
  </PageShell>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'
import PageShell from '@/components/PageShell.vue'
import { requireLogin } from '@/stores/user'
import { useUserStore } from '@/stores/user'
import { attendanceAPI } from '@/api'

const userStore = useUserStore()

const list = ref([])
const current = ref(1)
const total = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const refreshing = ref(false)
const startDate = ref('')
const endDate = ref('')

const hasMore = ref(false)
const filterStudentId = ref(null)

onLoad((query) => {
  if (query.studentId) filterStudentId.value = Number(query.studentId) || query.studentId
})

function initDates() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  startDate.value = `${y}-${m}-01`
  endDate.value = `${y}-${m}-${String(now.getDate()).padStart(2, '0')}`
}

onShow(() => {
  if (!requireLogin()) return
  if (!startDate.value) initDates()
  reload()
})

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

function onStartChange(e) {
  startDate.value = e.detail.value
}

function onEndChange(e) {
  endDate.value = e.detail.value
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

.filter-sep {
  color: var(--text-muted);
}

.filter-btn {
  margin-left: auto;
  background: var(--primary);
  color: #fff;
}

.list-scroll {
  height: calc(100vh - 360rpx);
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

.empty,
.load-more {
  text-align: center;
  padding: 40rpx;
  color: var(--text-muted);
  font-size: 26rpx;
}
</style>
