<template>
  <view class="pkg-records">
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="notFound" class="empty">课包不存在或无权查看</view>
    <template v-else-if="pkg">
      <view class="banner">
        <view class="banner-main">
          <text class="banner-title">课包上课记录</text>
          <text class="banner-sub">供家长核对 · 按上课日期从早到晚</text>
        </view>
        <view class="banner-right">
          <text class="banner-student">{{ pkg.studentName || studentName || '—' }}</text>
          <text class="banner-pkg">{{ pkg.packageName || '—' }}</text>
        </view>
      </view>

      <view class="summary">
        <view class="summary-main">
          <view class="big">
            <text class="big-num">{{ formatRemainingClasses(pkg.remainingClasses) }}</text>
            <text class="big-total"> / {{ formatRemainingClasses(pkg.totalClasses) }} 节</text>
          </view>
          <text class="status" :class="'status--' + (pkg.status || 'active')">{{ packageStatusLabel(pkg.status) }}</text>
        </view>
        <view class="grid">
          <view class="cell">
            <text class="cell-label">购买</text>
            <text class="cell-val">{{ pkg.purchaseDate || '—' }}</text>
          </view>
          <view class="cell">
            <text class="cell-label">有效期至</text>
            <text class="cell-val">{{ pkg.expiryDate || '—' }}</text>
          </view>
          <view class="cell">
            <text class="cell-label">实付</text>
            <text class="cell-val">{{ formatMoney(pkg.actualPrice) }}</text>
          </view>
          <view v-if="pkg.assignedTeacherName" class="cell">
            <text class="cell-label">归属员工</text>
            <text class="cell-val">{{ pkg.assignedTeacherName }}</text>
          </view>
        </view>
        <view v-if="pkg.notes" class="summary-notes">备注：{{ pkg.notes }}</view>
      </view>

      <view class="records-head">
        <text class="records-title">上课记录</text>
        <text class="records-count">共 {{ records.length }} 条</text>
      </view>

      <view v-if="records.length === 0" class="empty card-empty">暂无上课记录</view>
      <view v-else class="records-list">
        <view v-for="(group, gi) in groupedRecords" :key="group.key" class="month-group">
          <view class="month-label">{{ group.label }} · {{ group.rows.length }} 节</view>
          <view class="month-card">
            <view
              v-for="(item, index) in group.rows"
              :key="item.recordId"
              class="rec"
              hover-class="rec--hover"
              @tap="goRecordDetail(item)"
            >
              <text class="rec-index">{{ groupStartIndex(gi) + index + 1 }}</text>
              <view class="rec-main">
                <view class="rec-top">
                  <text class="rec-date">{{ shortDate(item.classDate) }}</text>
                  <text class="rec-course">{{ item.courseTypeName || '课程' }}</text>
                  <text class="rec-type">{{ labelOf(item.lessonType) }}</text>
                </view>
                <text class="rec-meta">{{ recMeta(item) }}</text>
                <text v-if="item.notes" class="rec-note">{{ item.notes }}</text>
              </view>
              <text class="rec-deduct">-{{ formatClassHours(item.classesDeducted) }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="footer-hint">记录按上课日期升序排列，可与课包剩余课时对照</view>

      <view class="bar">
        <view
          class="bar-btn"
          :class="{ 'bar-btn--busy': exporting || records.length === 0 }"
          hover-class="bar-btn--hover"
          @tap="onExport"
        >
          {{ exporting ? '生成中…' : '导出图片，发给家长核对' }}
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { coursePackageAPI, fetchPackageAttendanceRecords } from '@/api'
import { requireLogin } from '@/stores/user'
import { labelOf } from '@/utils/lessonType'
import {
  packageStatusLabel,
  formatMoney
} from '@/utils/format'
import { formatClassHours, formatRemainingClasses } from '@/utils/classHours'
import { generatePackageReport, shareReportImage } from '@/utils/packageReport'

const loading = ref(true)
const notFound = ref(false)
const exporting = ref(false)
const pkg = ref(null)
const records = ref([])
const studentName = ref('')
let packageId = ''

const storeLabel = (item) =>
  item?.storeName || (item?.storeId ? `店铺#${item.storeId}` : '')

function shortDate(d) {
  return d ? String(d).slice(5) : '—'
}

function recMeta(item) {
  return [item.teacherName, storeLabel(item), item.coursewareName].filter(Boolean).join(' · ')
}

onLoad((query) => {
  if (!requireLogin()) return
  packageId = query.packageId || ''
  studentName.value = query.studentName ? decodeURIComponent(query.studentName) : ''
  loadData()
})

const groupedRecords = computed(() => {
  const groups = []
  let lastKey = null
  for (const r of records.value) {
    const key = r.classDate ? r.classDate.slice(0, 7) : '未知'
    if (key !== lastKey) {
      const [y, m] = key.split('-')
      const label = m ? `${y}年${parseInt(m, 10)}月` : key
      groups.push({ key, label, rows: [] })
      lastKey = key
    }
    groups[groups.length - 1].rows.push(r)
  }
  return groups
})

function groupStartIndex(groupIndex) {
  let n = 0
  for (let i = 0; i < groupIndex; i++) {
    n += groupedRecords.value[i].rows.length
  }
  return n
}

async function loadData() {
  loading.value = true
  notFound.value = false
  pkg.value = null
  records.value = []
  const id = Number(packageId)
  if (!id || Number.isNaN(id)) {
    notFound.value = true
    loading.value = false
    return
  }
  try {
    const p = await coursePackageAPI.getById(id)
    if (!p) {
      notFound.value = true
      return
    }
    pkg.value = p
    records.value = await fetchPackageAttendanceRecords(id)
  } catch (e) {
    notFound.value = true
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goRecordDetail(item) {
  if (!item?.recordId) return
  uni.navigateTo({ url: `/pages/attendance/detail?id=${item.recordId}` })
}

async function onExport() {
  if (exporting.value) return
  if (!records.value.length) {
    uni.showToast({ title: '暂无上课记录可导出', icon: 'none' })
    return
  }
  exporting.value = true
  uni.showLoading({ title: '生成中…', mask: true })
  try {
    const name = pkg.value.studentName || studentName.value || ''
    const path = await generatePackageReport(pkg.value, name, records.value)
    uni.hideLoading()
    shareReportImage(path)
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '生成失败', icon: 'none' })
  } finally {
    exporting.value = false
  }
}
</script>

<style lang="scss" scoped>
$ink: #2a241f;
$muted: #8a8178;

.pkg-records {
  min-height: 100vh;
  background: #f6f2ec;
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}

.banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 24rpx 28rpx;
  color: #fff;
  background: linear-gradient(135deg, #e8521a, #f37021 55%, #ff9155);
}

.banner-main,
.banner-right {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.banner-right { align-items: flex-end; }

.banner-title {
  font-size: 34rpx;
  font-weight: 800;
}

.banner-sub {
  font-size: 22rpx;
  opacity: 0.9;
}

.banner-student {
  font-size: 30rpx;
  font-weight: 700;
}

.banner-pkg {
  max-width: 320rpx;
  font-size: 22rpx;
  opacity: 0.92;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary {
  margin: 16rpx 24rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(42, 36, 31, 0.04);
}

.summary-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.big-num {
  font-size: 52rpx;
  font-weight: 800;
  color: #f37021;
}

.big-total {
  font-size: 24rpx;
  color: $muted;
}

.status {
  padding: 4rpx 18rpx;
  font-size: 22rpx;
  color: $muted;
  background: #f1ece6;
  border-radius: 999rpx;
}

.status--active {
  color: #389e0d;
  background: rgba(82, 196, 26, 0.12);
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx 0;
  margin-top: 14rpx;
  padding-top: 14rpx;
  border-top: 1rpx dashed #eadfd3;
}

.cell {
  width: 50%;
  display: flex;
  gap: 10rpx;
  font-size: 24rpx;
}

.cell-label {
  flex-shrink: 0;
  color: $muted;
}

.cell-val {
  min-width: 0;
  color: $ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-notes {
  margin-top: 12rpx;
  font-size: 22rpx;
  line-height: 1.5;
  color: $muted;
}

.records-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4rpx 32rpx 8rpx;
}

.records-title {
  font-size: 28rpx;
  font-weight: 700;
  color: $ink;
}

.records-count {
  font-size: 22rpx;
  color: $muted;
}

.month-group { padding: 0 24rpx 8rpx; }

.month-label {
  padding: 10rpx 6rpx 8rpx;
  font-size: 22rpx;
  font-weight: 700;
  color: #f37021;
}

.month-card {
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(42, 36, 31, 0.04);
  overflow: hidden;
}

.rec {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 16rpx 22rpx;
  border-bottom: 1rpx solid #f3eee8;
}

.rec:last-child { border-bottom: none; }
.rec--hover { background: #fbf8f5; }

.rec-index {
  flex-shrink: 0;
  width: 44rpx;
  text-align: center;
  font-size: 22rpx;
  color: #b7aea4;
}

.rec-main {
  flex: 1;
  min-width: 0;
}

.rec-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.rec-date {
  flex-shrink: 0;
  font-size: 27rpx;
  font-weight: 700;
  color: $ink;
}

.rec-course {
  min-width: 0;
  font-size: 25rpx;
  color: $ink;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rec-type {
  flex-shrink: 0;
  padding: 0 12rpx;
  font-size: 20rpx;
  color: #f37021;
  background: #fff3e8;
  border-radius: 999rpx;
}

.rec-meta,
.rec-note {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: $muted;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rec-deduct {
  flex-shrink: 0;
  font-size: 28rpx;
  font-weight: 800;
  color: #f37021;
}

.footer-hint {
  text-align: center;
  font-size: 21rpx;
  color: #b7aea4;
  padding: 20rpx;
}

.bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -6rpx 24rpx rgba(42, 36, 31, 0.08);
}

.bar-btn {
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #f37021, #ff8a3d);
  border-radius: 999rpx;
  box-shadow: 0 8rpx 20rpx rgba(243, 112, 33, 0.3);
}

.bar-btn--hover { opacity: 0.88; }
.bar-btn--busy { opacity: 0.5; }

.empty,
.card-empty {
  text-align: center;
  padding: 80rpx 32rpx;
  color: $muted;
  font-size: 28rpx;
}
</style>
