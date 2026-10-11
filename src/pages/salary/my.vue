<template>
  <PageShell title="我的工资" :tab-bar="true" tab-active="profile" :show-back="false">
    <view class="toolbar">
      <picker mode="date" fields="month" :value="endMonthValue" @change="onEndMonthChange">
        <view class="toolbar-pill">截止 {{ endMonthLabel }} ▾</view>
      </picker>
      <view class="seg">
        <view
          v-for="n in monthCounts"
          :key="n"
          class="seg-item"
          :class="{ active: monthCount === n }"
          @tap="setMonthCount(n)"
        >近{{ n }}月</view>
      </view>
    </view>

    <view class="hint">已入账月份以财务入账为准；未入账为试算。环比为与上月的差额。</view>

    <view v-if="loading && !list.length" class="empty">加载中…</view>
    <view v-else-if="!list.length" class="empty">暂无工资数据</view>

    <view v-for="item in list" :key="item.year + '-' + item.month" class="card">
      <view class="card-head">
        <text class="card-month">{{ item.periodLabel }}</text>
        <text v-if="item.snapshotConfirmed" class="tag tag--ok">已入账</text>
        <text v-else-if="item.included" class="tag">试算</text>
      </view>

      <view v-if="!item.included" class="card-muted">该月不在计薪范围内</view>
      <template v-else>
        <view class="row row--highlight">
          <text class="label">实发</text>
          <text class="val val--net">¥{{ fmt(item.netSalary) }}</text>
          <text class="delta" :class="deltaClass(item.netSalaryDelta)">{{ fmtDelta(item.netSalaryDelta) }}</text>
        </view>
        <view class="row">
          <text class="label">应发</text>
          <text class="val">¥{{ fmt(item.totalSalary) }}</text>
          <text class="delta" :class="deltaClass(item.totalSalaryDelta)">{{ fmtDelta(item.totalSalaryDelta) }}</text>
        </view>
        <view class="row">
          <text class="label">课时费</text>
          <text class="val">¥{{ fmt(item.lessonFee) }}</text>
          <text class="delta" :class="deltaClass(item.lessonFeeDelta)">{{ fmtDelta(item.lessonFeeDelta) }}</text>
        </view>
        <view class="row">
          <text class="label">折算课时</text>
          <text class="val">{{ fmt(item.lessonHours) }}</text>
          <text class="delta" :class="deltaClass(item.lessonHoursDelta)">{{ fmtDelta(item.lessonHoursDelta) }}</text>
        </view>
        <view class="row">
          <text class="label">绩效</text>
          <text class="val">¥{{ fmt(item.performanceBonus) }}</text>
          <text class="delta" :class="deltaClass(item.performanceBonusDelta)">{{ fmtDelta(item.performanceBonusDelta) }}</text>
        </view>
      </template>
    </view>
  </PageShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import PageShell from '@/components/PageShell.vue'
import { useUserStore, requireLogin } from '@/stores/user'
import { teacherSalaryAPI } from '@/api'

const userStore = useUserStore()
const loading = ref(false)
const list = ref([])
const monthCount = ref(6)
const monthCounts = [6, 12]
const endMonthValue = ref(currentMonthStr())

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const endMonthLabel = computed(() => {
  const [y, m] = endMonthValue.value.split('-')
  return `${y}年${Number(m)}月`
})

function fmt(v) {
  if (v == null || v === '') return '0.00'
  const n = Number(v)
  return Number.isNaN(n) ? '0.00' : (Math.round(n * 100) / 100).toFixed(2)
}

function fmtDelta(v) {
  if (v == null || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n) || Math.abs(n) < 0.005) return '持平'
  return (n > 0 ? '+' : '') + fmt(v)
}

function deltaClass(v) {
  if (v == null || v === '') return ''
  const n = Number(v)
  if (Number.isNaN(n) || Math.abs(n) < 0.005) return 'delta--flat'
  return n > 0 ? 'delta--up' : 'delta--down'
}

async function loadTrend() {
  loading.value = true
  try {
    const [y, m] = endMonthValue.value.split('-').map(Number)
    list.value =
      (await teacherSalaryAPI.getMyTrend({
        year: y,
        month: m,
        months: monthCount.value
      })) || []
  } catch (e) {
    list.value = []
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onEndMonthChange(e) {
  endMonthValue.value = e.detail.value.slice(0, 7)
  loadTrend()
}

function setMonthCount(n) {
  if (monthCount.value === n) return
  monthCount.value = n
  loadTrend()
}

onShow(() => {
  if (!requireLogin()) return
  if (!userStore.isTeacher) {
    uni.reLaunch({ url: '/pages/home/index' })
    return
  }
  loadTrend()
})

onPullDownRefresh(async () => {
  await loadTrend()
  uni.stopPullDownRefresh()
})
</script>

<style lang="scss" scoped>
$ink: #2b1b12;
$muted: #8a8178;
$orange: #f37021;

.toolbar {
  margin-bottom: 16rpx;
}

.toolbar-pill {
  display: inline-block;
  margin-bottom: 16rpx;
  padding: 14rpx 28rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: $ink;
  background: #fff;
  border-radius: 999rpx;
  box-shadow: 0 4rpx 16rpx rgba(42, 36, 31, 0.06);
}

.seg {
  display: flex;
  gap: 16rpx;
}

.seg-item {
  flex: 1;
  padding: 14rpx 0;
  text-align: center;
  font-size: 26rpx;
  color: $muted;
  background: #fff;
  border-radius: 18rpx;
}

.seg-item.active {
  color: $orange;
  font-weight: 700;
  box-shadow: inset 0 0 0 2rpx $orange;
}

.hint {
  margin-bottom: 20rpx;
  font-size: 22rpx;
  line-height: 1.55;
  color: $muted;
}

.empty {
  padding: 80rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: $muted;
}

.card {
  margin-bottom: 20rpx;
  padding: 24rpx 28rpx;
  background: #fff;
  border-radius: 26rpx;
  box-shadow: 0 6rpx 24rpx rgba(42, 36, 31, 0.05);
}

.card-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.card-month {
  font-size: 32rpx;
  font-weight: 800;
  color: $ink;
}

.tag {
  padding: 4rpx 14rpx;
  font-size: 20rpx;
  color: $muted;
  background: #f6f2ec;
  border-radius: 999rpx;
}

.tag--ok {
  color: #15803d;
  background: #ecfdf3;
}

.card-muted {
  font-size: 26rpx;
  color: $muted;
}

.row {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
  border-top: 1rpx solid #f0eae3;
}

.row--highlight {
  border-top: none;
  padding-top: 0;
}

.label {
  width: 140rpx;
  font-size: 26rpx;
  color: $muted;
}

.val {
  flex: 1;
  font-size: 28rpx;
  font-weight: 600;
  color: $ink;
}

.val--net {
  font-size: 36rpx;
  color: #c13515;
}

.delta {
  min-width: 120rpx;
  text-align: right;
  font-size: 24rpx;
  color: $muted;
}

.delta--up {
  color: #15803d;
}

.delta--down {
  color: #c13515;
}

.delta--flat {
  color: #b7aea4;
}
</style>
