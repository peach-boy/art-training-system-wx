<template>
  <PageShell title="我的" :tab-bar="true" tab-active="profile">
    <view class="profile card">
      <view class="avatar">{{ avatarText }}</view>
      <view class="info">
        <text class="name">{{ userStore.displayName }}</text>
        <text class="role">{{ roleLabel }}</text>
        <text v-if="userStore.userInfo?.username" class="account">{{ userStore.userInfo.username }}</text>
      </view>
    </view>

    <view class="actions card">
      <button class="action-btn" @tap="goHome">返回首页</button>
      <button class="action-btn action-btn--danger" @tap="onLogout">退出登录</button>
    </view>
  </PageShell>
</template>

<script setup>
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageShell from '@/components/PageShell.vue'
import { useUserStore, requireLogin } from '@/stores/user'
import { getRoleDisplay } from '@/utils/role'

const userStore = useUserStore()

const avatarText = computed(() => (userStore.displayName || '用').slice(0, 1))

const roleDisplay = computed(() => getRoleDisplay(userStore.role))

const roleLabel = computed(() => {
  const d = roleDisplay.value
  return `${d.primaryLabel} · ${d.subLabel}`
})

onShow(() => {
  if (!requireLogin()) return
})

function goHome() {
  uni.reLaunch({ url: '/pages/home/index' })
}

function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定退出当前账号？',
    success: async (res) => {
      if (!res.confirm) return
      await userStore.logout()
      uni.reLaunch({ url: '/pages/login/login' })
    }
  })
}
</script>

<style lang="scss" scoped>
.card {
  background: var(--canvas);
  border-radius: var(--radius-md);
  border: 1rpx solid var(--hairline);
  padding: 28rpx;
  margin-bottom: 24rpx;
}

.profile {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 40rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.name {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
}

.role,
.account {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--text-muted);
}

.action-btn {
  margin-bottom: 16rpx;
  background: var(--bg-page);
  color: var(--text-ink);
  border-radius: var(--radius-sm);
}

.action-btn--danger {
  color: #c13515;
}

.action-btn::after {
  border: none;
}
</style>
