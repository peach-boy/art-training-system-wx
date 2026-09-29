<template>
  <PageShell title="学员" :tab-bar="true" tab-active="students">
    <view class="search">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索学员：姓名 / 小名"
        placeholder-class="search-ph"
        confirm-type="search"
        @confirm="reload"
      />
      <view class="search-go" hover-class="search-go--hover" @tap="reload">搜索</view>
    </view>

    <view v-if="!loading || list.length" class="count">共 <text class="count-num">{{ total }}</text> 位学员</view>

    <view v-if="loading && list.length === 0" class="empty">加载中…</view>
    <view v-else-if="list.length === 0" class="empty">没有找到学员</view>

    <view
      v-for="item in list"
      :key="item.studentId"
      class="stu"
      :class="'stu--' + (item.feeStatus || 'normal')"
      hover-class="stu--hover"
      @tap="goDetail(item)"
    >
      <view class="stu-avatar">{{ (item.name || '学').slice(0, 1) }}</view>
      <view class="stu-main">
        <view class="stu-head">
          <text class="stu-name">{{ item.name }}</text>
          <text class="stu-tag" :class="'stu-tag--' + (item.feeStatus || 'normal')">{{ feeLabel(item.feeStatus) }}</text>
        </view>
        <view class="stu-meta">
          <text>剩余 <text class="stu-remain">{{ item.latestRemainingClasses ?? '—' }}</text> 节</text>
          <text>{{ item.phone || '无电话' }}</text>
        </view>
      </view>
      <text class="stu-arrow">›</text>
    </view>

    <view v-if="list.length" class="more">{{ hasMore ? '上拉加载更多' : '已显示全部' }}</view>
  </PageShell>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onReachBottom, onPullDownRefresh } from '@dcloudio/uni-app'
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

onPullDownRefresh(async () => {
  await reload()
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  loadMore()
})

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
$ink: #2a241f;
$muted: #8a8178;

.search {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 8rpx 0 28rpx;
  margin-bottom: 20rpx;
  background: #fff;
  border: 2rpx solid #dbe3ff;
  border-radius: 999rpx;
  box-shadow: 0 6rpx 20rpx rgba(47, 84, 235, 0.06);
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
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 38rpx;
  font-size: 27rpx;
  font-weight: 600;
  color: #fff;
  background: #2f54eb;
  border-radius: 999rpx;
}

.search-go--hover { opacity: 0.85; }

.count {
  padding: 0 8rpx 16rpx;
  font-size: 24rpx;
  color: $muted;
}

.count-num {
  color: #2f54eb;
  font-weight: 700;
  font-size: 30rpx;
  padding: 0 4rpx;
}

.stu {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20rpx;
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
    background: #4c9a2a;
  }
}

.stu--overdue::before { background: #c13515; }
.stu--warning::before { background: #d46b08; }
.stu--not_started::before { background: #b7aea4; }
.stu--hover { background: #fbf8f5; }

.stu-avatar {
  flex-shrink: 0;
  width: 84rpx;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  font-size: 34rpx;
  font-weight: 700;
  color: #2f54eb;
  background: rgba(47, 84, 235, 0.1);
  border-radius: 28rpx;
}

.stu-main {
  flex: 1;
  min-width: 0;
}

.stu-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.stu-name {
  min-width: 0;
  font-size: 31rpx;
  font-weight: 700;
  color: $ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stu-tag {
  flex-shrink: 0;
  font-size: 21rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
  color: #3b7d1f;
  background: rgba(76, 154, 42, 0.14);
}

.stu-tag--overdue { color: #c13515; background: rgba(193, 53, 21, 0.1); }
.stu-tag--warning { color: #d46b08; background: rgba(212, 107, 8, 0.12); }
.stu-tag--not_started { color: $muted; background: #f1ece6; }

.stu-meta {
  display: flex;
  justify-content: space-between;
  gap: 12rpx;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: $muted;
}

.stu-remain {
  font-weight: 700;
  color: #f37021;
  font-size: 28rpx;
}

.stu-arrow {
  flex-shrink: 0;
  font-size: 40rpx;
  line-height: 1;
  color: #cfc6bc;
}

.empty {
  text-align: center;
  padding: 80rpx 0;
  color: $muted;
  font-size: 26rpx;
}

.more {
  text-align: center;
  padding: 16rpx 0 8rpx;
  font-size: 24rpx;
  color: #b7aea4;
}
</style>
