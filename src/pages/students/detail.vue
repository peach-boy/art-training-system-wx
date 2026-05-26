<template>
  <view class="stu-detail">
    <view v-if="loading" class="empty">加载中...</view>
    <template v-else-if="student">
      <view class="hero">
        <view class="hero-name">{{ student.name }}</view>
        <view v-if="student.nickname" class="hero-nick">{{ student.nickname }}</view>
        <view class="hero-tags">
          <text class="tag">{{ statusLabel(student.status) }}</text>
          <text class="tag tag-fee">{{ feeStatusLabel(student.feeStatus) }}</text>
        </view>
      </view>

      <view class="tabs">
        <view
          class="tab"
          :class="{ active: activeTab === 'overview' }"
          @tap="activeTab = 'overview'"
        >概览</view>
        <view
          class="tab"
          :class="{ active: activeTab === 'packages' }"
          @tap="activeTab = 'packages'"
        >课包 {{ packageList.length ? `(${packageList.length})` : '' }}</view>
      </view>

      <!-- 概览 -->
      <view v-show="activeTab === 'overview'" class="tab-panel">
        <view class="stats-row">
          <view class="stat">
            <text class="stat-val">{{ formatRemainingClasses(hoursStats.totalReported) }}</text>
            <text class="stat-label">已报课</text>
          </view>
          <view class="stat">
            <text class="stat-val">{{ formatRemainingClasses(hoursStats.totalAttended) }}</text>
            <text class="stat-label">已上课</text>
          </view>
          <view class="stat">
            <text class="stat-val highlight">{{ formatRemainingClasses(hoursStats.totalNotAttended) }}</text>
            <text class="stat-label">未上课</text>
          </view>
        </view>

        <view class="card">
          <view class="row">
            <text class="label">剩余课时</text>
            <text class="value highlight">{{ student.latestRemainingClasses ?? '—' }} 节</text>
          </view>
          <view class="row">
            <text class="label">最新课包总课时</text>
            <text class="value">{{ student.latestTotalClasses ?? '—' }} 节</text>
          </view>
          <view class="row">
            <text class="label">累计报名实付</text>
            <text class="value">{{ formatMoney(totalEnrollment) }}</text>
          </view>
          <view class="row">
            <text class="label">联系电话</text>
            <text class="value">{{ student.phone || '—' }}</text>
          </view>
          <view class="row">
            <text class="label">入学日期</text>
            <text class="value">{{ student.enrollmentDate || '—' }}</text>
          </view>
          <view class="row">
            <text class="label">最近上课</text>
            <text class="value">{{ student.lastClassDate || '—' }}</text>
          </view>
          <view class="row">
            <text class="label">所属店铺</text>
            <text class="value">{{ student.storeName || '—' }}</text>
          </view>
          <view v-if="student.notes" class="row row-notes">
            <text class="label">备注</text>
            <text class="value">{{ student.notes }}</text>
          </view>
        </view>

        <view class="actions">
          <button class="btn-primary" @tap="goAttendance">全部课时记录</button>
          <button class="btn-secondary" @tap="goAddLesson">录入课时</button>
        </view>
      </view>

      <!-- 课包列表 -->
      <view v-show="activeTab === 'packages'" class="tab-panel">
        <view v-if="packagesLoading" class="empty-inline">加载课包...</view>
        <view v-else-if="packageList.length === 0" class="empty-inline">暂无课程包</view>
        <view v-else class="pkg-list">
          <view
            v-for="pkg in packageList"
            :key="pkg.packageId"
            class="pkg card"
            @tap="goPackageRecords(pkg)"
          >
            <view class="pkg-head">
              <text class="pkg-name">{{ pkg.packageName || '—' }}</text>
              <text class="pkg-status" :class="'pkg-status--' + (pkg.status || 'active')">
                {{ packageStatusLabel(pkg.status) }}
              </text>
            </view>
            <view class="pkg-tags">
              <text class="pkg-tag">{{ packageKindLabel(pkg.packageKind) }}</text>
              <text v-if="pkg.actualPrice != null" class="pkg-tag">{{ formatMoney(pkg.actualPrice) }}</text>
            </view>
            <view class="pkg-meta">
              <view class="pkg-meta-item">
                <text class="meta-label">剩余</text>
                <text class="meta-val highlight">{{ formatRemainingClasses(pkg.remainingClasses) }} / {{ formatRemainingClasses(pkg.totalClasses) }}</text>
              </view>
              <view class="pkg-meta-item">
                <text class="meta-label">购买</text>
                <text class="meta-val">{{ pkg.purchaseDate || '—' }}</text>
              </view>
              <view class="pkg-meta-item">
                <text class="meta-label">有效期</text>
                <text class="meta-val">{{ pkg.expiryDate || '—' }}</text>
              </view>
            </view>
            <view v-if="pkg.totalClasses > 0" class="pkg-progress">
              <view class="progress-track">
                <view class="progress-bar" :style="{ width: packageProgressPercent(pkg) + '%' }" />
              </view>
              <text class="progress-text">已用 {{ packageProgressPercent(pkg) }}%</text>
            </view>
            <view v-if="pkg.notes" class="pkg-notes">{{ pkg.notes }}</view>
            <view class="pkg-action">
              <text>课时核对 ›</text>
            </view>
          </view>
        </view>
      </view>
    </template>
    <view v-else class="empty">学员不存在</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { studentAPI, coursePackageAPI } from '@/api'
import { requireLogin, useUserStore } from '@/stores/user'
import {
  statusLabel,
  feeStatusLabel,
  packageStatusLabel,
  packageKindLabel,
  formatMoney
} from '@/utils/format'
import {
  formatRemainingClasses,
  packageProgressPercent
} from '@/utils/classHours'

const userStore = useUserStore()
const student = ref(null)
const packageList = ref([])
const loading = ref(true)
const packagesLoading = ref(false)
const activeTab = ref('overview')
let studentId = ''

const hoursStats = computed(() => {
  let totalPurchased = 0
  let totalRemaining = 0
  for (const p of packageList.value) {
    totalPurchased += parseFloat(p.totalClasses) || 0
    totalRemaining += parseFloat(p.remainingClasses) || 0
  }
  const totalReported = Math.round(totalPurchased * 100) / 100
  const totalNotAttended = Math.round(totalRemaining * 100) / 100
  const totalAttended = Math.round((totalReported - totalNotAttended) * 100) / 100
  return { totalReported, totalAttended, totalNotAttended }
})

const totalEnrollment = computed(() => {
  let sum = 0
  for (const p of packageList.value) {
    const v = p.actualPrice
    if (v != null && v !== '') sum += Number(v)
  }
  return Math.round(sum * 100) / 100
})

onLoad((query) => {
  if (!requireLogin()) return
  if (!userStore.isAdmin) {
    uni.showToast({ title: '仅管理员可访问', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 800)
    return
  }
  studentId = query.id || ''
  if (query.tab === 'packages') activeTab.value = 'packages'
  loadAll()
})

async function loadAll() {
  loading.value = true
  try {
    const [detail, packages] = await Promise.all([
      studentAPI.getById(studentId),
      loadPackages()
    ])
    student.value = detail
    if (packages) packageList.value = packages
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadPackages() {
  packagesLoading.value = true
  try {
    return await coursePackageAPI.getByStudent(studentId)
  } catch (e) {
    uni.showToast({ title: e.message || '课包加载失败', icon: 'none' })
    return []
  } finally {
    packagesLoading.value = false
  }
}

function goAttendance() {
  uni.navigateTo({ url: `/pages/attendance/list?studentId=${studentId}` })
}

function goAddLesson() {
  uni.navigateTo({ url: `/pages/attendance/form?mode=create&studentId=${studentId}` })
}

function goPackageRecords(pkg) {
  const name = encodeURIComponent(student.value?.name || '')
  uni.navigateTo({
    url: `/pages/students/package-records?packageId=${pkg.packageId}&studentName=${name}`
  })
}
</script>

<style lang="scss" scoped>
.stu-detail {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 48rpx;
}

.hero {
  background: linear-gradient(145deg, #1a1a2e 0%, #243b5e 100%);
  padding: 48rpx 32rpx 32rpx;
  color: #fff;
}

.hero-name {
  font-size: 44rpx;
  font-weight: 700;
}

.hero-nick {
  font-size: 28rpx;
  opacity: 0.85;
  margin-top: 8rpx;
}

.hero-tags {
  display: flex;
  gap: 12rpx;
  margin-top: 20rpx;
}

.tag {
  padding: 8rpx 20rpx;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.15);
  font-size: 24rpx;
}

.tag-fee {
  background: rgba(243, 112, 33, 0.35);
}

.tabs {
  display: flex;
  margin: 0 24rpx;
  background: var(--canvas);
  border-radius: var(--radius-md);
  border: 1rpx solid var(--hairline);
  overflow: hidden;
}

.tab {
  flex: 1;
  text-align: center;
  padding: 22rpx 0;
  font-size: 28rpx;
  color: var(--text-muted);

  &.active {
    color: var(--primary);
    font-weight: 600;
    background: var(--primary-light);
  }
}

.tab-panel {
  padding-top: 24rpx;
}

.stats-row {
  display: flex;
  margin: 0 24rpx 24rpx;
  gap: 16rpx;
}

.stat {
  flex: 1;
  background: var(--canvas);
  border-radius: var(--radius-md);
  border: 1rpx solid var(--hairline);
  padding: 20rpx 12rpx;
  text-align: center;
}

.stat-val {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-ink);

  &.highlight {
    color: var(--primary);
  }
}

.stat-label {
  display: block;
  font-size: 22rpx;
  color: var(--text-muted);
  margin-top: 6rpx;
}

.card,
.pkg {
  background: var(--canvas);
  border-radius: var(--radius-md);
  border: 1rpx solid var(--hairline);
}

.card {
  margin: 0 24rpx 24rpx;
  padding: 8rpx 24rpx;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--hairline);
  font-size: 28rpx;
}

.row:last-child {
  border-bottom: none;
}

.row-notes {
  flex-direction: column;
  align-items: flex-start;
}

.label {
  color: var(--text-muted);
  flex-shrink: 0;
}

.value {
  text-align: right;
}

.highlight {
  color: var(--primary);
  font-weight: 600;
}

.actions {
  padding: 0 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.btn-primary,
.btn-secondary {
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
}

.btn-primary {
  background: var(--primary);
  color: #fff;
}

.btn-secondary {
  background: var(--primary-light);
  color: var(--primary);
}

.pkg-list {
  padding: 0 24rpx;
}

.pkg {
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.pkg-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.pkg-name {
  font-size: 30rpx;
  font-weight: 600;
  flex: 1;
}

.pkg-status {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: var(--radius-full);
  background: var(--bg-page);
  color: var(--text-muted);
  flex-shrink: 0;
}

.pkg-status--active {
  background: rgba(82, 196, 26, 0.12);
  color: #389e0d;
}

.pkg-tags {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.pkg-tag {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: var(--radius-full);
  background: var(--bg-page);
  color: var(--text-muted);
}

.pkg-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx 24rpx;
  margin-bottom: 16rpx;
}

.pkg-meta-item {
  font-size: 24rpx;
}

.meta-label {
  color: var(--text-muted);
  margin-right: 8rpx;
}

.meta-val.highlight {
  color: var(--primary);
  font-weight: 600;
}

.pkg-progress {
  margin-bottom: 12rpx;
}

.progress-track {
  height: 12rpx;
  background: var(--bg-page);
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #f37021, #ffa940);
  border-radius: 6rpx;
}

.progress-text {
  font-size: 22rpx;
  color: var(--text-muted);
  margin-top: 8rpx;
}

.pkg-notes {
  font-size: 24rpx;
  color: var(--text-muted);
  margin-bottom: 12rpx;
  line-height: 1.4;
}

.pkg-action {
  text-align: right;
  font-size: 26rpx;
  color: var(--primary);
  font-weight: 500;
  padding-top: 12rpx;
  border-top: 1rpx solid var(--hairline);
}

.empty,
.empty-inline {
  text-align: center;
  padding: 60rpx 32rpx;
  color: var(--text-muted);
  font-size: 28rpx;
}
</style>
