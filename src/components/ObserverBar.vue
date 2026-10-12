<template>
  <view
    v-if="userStore.observing"
    class="observer-bar"
    :class="{ 'observer-bar--tab': withTab }"
  >
    <view class="observer-bar__text">
      <text class="observer-bar__title">观察员模式</text>
      <text class="observer-bar__sub">正在以家长视角查看</text>
    </view>
    <view class="observer-bar__btn" hover-class="observer-bar__btn--hover" @tap="onExit">
      退出观察
    </view>
  </view>
</template>

<script setup>
import { useUserStore } from '@/stores/user'

defineProps({
  /** 页面底部有 Tab 栏时为 true，避免遮挡 */
  withTab: { type: Boolean, default: false }
})

const userStore = useUserStore()

async function onExit() {
  const backUrl = await userStore.exitObserver()
  uni.reLaunch({ url: backUrl || '/pages/login/login' })
}
</script>

<style lang="scss" scoped>
.observer-bar {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
  z-index: 200;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 20rpx 18rpx 28rpx;
  background: rgba(43, 27, 18, 0.94);
  border-radius: 999rpx;
  box-shadow: 0 12rpx 36rpx rgba(43, 27, 18, 0.28);
  box-sizing: border-box;
}

.observer-bar--tab {
  bottom: calc(150rpx + env(safe-area-inset-bottom));
}

.observer-bar__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.observer-bar__title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #fff;
}

.observer-bar__sub {
  display: block;
  margin-top: 2rpx;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.65);
}

.observer-bar__btn {
  flex-shrink: 0;
  padding: 14rpx 32rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: #fff;
  background: #f37021;
  border-radius: 999rpx;
}

.observer-bar__btn--hover {
  opacity: 0.85;
}
</style>
