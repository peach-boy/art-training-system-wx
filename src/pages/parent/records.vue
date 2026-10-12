<template>
  <view class="page">
    <view class="head">
      <view class="head-avatar">{{ (studentName || '学').slice(0, 1) }}</view>
      <text class="title">{{ studentName || '学员' }}</text>
      <text class="sub">{{ packages.length }} 个课包 · {{ records.length }} 节课</text>
    </view>

    <view class="seg">
      <view class="seg-item" :class="{ active: tab === 'package' }" @tap="switchTab('package')">课包记录</view>
      <view class="seg-item" :class="{ active: tab === 'attendance' }" @tap="switchTab('attendance')">课时记录</view>
    </view>

    <view v-if="loading" class="empty">加载中…</view>

    <template v-else-if="tab === 'package'">
      <view v-if="!packages.length" class="empty">暂无课包</view>
      <view
        v-for="pkg in packages"
        :key="pkg.packageId"
        class="card"
        :class="{ 'card--open': openedPackageId === pkg.packageId }"
        hover-class="card--hover"
        @tap="togglePackage(pkg)"
      >
        <view class="row">
          <text class="name">{{ pkg.packageName || '课包' }}</text>
          <view class="row-right">
            <text class="tag" :class="'tag--' + statusKind(pkg.status)">{{ statusText(pkg.status) }}</text>
            <text class="chevron">{{ openedPackageId === pkg.packageId ? '▾' : '›' }}</text>
          </view>
        </view>
        <view class="remain-row">
          <view class="remain">
            <text class="remain-label">剩余</text>
            <text class="remain-num" :class="{ 'remain-num--zero': Number(pkg.remainingClasses) <= 0 }">
              {{ hours(pkg.remainingClasses) }}
            </text>
            <text class="remain-total">/ {{ hours(pkg.totalClasses) }} 节</text>
          </view>
          <text v-if="pkg.expiryDate" class="meta">至 {{ pkg.expiryDate }}</text>
        </view>
        <view v-if="overtimeHours(pkg) > 0" class="overtime">
          超出课时 {{ hours(overtimeHours(pkg)) }} 节
        </view>
        <view class="bar">
          <view class="bar-fill" :style="{ width: percent(pkg) + '%' }" />
        </view>
        <view class="export-row">
          <text class="export-count">
            已上课 {{ recordsOfPackage(pkg).length }} 节
            <text v-if="openedPackageId !== pkg.packageId" class="export-hint"> · 点开看列表</text>
          </text>
          <view
            class="export-btn"
            :class="{ 'export-btn--busy': exportingId === pkg.packageId }"
            hover-class="export-btn--hover"
            @tap.stop="exportPackage(pkg)"
          >
            {{ exportingId === pkg.packageId ? '生成中…' : '导出图片' }}
          </view>
        </view>

        <view v-if="openedPackageId === pkg.packageId" class="pkg-list" @tap.stop>
          <view v-if="!recordsOfPackage(pkg).length" class="pkg-list-empty">该课包暂无上课记录</view>
          <view
            v-for="item in recordsOfPackage(pkg)"
            :key="item.recordId"
            class="pkg-rec"
            :class="{ 'pkg-rec--over': item.lessonType === 'renewal_pending' }"
          >
            <view class="pkg-rec-main">
              <view class="pkg-rec-top">
                <text class="pkg-rec-date">{{ item.classDate || '—' }}</text>
                <text class="pkg-rec-name">{{ item.courseTypeName || '课程' }}</text>
                <text
                  v-if="item.lessonType === 'renewal_pending'"
                  class="pkg-rec-badge"
                >超出</text>
              </view>
              <text class="pkg-rec-meta">{{ recMeta(item) }}</text>
            </view>
            <text class="pkg-rec-deduct">-{{ hours(item.classesDeducted) }}</text>
            <image
              v-if="photoOf(item)"
              class="thumb thumb--sm"
              :src="photoOf(item)"
              mode="aspectFill"
              lazy-load
              @tap.stop="previewPhoto(item)"
            />
          </view>
        </view>
      </view>
    </template>

    <template v-else>
      <view v-if="!records.length" class="empty">暂无课时记录</view>
      <view v-for="group in groups" :key="group.date" class="group">
        <text class="group-date">{{ group.date }}</text>
        <view class="group-card">
          <view v-for="item in group.items" :key="item.recordId" class="rec">
            <view class="rec-main">
              <view class="rec-top">
                <text class="name">{{ item.courseTypeName || '课程' }}</text>
                <text class="deduct">-{{ hours(item.classesDeducted) }}</text>
              </view>
              <text class="rec-meta">{{ recMeta(item) }}</text>
              <text v-if="item.notes" class="rec-note">{{ item.notes }}</text>
            </view>
            <image
              v-if="photoOf(item)"
              class="thumb"
              :src="photoOf(item)"
              mode="aspectFill"
              lazy-load
              @tap="previewPhoto(item)"
            />
          </view>
        </view>
      </view>
    </template>

    <ObserverBar />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { authAPI } from '@/api'
import ObserverBar from '@/components/ObserverBar.vue'
import { requireLogin, useUserStore } from '@/stores/user'
import { formatClassHours } from '@/utils/classHours'
import { labelOf } from '@/utils/lessonType'
import { imageFullUrl } from '@/utils/media'
import { generatePackageReport, shareReportImage } from '@/utils/packageReport'

const userStore = useUserStore()
const studentName = ref('')
const tab = ref('package')
const loading = ref(true)
const packages = ref([])
const records = ref([])
const exportingId = ref(null)
/** 课包记录 Tab 里展开的课包；再点一次收起 */
const openedPackageId = ref(null)

const groups = computed(() => {
  const map = new Map()
  for (const item of records.value) {
    const date = item.classDate || '未知日期'
    if (!map.has(date)) map.set(date, [])
    map.get(date).push(item)
  }
  return Array.from(map, ([date, items]) => ({ date, items }))
})

function hours(value) {
  return formatClassHours(value)
}

function lessonLabel(type) {
  return labelOf(type)
}

function recordsOfPackage(pkg) {
  return records.value.filter((r) => r.packageId === pkg.packageId)
}

/** 该课包「超出课时」累计节数（lessonType = renewal_pending） */
function overtimeHours(pkg) {
  let sum = 0
  for (const r of recordsOfPackage(pkg)) {
    if (r.lessonType === 'renewal_pending') {
      sum += Number(r.classesDeducted) || 0
    }
  }
  return Math.round(sum * 100) / 100
}

function togglePackage(pkg) {
  const id = pkg.packageId
  openedPackageId.value = openedPackageId.value === id ? null : id
}

function switchTab(next) {
  tab.value = next
  if (next !== 'package') openedPackageId.value = null
}

async function exportPackage(pkg) {
  if (exportingId.value) return
  const rows = recordsOfPackage(pkg)
  if (!rows.length) {
    uni.showToast({ title: '该课包暂无上课记录', icon: 'none' })
    return
  }
  exportingId.value = pkg.packageId
  uni.showLoading({ title: '生成中…', mask: true })
  try {
    const path = await generatePackageReport(pkg, studentName.value, rows)
    uni.hideLoading()
    shareReportImage(path)
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '生成失败', icon: 'none' })
  } finally {
    exportingId.value = null
  }
}

function recMeta(item) {
  return [lessonLabel(item.lessonType), item.teacherName ? `${item.teacherName}老师` : '', item.coursewareName]
    .filter(Boolean)
    .join(' · ')
}

function photoOf(item) {
  return imageFullUrl(item.imageUrl)
}

function previewPhoto(item) {
  const current = photoOf(item)
  if (!current) return
  const urls = records.value.map(photoOf).filter(Boolean)
  uni.previewImage({ current, urls })
}

function percent(pkg) {
  const total = Number(pkg.totalClasses) || 0
  const remain = Number(pkg.remainingClasses) || 0
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((remain / total) * 100)))
}

function statusKind(status) {
  if (status === 'active') return 'ok'
  if (status === 'expired') return 'warn'
  return 'end'
}

function statusText(status) {
  if (status === 'active') return '进行中'
  if (status === 'completed' || status === 'consumed') return '已结束'
  if (status === 'expired') return '已过期'
  return status || ''
}

onLoad(async (query) => {
  if (!requireLogin()) return
  if (userStore.role !== 'parent') {
    uni.reLaunch({ url: '/pages/home/index' })
    return
  }
  if (query.tab === 'attendance') tab.value = 'attendance'
  const studentId = Number(query.studentId)
  studentName.value = query.name ? decodeURIComponent(query.name) : ''
  if (!studentId) {
    loading.value = false
    return
  }
  try {
    const [pkgs, rows] = await Promise.all([
      authAPI.parentPackages(studentId),
      authAPI.parentAttendance(studentId)
    ])
    packages.value = pkgs || []
    records.value = rows || []
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
$ink: #2b1b12;
$muted: #8a8178;
$green: #16a34a;

.page {
  min-height: 100vh;
  padding: 16rpx 24rpx calc(160rpx + env(safe-area-inset-bottom));
  background: #f7f0e6;
  box-sizing: border-box;
}

.head {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 16rpx;
}

.head-avatar {
  flex-shrink: 0;
  width: 56rpx;
  height: 56rpx;
  line-height: 56rpx;
  text-align: center;
  font-size: 26rpx;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #f37021, #f98a3c);
  border-radius: 20rpx;
}

.title {
  font-size: 32rpx;
  font-weight: 800;
  color: $ink;
}

.sub {
  margin-left: auto;
  font-size: 22rpx;
  color: $muted;
}

.seg {
  display: flex;
  padding: 6rpx;
  margin-bottom: 16rpx;
  background: #ebe4dc;
  border-radius: 999rpx;
}

.seg-item {
  flex: 1;
  text-align: center;
  height: 60rpx;
  line-height: 60rpx;
  font-size: 26rpx;
  color: $muted;
  border-radius: 999rpx;
}

.seg-item.active {
  color: $green;
  font-weight: 700;
  background: #fff;
  box-shadow: 0 3rpx 10rpx rgba(42, 36, 31, 0.1);
}

.card {
  margin-bottom: 12rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(42, 36, 31, 0.04);
}

.card--hover { opacity: 0.96; }
.card--open { box-shadow: 0 8rpx 24rpx rgba(42, 36, 31, 0.08); }

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.row-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.name {
  min-width: 0;
  font-size: 28rpx;
  font-weight: 700;
  color: $ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  font-size: 28rpx;
  color: #cbbfb3;
  line-height: 1;
}

.tag {
  flex-shrink: 0;
  padding: 2rpx 14rpx;
  font-size: 21rpx;
  border-radius: 999rpx;
}

.tag--ok { color: $green; background: rgba(22, 163, 74, 0.12); }
.tag--warn { color: #d46b08; background: rgba(212, 107, 8, 0.12); }
.tag--end { color: $muted; background: #f1ece6; }

.remain-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 10rpx;
}

.remain {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
}

.remain-label {
  font-size: 22rpx;
  color: $muted;
}

.remain-num {
  font-size: 40rpx;
  font-weight: 800;
  line-height: 1.1;
  color: #f37021;
}

.remain-num--zero { color: $muted; }

.remain-total {
  font-size: 22rpx;
  color: $muted;
}

.overtime {
  margin-top: 10rpx;
  padding: 8rpx 16rpx;
  font-size: 23rpx;
  font-weight: 700;
  color: #c13515;
  background: #fff1ee;
  border-radius: 12rpx;
}

.meta {
  font-size: 22rpx;
  color: $muted;
}

.bar {
  height: 8rpx;
  margin-top: 10rpx;
  background: #f1ece6;
  border-radius: 999rpx;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #f37021, #ffa15c);
  border-radius: 999rpx;
}

.export-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
}

.export-count {
  font-size: 22rpx;
  color: $muted;
}

.export-hint {
  color: #cbbfb3;
}

.export-btn {
  padding: 6rpx 22rpx;
  font-size: 22rpx;
  font-weight: 600;
  color: #f37021;
  border: 2rpx solid #f37021;
  border-radius: 999rpx;
}

.export-btn--hover { background: #fff3e8; }
.export-btn--busy { opacity: 0.5; }

.pkg-list {
  margin-top: 16rpx;
  border-top: 1rpx solid #f1ece6;
}

.pkg-list-empty {
  padding: 28rpx 0 8rpx;
  text-align: center;
  font-size: 24rpx;
  color: $muted;
}

.pkg-rec {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f6f1eb;
}

.pkg-rec:last-child { border-bottom: none; }

.pkg-rec--over .pkg-rec-deduct { color: #c13515; }

.pkg-rec-main {
  flex: 1;
  min-width: 0;
}

.pkg-rec-top {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
}

.pkg-rec-date {
  flex-shrink: 0;
  font-size: 24rpx;
  font-weight: 700;
  color: $ink;
}

.pkg-rec-name {
  min-width: 0;
  font-size: 24rpx;
  color: $ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pkg-rec-badge {
  flex-shrink: 0;
  padding: 0 10rpx;
  font-size: 20rpx;
  font-weight: 700;
  line-height: 1.6;
  color: #c13515;
  background: #fff1ee;
  border-radius: 999rpx;
}

.pkg-rec-meta {
  display: block;
  margin-top: 4rpx;
  font-size: 21rpx;
  color: $muted;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pkg-rec-deduct {
  flex-shrink: 0;
  font-size: 28rpx;
  font-weight: 800;
  color: #f37021;
}

.thumb--sm {
  width: 72rpx;
  height: 72rpx;
  border-radius: 12rpx;
}

.group-date {
  display: block;
  margin: 14rpx 6rpx 8rpx;
  font-size: 22rpx;
  font-weight: 700;
  color: $muted;
}

.group-card {
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(42, 36, 31, 0.04);
  overflow: hidden;
}

.rec {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #f3eee8;
}

.rec:last-child { border-bottom: none; }

.rec-main {
  flex: 1;
  min-width: 0;
}

.rec-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.deduct {
  flex-shrink: 0;
  font-size: 28rpx;
  font-weight: 800;
  color: #f37021;
}

.rec-meta {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: $muted;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rec-note {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: $muted;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thumb {
  flex-shrink: 0;
  width: 96rpx;
  height: 96rpx;
  border-radius: 14rpx;
  background: #f1ece6;
}

.empty {
  padding: 60rpx 0;
  text-align: center;
  color: $muted;
  font-size: 26rpx;
}
</style>
