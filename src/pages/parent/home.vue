<template>
  <view class="page">
    <view class="status" :style="{ height: statusBarHeight + 'px' }" />

    <view class="hero">
      <view class="hero-text">
        <text class="hero-hi">你好，家长</text>
        <text class="hero-sub">已通过微信手机号关联以下学员</text>
      </view>
      <view class="hero-badge">家长</view>
    </view>

    <view v-if="loading" class="empty">加载中…</view>
    <view v-else-if="!children.length" class="empty">
      <text class="empty-title">没有找到关联学员</text>
      <text class="empty-desc">请确认学员档案里的联系电话是当前微信绑定的手机号</text>
    </view>
    <view v-else class="list">
      <view v-for="item in children" :key="item.studentId" class="child">
        <view class="child-top" hover-class="child-top--hover" @tap="openRecords(item, 'attendance')">
          <view class="child-avatar">{{ (item.name || '学').slice(0, 1) }}</view>
          <view class="child-main">
            <text class="child-name">{{ item.name || '学员' }}</text>
            <text v-if="item.nickname" class="child-nick">{{ item.nickname }}</text>
          </view>
          <text class="child-arrow">›</text>
        </view>
        <view class="child-actions">
          <view class="action action--pkg" hover-class="action--hover" @tap="openRecords(item, 'package')">
            <text class="action-title">课包记录</text>
            <text class="action-desc">剩余课时、有效期</text>
          </view>
          <view class="action action--att" hover-class="action--hover" @tap="openRecords(item, 'attendance')">
            <text class="action-title">课时记录</text>
            <text class="action-desc">每次上课与扣课</text>
          </view>
        </view>
      </view>
    </view>

    <AppTabBar active="home" />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { authAPI } from '@/api'
import AppTabBar from '@/components/AppTabBar.vue'
import { useUserStore, requireLogin } from '@/stores/user'

const userStore = useUserStore()
const statusBarHeight = ref(20)
const loading = ref(false)
const children = ref([])

async function load() {
  loading.value = true
  try {
    children.value = (await authAPI.parentStudents()) || []
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onShow(async () => {
  try {
    statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 20
  } catch (e) {
    /* ignore */
  }
  if (!requireLogin()) return
  if (userStore.role !== 'parent') {
    uni.reLaunch({ url: '/pages/home/index' })
    return
  }
  await load()
})

onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

function openRecords(item, tab) {
  const name = encodeURIComponent(item.name || '')
  uni.navigateTo({
    url: `/pages/parent/records?studentId=${item.studentId}&name=${name}&tab=${tab}`
  })
}
</script>

<style lang="scss" scoped>
$ink: #2a241f;
$muted: #8a8178;
$green: #16a34a;

.page {
  min-height: 100vh;
  padding: 0 32rpx calc(200rpx + env(safe-area-inset-bottom));
  background: #f6f2ec;
  box-sizing: border-box;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin: 20rpx 0 28rpx;
  padding: 36rpx 32rpx;
  background: linear-gradient(135deg, #16a34a 0%, #4cc777 100%);
  border-radius: 32rpx;
  box-shadow: 0 14rpx 36rpx rgba(22, 163, 74, 0.25);
}

.hero-text {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.hero-hi {
  font-size: 42rpx;
  font-weight: 800;
  color: #fff;
}

.hero-sub {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
}

.hero-badge {
  flex-shrink: 0;
  padding: 8rpx 24rpx;
  font-size: 24rpx;
  font-weight: 700;
  color: $green;
  background: #fff;
  border-radius: 999rpx;
}

.child {
  margin-bottom: 24rpx;
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 6rpx 24rpx rgba(42, 36, 31, 0.05);
  overflow: hidden;
}

.child-top {
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding: 30rpx 28rpx 24rpx;
}

.child-top--hover { background: #fbf8f5; }

.child-avatar {
  flex-shrink: 0;
  width: 92rpx;
  height: 92rpx;
  line-height: 92rpx;
  text-align: center;
  font-size: 38rpx;
  font-weight: 800;
  color: $green;
  background: rgba(22, 163, 74, 0.12);
  border-radius: 32rpx;
}

.child-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.child-name {
  font-size: 34rpx;
  font-weight: 800;
  color: $ink;
}

.child-nick {
  font-size: 24rpx;
  color: $muted;
}

.child-arrow {
  font-size: 44rpx;
  line-height: 1;
  color: #cfc6bc;
}

.child-actions {
  display: flex;
  gap: 16rpx;
  padding: 0 28rpx 28rpx;
}

.action {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  padding: 22rpx 24rpx;
  border-radius: 22rpx;
}

.action--pkg { background: #fff3e8; .action-title { color: #f37021; } }
.action--att { background: #e9f8ee; .action-title { color: $green; } }
.action--hover { opacity: 0.75; }

.action-title {
  font-size: 29rpx;
  font-weight: 700;
}

.action-desc {
  font-size: 22rpx;
  color: $muted;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 80rpx 40rpx;
  text-align: center;
  color: $muted;
  font-size: 26rpx;
}

.empty-title {
  font-size: 30rpx;
  font-weight: 700;
  color: $ink;
}

.empty-desc {
  font-size: 24rpx;
  line-height: 1.6;
}
</style>
