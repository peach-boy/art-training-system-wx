<template>
  <view class="page">
    <view v-if="!ticket" class="card">
      <text class="title">二维码无效</text>
      <text class="desc">请回到电脑上刷新二维码，再用微信扫一次。</text>
    </view>

    <view v-else-if="!userStore.isLoggedIn" class="card">
      <text class="title">请先登录小程序</text>
      <text class="desc">登录后会回到这里，再确认即可让电脑进入同一账号。</text>
      <view class="btn" @tap="goLogin">去登录</view>
    </view>

    <view v-else-if="done" class="card">
      <text class="title">电脑已登录</text>
      <text class="desc">可以关闭这个页面，回到电脑继续使用。</text>
      <view class="btn btn--ghost" @tap="goHome">返回首页</view>
    </view>

    <view v-else class="card">
      <text class="kicker">电脑登录确认</text>
      <text class="title">以 {{ userStore.displayName }} 登录</text>
      <text class="desc">确认后，电脑浏览器会进入这个账号。手机上的登录不受影响。</text>
      <view class="btn" :class="{ 'btn--off': confirming }" @tap="confirm">
        {{ confirming ? '确认中…' : '确认登录' }}
      </view>
      <view class="btn btn--ghost" @tap="goHome">取消</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { authAPI } from '@/api'
import { useUserStore } from '@/stores/user'
import { setPendingPcTicket } from '@/utils/storage'

const userStore = useUserStore()
const ticket = ref('')
const confirming = ref(false)
const done = ref(false)

onLoad((query) => {
  let scene = query?.scene || ''
  try {
    scene = decodeURIComponent(scene)
  } catch {
    /* 保持原值 */
  }
  ticket.value = scene
})

function goLogin() {
  setPendingPcTicket(ticket.value)
  uni.reLaunch({ url: '/pages/login/login' })
}

function goHome() {
  uni.reLaunch({ url: '/pages/home/index' })
}

async function confirm() {
  if (confirming.value || done.value || !ticket.value) return
  confirming.value = true
  try {
    await authAPI.confirmPcLogin(ticket.value)
    done.value = true
  } catch (e) {
    uni.showToast({ title: e.message || '确认失败', icon: 'none', duration: 2500 })
  } finally {
    confirming.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 48rpx 32rpx;
  background: #f6f2ec;
  box-sizing: border-box;
}

.card {
  padding: 48rpx 36rpx;
  background: #fff;
  border-radius: 32rpx;
  box-shadow: 0 12rpx 40rpx rgba(42, 36, 31, 0.06);
}

.kicker {
  display: block;
  font-size: 24rpx;
  color: #f37021;
  font-weight: 600;
}

.title {
  display: block;
  margin-top: 12rpx;
  font-size: 40rpx;
  font-weight: 800;
  color: #2a241f;
}

.desc {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: #8a8178;
}

.btn {
  margin-top: 40rpx;
  height: 96rpx;
  line-height: 96rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
  background: #f37021;
  border-radius: 999rpx;
}

.btn--ghost {
  margin-top: 16rpx;
  color: #8a8178;
  background: transparent;
  font-weight: 500;
}

.btn--off {
  opacity: 0.6;
}
</style>
