<template>
  <PageShell title="" :tab-bar="true" tab-active="home" :show-back="false">
    <view class="hero" :class="'hero--' + roleDisplay.badgeTheme">
      <view class="hero__bubble hero__bubble--a" />
      <view class="hero__bubble hero__bubble--b" />
      <view class="hero__brand">
        <AppIcon src="/static/logo.svg" :size="44" />
        <view class="hero__brand-name mp-t">乐橙助教</view>
        <view class="hero__date mp-t">{{ todayText }}</view>
      </view>
      <view class="hero__main">
        <view class="hero__text">
          <view class="hero__greet mp-t">{{ greeting }}</view>
          <view class="hero__name mp-t mp-t--ellipsis">{{ userStore.displayName }}</view>
          <view class="hero__role mp-t">{{ roleDisplay.subLabel }}</view>
        </view>
        <view class="hero__avatar">{{ avatarText }}</view>
      </view>
    </view>

    <StoreSwitcher v-if="userStore.isAdmin" />

    <view class="section-title mp-t">快捷录入</view>
    <view class="cta-row">
      <view class="cta" hover-class="cta--hover" @tap="goRecord">
        <view class="cta__icon"><AppIcon src="/static/home/art.svg" :size="40" /></view>
        <view class="cta__text">
          <view class="cta__title mp-t">美术课时</view>
          <view class="cta__sub mp-t">录入 · 可拍照留档</view>
        </view>
        <view class="cta__plus">+</view>
      </view>
      <view v-if="userStore.isAdmin" class="cta cta--care" hover-class="cta--hover" @tap="goCareRecord">
        <view class="cta__icon"><AppIcon src="/static/home/care.svg" :size="40" /></view>
        <view class="cta__text">
          <view class="cta__title mp-t">晚托课时</view>
          <view class="cta__sub mp-t">录入 · 今日扣课</view>
        </view>
        <view class="cta__plus">+</view>
      </view>
    </view>

    <view class="section-title mp-t">常用功能</view>
    <view class="grid">
      <view class="tile" hover-class="tile--hover" @tap="goAttendance">
        <view class="tile__icon tile__icon--orange"><AppIcon src="/static/home/record.svg" :size="44" /></view>
        <view class="tile__title mp-t">美术课时记录</view>
        <view class="tile__sub mp-t">按日 / 周 / 月查看</view>
      </view>
      <view v-if="userStore.isAdmin" class="tile" hover-class="tile--hover" @tap="goCareList">
        <view class="tile__icon tile__icon--care"><AppIcon src="/static/home/care.svg" :size="44" /></view>
        <view class="tile__title mp-t">晚托课时记录</view>
        <view class="tile__sub mp-t">按日 / 周 / 月查看</view>
      </view>
      <view v-if="userStore.isAdmin" class="tile" hover-class="tile--hover" @tap="goStudents">
        <view class="tile__icon tile__icon--blue"><AppIcon src="/static/home/students.svg" :size="44" /></view>
        <view class="tile__title mp-t">学员列表</view>
        <view class="tile__sub mp-t">课包与剩余课时</view>
      </view>
      <view v-if="userStore.isFinanceStaff" class="tile" hover-class="tile--hover" @tap="goCost">
        <view class="tile__icon tile__icon--teal"><AppIcon src="/static/home/cost.svg" :size="44" /></view>
        <view class="tile__title mp-t">录入成本</view>
        <view class="tile__sub mp-t">门店成本与支出</view>
      </view>
    </view>
  </PageShell>
</template>

<script setup>
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageShell from '@/components/PageShell.vue'
import StoreSwitcher from '@/components/StoreSwitcher.vue'
import AppIcon from '@/components/AppIcon.vue'
import { useUserStore, requireLogin } from '@/stores/user'
import { getRoleDisplay } from '@/utils/role'

const userStore = useUserStore()

const avatarText = computed(() => (userStore.displayName || '用').slice(0, 1))

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const roleDisplay = computed(() => getRoleDisplay(userStore.role))

const todayText = computed(() => {
  const d = new Date()
  const w = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  return `${d.getMonth() + 1}月${d.getDate()}日 ${w}`
})

onShow(() => {
  if (!requireLogin()) return
  if (userStore.role === 'parent') {
    uni.reLaunch({ url: '/pages/parent/home' })
  }
})

function goRecord() {
  uni.navigateTo({
    url: '/pages/attendance/form?mode=create',
    fail: (e) => uni.showToast({ title: '打开失败：' + (e?.errMsg || ''), icon: 'none' })
  })
}

function goCareRecord() {
  uni.navigateTo({
    url: '/pages/care/form',
    fail: (e) => uni.showToast({ title: '打开失败：' + (e?.errMsg || ''), icon: 'none' })
  })
}

function goCareList() {
  uni.reLaunch({ url: '/pages/care/list' })
}

function goAttendance() {
  uni.reLaunch({ url: '/pages/attendance/list' })
}

function goStudents() {
  uni.reLaunch({ url: '/pages/students/list' })
}

function goCost() {
  uni.navigateTo({ url: '/pages/finance/cost-list' })
}
</script>

<style lang="scss" scoped>
$ink: #2b1b12;
$muted: #8a8178;

.hero {
  position: relative;
  overflow: hidden;
  margin-bottom: 24rpx;
  padding: 28rpx 32rpx 36rpx;
  border-radius: 36rpx;
  color: #fff;
  background: linear-gradient(135deg, #f7792b 0%, #ea5d14 100%);
  box-shadow: 0 20rpx 44rpx rgba(234, 93, 20, 0.32);
}

.hero--admin {
  background: linear-gradient(135deg, #4a2e1f 0%, #2b1a11 100%);
  box-shadow: 0 20rpx 44rpx rgba(43, 26, 17, 0.35);
}

.hero__bubble {
  position: absolute;
  border-radius: 50%;
  background: transparent;
  border: 2rpx solid rgba(255, 226, 194, 0.35);
}

.hero__bubble--a { width: 320rpx; height: 320rpx; top: -120rpx; right: -90rpx; }
.hero__bubble--b { width: 200rpx; height: 200rpx; top: -60rpx; right: -30rpx; }

.hero--admin .hero__bubble { border-color: rgba(243, 112, 33, 0.45); }

.hero__brand {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
}

.hero__brand-name {
  margin-left: 12rpx;
  font-size: 26rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}

.hero__date {
  margin-left: auto;
  font-size: 23rpx;
  opacity: 0.88;
  text-align: right;
}

.hero__main {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-top: 34rpx;
}

.hero__text {
  flex: 1;
  min-width: 0;
  padding-right: 20rpx;
}

.hero__greet {
  font-size: 26rpx;
  opacity: 0.9;
}

.hero__name {
  margin-top: 6rpx;
  margin-bottom: 14rpx;
  font-size: 50rpx;
  font-weight: 800;
}

.hero__role {
  display: inline-block;
  padding: 4rpx 20rpx;
  font-size: 22rpx;
  font-weight: 600;
  background: rgba(255, 244, 232, 0.2);
  border: 1rpx solid rgba(255, 226, 194, 0.55);
  border-radius: 999rpx;
}

.hero__avatar {
  flex-shrink: 0;
  width: 104rpx;
  height: 104rpx;
  line-height: 100rpx;
  text-align: center;
  font-size: 44rpx;
  font-weight: 800;
  background: rgba(255, 244, 232, 0.2);
  border: 2rpx solid rgba(255, 226, 194, 0.7);
  border-radius: 36rpx;
}

.section-title {
  margin: 8rpx 4rpx 16rpx;
  font-size: 28rpx;
  font-weight: 800;
  color: $ink;
}

.cta-row {
  display: flex;
  flex-direction: row;
  margin-bottom: 28rpx;
}

.cta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 28rpx 22rpx;
  border-radius: 30rpx;
  background: linear-gradient(135deg, #f37021 0%, #f98a3c 100%);
  box-shadow: 0 14rpx 32rpx rgba(243, 112, 33, 0.26);

  & + .cta {
    margin-left: 20rpx;
  }
}

.cta--care {
  background: linear-gradient(135deg, #5b3a29 0%, #8a6249 100%);
  box-shadow: 0 14rpx 32rpx rgba(91, 58, 41, 0.26);
}

.cta--hover { opacity: 0.92; transform: scale(0.985); }

.cta__icon {
  flex-shrink: 0;
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
}

.cta__text {
  flex: 1;
  min-width: 0;
}

.cta__title {
  font-size: 30rpx;
  font-weight: 800;
  color: #fff;
}

.cta__sub {
  margin-top: 6rpx;
  font-size: 21rpx;
  color: rgba(255, 255, 255, 0.88);
}

.cta__plus {
  flex-shrink: 0;
  width: 48rpx;
  height: 48rpx;
  line-height: 44rpx;
  text-align: center;
  font-size: 36rpx;
  color: #f37021;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 50%;
  margin-left: 8rpx;
}

.cta--care .cta__plus { color: #5b3a29; }

.grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
}

.tile {
  box-sizing: border-box;
  width: 48%;
  margin-bottom: 20rpx;
  padding: 28rpx 26rpx 26rpx;
  background: #fff;
  border-radius: 30rpx;
  box-shadow: 0 6rpx 24rpx rgba(42, 36, 31, 0.05);
}

.tile--hover { background: #faf6f1; transform: scale(0.985); }

.tile__icon {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
  border-radius: 26rpx;
  overflow: hidden;
}

.tile__icon--orange { background: rgba(243, 112, 33, 0.12); }
.tile__icon--care { background: rgba(91, 58, 41, 0.12); }
.tile__icon--blue { background: rgba(58, 36, 24, 0.08); }
.tile__icon--teal { background: rgba(26, 166, 166, 0.14); }

.tile__title {
  font-size: 29rpx;
  font-weight: 700;
  color: $ink;
}

.tile__sub {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: $muted;
}
</style>
