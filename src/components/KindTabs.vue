<template>
  <view class="kind-tabs">
    <view
      class="kind-tab kind-tab--art"
      :class="{ active: kind === 'art' }"
      hover-class="kind-tab--hover"
      @tap="go('art')"
    >
      <view class="kind-badge">美</view>
      <view class="kind-text">
        <text class="kind-name">美术课时</text>
        <text class="kind-desc">{{ page === 'form' ? '录入上课记录' : '上课记录' }}</text>
      </view>
    </view>
    <view
      class="kind-tab kind-tab--care"
      :class="{ active: kind === 'care' }"
      hover-class="kind-tab--hover"
      @tap="go('care')"
    >
      <view class="kind-badge">晚</view>
      <view class="kind-text">
        <text class="kind-name">晚托课时</text>
        <text class="kind-desc">{{ page === 'form' ? '录入扣课' : '扣课记录' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
/**
 * 美术课时 / 晚托课时 入口切换（与 PC 端菜单分开一致）。
 * kind: art | care；page: list | form
 */
const props = defineProps({
  kind: { type: String, default: 'art' },
  page: { type: String, default: 'list' }
})

const URLS = {
  art: {
    list: '/pages/attendance/list',
    form: '/pages/attendance/form?mode=create'
  },
  care: {
    list: '/pages/care/list',
    form: '/pages/care/form'
  }
}

function go(kind) {
  if (kind === props.kind) return
  uni.reLaunch({
    url: URLS[kind][props.page],
    fail: (e) => uni.showToast({ title: '切换失败：' + (e?.errMsg || ''), icon: 'none' })
  })
}
</script>

<style lang="scss" scoped>
.kind-tabs {
  flex: 1;
  display: flex;
  gap: 16rpx;
}

.kind-tab {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 20rpx;
  background: #fff;
  border: 2rpx solid #efe8df;
  border-radius: 24rpx;
  box-sizing: border-box;
  transition: all 0.2s;
}

.kind-tab--hover { opacity: 0.85; }

.kind-badge {
  flex-shrink: 0;
  width: 64rpx;
  height: 64rpx;
  line-height: 64rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 800;
  border-radius: 20rpx;
}

.kind-text {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
}

.kind-name {
  font-size: 29rpx;
  font-weight: 700;
  color: #2a241f;
}

.kind-desc {
  font-size: 21rpx;
  color: #a39a90;
}

/* 美术：橙色 */
.kind-tab--art .kind-badge {
  color: #f37021;
  background: rgba(243, 112, 33, 0.12);
}

.kind-tab--art.active {
  background: linear-gradient(135deg, #f37021, #ff9a4d);
  border-color: transparent;
  box-shadow: 0 10rpx 24rpx rgba(243, 112, 33, 0.3);
}

/* 晚托：紫色 */
.kind-tab--care .kind-badge {
  color: #6d5dfc;
  background: rgba(109, 93, 252, 0.12);
}

.kind-tab--care.active {
  background: linear-gradient(135deg, #6d5dfc, #8f82ff);
  border-color: transparent;
  box-shadow: 0 10rpx 24rpx rgba(109, 93, 252, 0.3);
}

.kind-tab.active .kind-badge {
  color: #fff;
  background: rgba(255, 255, 255, 0.24);
}

.kind-tab.active .kind-name { color: #fff; }
.kind-tab.active .kind-desc { color: rgba(255, 255, 255, 0.85); }
</style>
