<template>
  <view class="page-shell">
    <view class="page-shell__status" :style="{ height: statusBarHeight + 'px' }" />
    <view v-if="title" class="page-shell__header">
      <text class="page-shell__title">{{ title }}</text>
      <view class="page-shell__extra">
        <slot name="extra" />
      </view>
    </view>
    <view class="page-shell__body" :class="{ 'has-tab': tabBar }">
      <slot />
    </view>
    <AppTabBar v-if="tabBar" :active="tabActive" />
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AppTabBar from '@/components/AppTabBar.vue'

defineProps({
  title: { type: String, default: '' },
  tabBar: { type: Boolean, default: false },
  tabActive: { type: String, default: 'home' }
})

const statusBarHeight = ref(20)

onMounted(() => {
  try {
    const sys = uni.getSystemInfoSync()
    statusBarHeight.value = sys.statusBarHeight || 20
  } catch (e) {
    statusBarHeight.value = 20
  }
})
</script>

<style lang="scss" scoped>
.page-shell {
  min-height: 100vh;
  background: var(--bg-page);
}

.page-shell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 32rpx 20rpx;
  background: var(--canvas);
  border-bottom: 1rpx solid var(--hairline);
}

.page-shell__title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--text-ink);
}

.page-shell__body {
  padding: 24rpx 24rpx 32rpx;

  &.has-tab {
    padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
  }
}
</style>
