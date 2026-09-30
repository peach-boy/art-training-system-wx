<template>
  <view class="tab-bar-wrap">
    <view class="tab-bar" :class="'tab-bar--' + theme">
      <view
        v-for="item in tabs"
        :key="item.key"
        class="tab-item"
        :class="{ active: active === item.key }"
        hover-class="tab-item--hover"
        :hover-stay-time="60"
        @tap="onSwitch(item)"
      >
        <view class="tab-icon-wrap">
          <image
            class="tab-icon"
            :src="iconSrc(item)"
            mode="aspectFit"
          />
        </view>
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
  { key: 'home', label: '首页', icon: 'home', path: '/pages/home/index' },
  { key: 'attendance', label: '课时', icon: 'attendance', path: '/pages/attendance/list' },
  { key: 'analysis', label: '分析', icon: 'analysis', path: '/pages/analysis/index' },
  { key: 'profile', label: '我的', icon: 'profile', path: '/pages/profile/index' }
]

const adminTabs = [
  { key: 'home', label: '首页', icon: 'home', path: '/pages/home/index' },
  { key: 'students', label: '学员', icon: 'students', path: '/pages/students/list' },
  { key: 'attendance', label: '课时', icon: 'attendance', path: '/pages/attendance/list' },
  { key: 'analysis', label: '分析', icon: 'analysis', path: '/pages/analysis/index' },
  { key: 'profile', label: '我的', icon: 'profile', path: '/pages/profile/index' }
]

const parentTabs = [
  { key: 'home', label: '孩子', icon: 'home', path: '/pages/parent/home' },
  { key: 'profile', label: '我的', icon: 'profile', path: '/pages/profile/index' }
]

/** 教师橙色、管理员蓝色、家长绿色 */
const theme = computed(() => {
  if (userStore.role === 'parent') return 'green'
  return userStore.isAdmin ? 'blue' : 'orange'
})

const tabs = computed(() => {
  if (userStore.role === 'parent') return parentTabs
  return userStore.isAdmin ? adminTabs : teacherTabs
})

function iconSrc(item) {
  const color = props.active === item.key ? theme.value : 'gray'
  return `/static/tab/${item.icon}-${color}.svg`
}

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
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  box-shadow: 0 -8rpx 32rpx rgba(42, 36, 31, 0.08);
}

.tab-bar {
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  height: 120rpx;
  padding: 10rpx 16rpx 0;
  box-sizing: border-box;
  --tab-color: #f37021;
  --tab-soft: rgba(243, 112, 33, 0.12);
}

.tab-bar--blue {
  --tab-color: #2f54eb;
  --tab-soft: rgba(47, 84, 235, 0.11);
}

.tab-bar--green {
  --tab-color: #16a34a;
  --tab-soft: rgba(22, 163, 74, 0.12);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  color: #a39a90;
  font-size: 22rpx;
}

.tab-item--hover {
  opacity: 0.7;
}

.tab-icon-wrap {
  width: 88rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999rpx;
  transition: background 0.2s;
}

.tab-icon {
  width: 40rpx;
  height: 40rpx;
}

.tab-label {
  line-height: 1.2;
}

.tab-item.active {
  color: var(--tab-color);
  font-weight: 700;

  .tab-icon-wrap {
    background: var(--tab-soft);
  }
}

.tab-bar-safe {
  height: constant(safe-area-inset-bottom);
  height: env(safe-area-inset-bottom);
}
</style>
