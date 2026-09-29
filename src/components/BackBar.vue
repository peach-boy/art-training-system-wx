<template>
  <view class="back-bar" @tap="goBack">
    <text class="back-bar__chev">‹</text>
    <text class="back-bar__text">返回</text>
  </view>
</template>

<script setup>
function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  const route = pages[0]?.route || ''
  if (route.includes('pages/home/')) return
  uni.reLaunch({ url: '/pages/home/index' })
}
</script>

<style lang="scss" scoped>
.back-bar {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  min-height: 64rpx;
  padding: 0 8rpx 0 0;
  color: #2a241f;
}

.back-bar__chev {
  font-size: 44rpx;
  line-height: 1;
  color: #f37021;
}

.back-bar__text {
  font-size: 28rpx;
  font-weight: 600;
}
</style>
