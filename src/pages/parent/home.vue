<template>
  <view class="page">
    <view class="status" :style="{ height: statusBarHeight + 'px' }" />
    <view class="head">
      <text class="title">家长</text>
      <text class="sub">以下学员的联系电话是你的微信手机号</text>
    </view>

    <view v-if="loading" class="empty">加载中…</view>
    <view v-else-if="!children.length" class="empty">没有找到关联学员</view>
    <view v-else class="list">
      <view v-for="item in children" :key="item.studentId" class="child">
        <text class="child-name">{{ item.name || '学员' }}</text>
        <text v-if="item.nickname" class="child-nick">{{ item.nickname }}</text>
      </view>
    </view>

    <view class="logout" @tap="onLogout">退出登录</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { authAPI } from '@/api'
import { useUserStore, requireLogin } from '@/stores/user'

const userStore = useUserStore()
const statusBarHeight = ref(20)
const loading = ref(false)
const children = ref([])

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
  loading.value = true
  try {
    children.value = (await authAPI.parentStudents()) || []
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
})

function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定退出当前账号？',
    success: async (res) => {
      if (!res.confirm) return
      await userStore.logout()
      uni.reLaunch({ url: '/pages/login/login?loggedOut=1' })
    }
  })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 0 32rpx 48rpx;
  background: #f6f2ec;
  box-sizing: border-box;
}

.head {
  padding: 24rpx 0 28rpx;
}

.title {
  display: block;
  font-size: 44rpx;
  font-weight: 800;
  color: #2a241f;
}

.sub {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #8a8178;
}

.list {
  background: #fff;
  border-radius: 28rpx;
  overflow: hidden;
}

.child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx 28rpx;
  border-bottom: 1rpx solid #f0eae3;
}

.child:last-child { border-bottom: none; }

.child-name {
  font-size: 32rpx;
  font-weight: 700;
  color: #2a241f;
}

.child-nick {
  font-size: 24rpx;
  color: #f37021;
}

.empty {
  padding: 48rpx 0;
  text-align: center;
  color: #8a8178;
  font-size: 26rpx;
}

.logout {
  margin-top: 40rpx;
  text-align: center;
  font-size: 28rpx;
  color: #c13515;
}
</style>
