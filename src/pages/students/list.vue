<template>
  <PageShell title="学员" :tab-bar="true" tab-active="students">
    <view class="search card">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索学员姓名"
        confirm-type="search"
        @confirm="reload"
      />
      <button class="search-btn" size="mini" @tap="reload">搜索</button>
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
      <view v-else-if="list.length === 0" class="empty">暂无学员</view>
      <view v-for="item in list" :key="item.studentId" class="stu card" @tap="goDetail(item)">
        <view class="stu-head">
          <text class="stu-name">{{ item.name }}</text>
          <text class="stu-tag" :class="'stu-tag--' + (item.feeStatus || 'normal')">
            {{ feeLabel(item.feeStatus) }}
          </text>
        </view>
        <view class="stu-meta">
          <text>剩余 {{ item.latestRemainingClasses ?? '—' }} 节</text>
          <text>{{ item.phone || '无电话' }}</text>
        </view>
      </view>
    </scroll-view>
  </PageShell>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageShell from '@/components/PageShell.vue'
import { requireLogin, useUserStore } from '@/stores/user'
import { useStoreRefresh } from '@/composables/useStoreRefresh'
import { studentAPI } from '@/api'

const userStore = useUserStore()

const keyword = ref('')
const list = ref([])
const current = ref(1)
const total = ref(0)
const loading = ref(false)
const refreshing = ref(false)
const hasMore = ref(false)

onShow(() => {
  if (!requireLogin()) return
  if (!userStore.isAdmin) {
    uni.showToast({ title: '仅管理员可访问', icon: 'none' })
    setTimeout(() => uni.reLaunch({ url: '/pages/home/index' }), 800)
    return
  }
  reload()
})

useStoreRefresh(() => reload())

function feeLabel(s) {
  const map = { overdue: '待续费', warning: '预警', normal: '正常', not_started: '未开始' }
  return map[s] || s || '—'
}

async function fetchPage(page, append) {
  const data = await studentAPI.getPage({
    current: page,
    size: 15,
    name: keyword.value.trim() || undefined
  })
  const records = data?.records || []
  total.value = data?.total ?? 0
  list.value = append ? list.value.concat(records) : records
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

async function onRefresh() {
  refreshing.value = true
  await reload()
  refreshing.value = false
}

async function loadMore() {
  if (!hasMore.value || loading.value) return
  current.value += 1
  try {
    await fetchPage(current.value, true)
  } catch (e) {
    current.value -= 1
  }
}

function goDetail(item) {
  uni.navigateTo({ url: `/pages/students/detail?id=${item.studentId}` })
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

.search {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.search-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  background: var(--bg-page);
  border-radius: var(--radius-sm);
  font-size: 28rpx;
}

.search-btn {
  background: var(--primary);
  color: #fff;
}

.list-scroll {
  height: calc(100vh - 320rpx);
}

.stu-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.stu-name {
  font-size: 30rpx;
  font-weight: 600;
}

.stu-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: var(--radius-full);
  background: var(--bg-page);
  color: var(--text-muted);
}

.stu-tag--overdue {
  background: rgba(193, 53, 21, 0.1);
  color: #c13515;
}

.stu-tag--warning {
  background: rgba(212, 107, 8, 0.1);
  color: #d46b08;
}

.stu-meta {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: var(--text-muted);
}

.empty {
  text-align: center;
  padding: 60rpx;
  color: var(--text-muted);
}
</style>
