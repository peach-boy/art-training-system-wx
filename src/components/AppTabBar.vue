<template>
  <view class="tab-bar-wrap">
    <view class="tab-bar">
      <view
        v-for="item in tabs"
        :key="item.key"
        class="tab-item"
        :class="{ active: active === item.key }"
        @tap="onSwitch(item)"
      >
        <text class="tab-icon">{{ item.icon }}</text>
        <text class="tab-label">{{ item.label }}</text>
      </view>
    </view>
    <view class="tab-bar-safe" />
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

const props = defineProps({
  active: { type: String, default: 'home' }
})

const userStore = useUserStore()

const teacherTabs = [
  { key: 'home', label: '首页', icon: '⌂', path: '/pages/home/index' },
  { key: 'attendance', label: '课时', icon: '☰', path: '/pages/attendance/list' },
  { key: 'profile', label: '我的', icon: '○', path: '/pages/profile/index' }
]

const adminTabs = [
  { key: 'home', label: '首页', icon: '⌂', path: '/pages/home/index' },
  { key: 'students', label: '学员', icon: '👤', path: '/pages/students/list' },
  { key: 'attendance', label: '课时', icon: '☰', path: '/pages/attendance/list' },
  { key: 'profile', label: '我的', icon: '○', path: '/pages/profile/index' }
]

const tabs = computed(() => (userStore.isAdmin ? adminTabs : teacherTabs))

function onSwitch(item) {
  if (item.key === props.active) return
  uni.reLaunch({ url: item.path })
}
</script>

<style lang="scss" scoped>
.tab-bar-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background: var(--canvas);
  border-top: 1rpx solid var(--hairline);
}

.tab-bar {
  display: flex;
  align-items: center;
  justify-content: space-around;
  height: 110rpx;
  padding: 0 16rpx;
  position: relative;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  color: var(--text-muted);
  font-size: 22rpx;

  &.active {
    color: var(--primary);
    font-weight: 600;
  }
}

.tab-icon {
  font-size: 36rpx;
  line-height: 1;
}

.tab-bar-safe {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}
</style>
