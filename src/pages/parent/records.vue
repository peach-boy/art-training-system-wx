<template>
  <view class="page">
    <view class="head">
      <view class="head-avatar">{{ (studentName || '学').slice(0, 1) }}</view>
      <view class="head-main">
        <text class="title">{{ studentName || '学员' }}</text>
        <text class="sub">共 {{ packages.length }} 个课包 · {{ records.length }} 次课时</text>
      </view>
    </view>

    <view class="seg">
      <view class="seg-item" :class="{ active: tab === 'package' }" @tap="tab = 'package'">
        课包记录
      </view>
      <view class="seg-item" :class="{ active: tab === 'attendance' }" @tap="tab = 'attendance'">
        课时记录
      </view>
    </view>

    <view v-if="loading" class="empty">加载中…</view>

    <template v-else-if="tab === 'package'">
      <view v-if="!packages.length" class="empty">暂无课包</view>
      <view v-for="pkg in packages" :key="pkg.packageId" class="card">
        <view class="row">
          <text class="name">{{ pkg.packageName || '课包' }}</text>
          <text class="tag" :class="'tag--' + statusKind(pkg.status)">{{ statusText(pkg.status) }}</text>
        </view>
        <view class="remain">
          <text class="remain-num">{{ hours(pkg.remainingClasses) }}</text>
          <text class="remain-total"> / {{ hours(pkg.totalClasses) }} 节</text>
        </view>
        <view class="bar">
          <view class="bar-fill" :style="{ width: percent(pkg) + '%' }" />
        </view>
        <view v-if="pkg.expiryDate" class="meta">有效期至 {{ pkg.expiryDate }}</view>
      </view>
    </template>

    <template v-else>
      <view v-if="!records.length" class="empty">暂无课时记录</view>
      <view v-for="group in groups" :key="group.date" class="group">
        <text class="group-date">{{ group.date }}</text>
        <view v-for="item in group.items" :key="item.recordId" class="card card--rec">
          <view class="row">
            <text class="name">{{ item.courseTypeName || '课程' }}</text>
            <text class="deduct">-{{ hours(item.classesDeducted) }} 节</text>
          </view>
          <view class="chips">
            <text class="chip">{{ lessonLabel(item.lessonType) }}</text>
            <text v-if="item.teacherName" class="chip chip--muted">{{ item.teacherName }} 老师</text>
            <text v-if="item.packageName" class="chip chip--muted">{{ item.packageName }}</text>
          </view>
          <text v-if="item.coursewareName" class="note">课件：{{ item.coursewareName }}</text>
          <text v-if="item.notes" class="note">备注：{{ item.notes }}</text>
          <view v-if="photoOf(item)" class="photo-wrap" @tap="previewPhoto(item)">
            <image class="photo" :src="photoOf(item)" mode="aspectFill" lazy-load />
            <text class="photo-tip">课堂照片 · 点击查看</text>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { authAPI } from '@/api'
import { requireLogin, useUserStore } from '@/stores/user'
import { formatClassHours } from '@/utils/classHours'
import { labelOf } from '@/utils/lessonType'
import { imageFullUrl } from '@/utils/media'

const userStore = useUserStore()
const studentName = ref('')
const tab = ref('package')
const loading = ref(true)
const packages = ref([])
const records = ref([])

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
$ink: #2a241f;
$muted: #8a8178;
$green: #16a34a;

.page {
  min-height: 100vh;
  padding: 24rpx 32rpx calc(48rpx + env(safe-area-inset-bottom));
  background: #f6f2ec;
  box-sizing: border-box;
}

.head {
  display: flex;
  align-items: center;
  gap: 22rpx;
  margin-bottom: 24rpx;
}

.head-avatar {
  flex-shrink: 0;
  width: 88rpx;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  font-size: 36rpx;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #16a34a, #4cc777);
  border-radius: 30rpx;
}

.head-main {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.title {
  font-size: 38rpx;
  font-weight: 800;
  color: $ink;
}

.sub {
  font-size: 24rpx;
  color: $muted;
}

.seg {
  display: flex;
  padding: 8rpx;
  margin-bottom: 24rpx;
  background: #ebe4dc;
  border-radius: 999rpx;
}

.seg-item {
  flex: 1;
  text-align: center;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 28rpx;
  color: $muted;
  border-radius: 999rpx;
  transition: all 0.2s;
}

.seg-item.active {
  color: $green;
  font-weight: 700;
  background: #fff;
  box-shadow: 0 4rpx 14rpx rgba(42, 36, 31, 0.1);
}

.card {
  margin-bottom: 18rpx;
  padding: 28rpx;
  background: #fff;
  border-radius: 26rpx;
  box-shadow: 0 6rpx 24rpx rgba(42, 36, 31, 0.05);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.name {
  min-width: 0;
  font-size: 30rpx;
  font-weight: 700;
  color: $ink;
}

.tag {
  flex-shrink: 0;
  padding: 4rpx 16rpx;
  font-size: 22rpx;
  border-radius: 999rpx;
}

.tag--ok { color: $green; background: rgba(22, 163, 74, 0.12); }
.tag--warn { color: #d46b08; background: rgba(212, 107, 8, 0.12); }
.tag--end { color: $muted; background: #f1ece6; }

.remain {
  margin-top: 20rpx;
}

.remain-num {
  font-size: 56rpx;
  font-weight: 800;
  color: #f37021;
}

.remain-total {
  font-size: 26rpx;
  color: $muted;
}

.bar {
  height: 12rpx;
  margin-top: 14rpx;
  background: #f1ece6;
  border-radius: 999rpx;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #f37021, #ffa15c);
  border-radius: 999rpx;
}

.meta {
  margin-top: 16rpx;
  font-size: 24rpx;
  color: $muted;
}

.group-date {
  display: block;
  margin: 24rpx 8rpx 14rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: $muted;
}

.card--rec {
  padding: 24rpx 28rpx;
}

.deduct {
  flex-shrink: 0;
  font-size: 30rpx;
  font-weight: 800;
  color: #f37021;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 14rpx;
}

.chip {
  padding: 4rpx 16rpx;
  font-size: 22rpx;
  color: $green;
  background: rgba(22, 163, 74, 0.1);
  border-radius: 999rpx;
}

.chip--muted {
  color: $muted;
  background: #f1ece6;
}

.note {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.5;
  color: $muted;
}

.photo-wrap {
  position: relative;
  margin-top: 18rpx;
  border-radius: 20rpx;
  overflow: hidden;
  background: #f1ece6;
}

.photo {
  display: block;
  width: 100%;
  height: 360rpx;
}

.photo-tip {
  position: absolute;
  left: 16rpx;
  bottom: 16rpx;
  padding: 4rpx 16rpx;
  font-size: 21rpx;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 999rpx;
}

.empty {
  padding: 80rpx 0;
  text-align: center;
  color: $muted;
  font-size: 26rpx;
}
</style>
