<template>
  <PageShell title="我的" :tab-bar="true" tab-active="profile">
    <view class="profile">
      <view class="avatar">{{ avatarText }}</view>
      <text class="name">{{ userStore.displayName }}</text>
      <text class="role">{{ roleLabel }}</text>
      <text v-if="userStore.userInfo?.username" class="account">{{ userStore.userInfo.username }}</text>
    </view>

    <view class="menu">
      <view class="menu-item" hover-class="menu-item--hover" @tap="goHome">
        <text class="menu-title">返回首页</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" hover-class="menu-item--hover" @tap="onLogout">
        <text class="menu-title menu-title--danger">退出登录</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>
  </PageShell>
</template>

<script setup>
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageShell from '@/components/PageShell.vue'
import { useUserStore, requireLogin } from '@/stores/user'
import { getRoleDisplay } from '@/utils/role'
import { setSkipSilentWechatLogin } from '@/utils/storage'

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
      // 主动退出后，登录页不再静默登录，需点「微信手机号登录」才会重新进入
      setSkipSilentWechatLogin(true)
      await userStore.logout()
      uni.reLaunch({ url: '/pages/login/login?loggedOut=1' })
    }
  })
}
</script>

<style lang="scss" scoped>
.profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 24rpx 40rpx;
  margin-bottom: 24rpx;
  background: linear-gradient(180deg, #fff3e8 0%, #fff 100%);
  border-radius: 28rpx;
  box-shadow: 0 6rpx 24rpx rgba(42, 36, 31, 0.05);
}

.avatar {
  width: 128rpx;
  height: 128rpx;
  line-height: 128rpx;
  text-align: center;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #f37021, #ff9a4d);
  color: #fff;
  font-size: 56rpx;
  font-weight: 700;
}

.name {
  margin-top: 24rpx;
  font-size: 38rpx;
  font-weight: 700;
  color: #2a241f;
}

.role {
  margin-top: 12rpx;
  padding: 4rpx 20rpx;
  font-size: 23rpx;
  color: #f37021;
  background: rgba(243, 112, 33, 0.12);
  border-radius: 999rpx;
}

.account {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #8a8178;
}

.menu {
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 6rpx 24rpx rgba(42, 36, 31, 0.05);
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 28rpx;
  border-bottom: 1rpx solid #f0eae3;
}

.menu-item:last-child { border-bottom: none; }
.menu-item--hover { background: #faf6f1; }

.menu-title {
  font-size: 30rpx;
  color: #2a241f;
}

.menu-title--danger { color: #c13515; }

.menu-arrow {
  font-size: 40rpx;
  line-height: 1;
  color: #cfc6bc;
}
</style>
