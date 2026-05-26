<template>
  <view class="pkg-records">
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="notFound" class="empty">课包不存在或无权查看</view>
    <template v-else-if="pkg">
      <view class="banner">
        <view class="banner-title">课包上课记录</view>
        <view class="banner-sub">供家长核对 · 按上课日期从早到晚</view>
      </view>

      <view class="summary card">
        <view class="summary-row">
          <text class="summary-label">学员</text>
          <text>{{ pkg.studentName || studentName || '—' }}</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">课包</text>
          <text class="summary-strong">{{ pkg.packageName || '—' }}</text>
        </view>
        <view class="summary-grid">
          <view class="summary-cell">
            <text class="cell-label">状态</text>
            <text>{{ packageStatusLabel(pkg.status) }}</text>
          </view>
          <view class="summary-cell">
            <text class="cell-label">总课时</text>
            <text>{{ formatRemainingClasses(pkg.totalClasses) }}</text>
          </view>
          <view class="summary-cell">
            <text class="cell-label">剩余</text>
            <text class="cell-highlight">{{ formatRemainingClasses(pkg.remainingClasses) }}</text>
          </view>
          <view class="summary-cell">
            <text class="cell-label">实付</text>
            <text>{{ formatMoney(pkg.actualPrice) }}</text>
          </view>
        </view>
        <view class="summary-row">
          <text class="summary-label">购买日期</text>
          <text>{{ pkg.purchaseDate || '—' }}</text>
        </view>
        <view class="summary-row">
          <text class="summary-label">有效期至</text>
          <text>{{ pkg.expiryDate || '—' }}</text>
        </view>
        <view v-if="pkg.assignedTeacherName" class="summary-row">
          <text class="summary-label">归属老师</text>
          <text>{{ pkg.assignedTeacherName }}</text>
        </view>
        <view v-if="pkg.notes" class="summary-notes">
          <text class="summary-label">课包备注</text>
          <text>{{ pkg.notes }}</text>
        </view>
      </view>

      <view class="records-head">
        <text class="records-title">上课记录</text>
        <text class="records-count">共 {{ records.length }} 条</text>
      </view>

      <view v-if="records.length === 0" class="empty card-empty">暂无上课记录</view>
      <view v-else class="records-list">
        <view v-for="(group, gi) in groupedRecords" :key="group.key" class="month-group">
          <view class="month-label">{{ group.label }}</view>
          <view
            v-for="(item, index) in group.rows"
            :key="item.recordId"
            class="record card"
            @tap="goRecordDetail(item)"
          >
            <view class="record-head">
              <text class="record-date">{{ item.classDate || '—' }}</text>
              <text class="record-type">{{ labelOf(item.lessonType) }}</text>
            </view>
            <view class="record-meta">
              <text>{{ item.courseTypeName || '课程' }}</text>
              <text>扣 {{ formatClassHours(item.classesDeducted) }} 节</text>
            </view>
            <view v-if="item.coursewareName" class="record-extra">课件：{{ item.coursewareName }}</view>
            <view v-if="item.teacherName" class="record-extra">老师：{{ item.teacherName }}</view>
            <view v-if="item.notes" class="record-notes">{{ item.notes }}</view>
            <text class="record-index">#{{ groupStartIndex(gi) + index + 1 }}</text>
          </view>
        </view>
      </view>

      <view class="footer-hint">核对说明：记录按上课日期升序排列，可与课包剩余课时对照</view>
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

const loading = ref(true)
const notFound = ref(false)
const pkg = ref(null)
const records = ref([])
const studentName = ref('')
let packageId = ''

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
</script>

<style lang="scss" scoped>
.pkg-records {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 48rpx;
}

.banner {
  background: linear-gradient(135deg, #e8521a, #f37021 55%, #ff9155);
  padding: 40rpx 32rpx 36rpx;
  color: #fff;
}

.banner-title {
  font-size: 36rpx;
  font-weight: 700;
}

.banner-sub {
  font-size: 24rpx;
  opacity: 0.9;
  margin-top: 8rpx;
}

.card,
.record {
  background: var(--canvas);
  border-radius: var(--radius-md);
  border: 1rpx solid var(--hairline);
}

.summary {
  margin: 24rpx;
  padding: 24rpx;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  padding: 14rpx 0;
  font-size: 28rpx;
  border-bottom: 1rpx solid var(--hairline);
}

.summary-row:last-of-type {
  border-bottom: none;
}

.summary-label {
  color: var(--text-muted);
  flex-shrink: 0;
}

.summary-strong {
  font-weight: 600;
  text-align: right;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--hairline);
}

.summary-cell {
  background: var(--bg-page);
  border-radius: var(--radius-sm);
  padding: 16rpx;
  font-size: 26rpx;
}

.cell-label {
  display: block;
  font-size: 22rpx;
  color: var(--text-muted);
  margin-bottom: 6rpx;
}

.cell-highlight {
  color: var(--primary);
  font-weight: 600;
}

.summary-notes {
  padding-top: 16rpx;
  font-size: 26rpx;
  color: var(--text-muted);
  line-height: 1.5;
}

.records-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 32rpx 16rpx;
}

.records-title {
  font-size: 30rpx;
  font-weight: 600;
}

.records-count {
  font-size: 24rpx;
  color: var(--text-muted);
}

.month-group {
  padding: 0 24rpx 8rpx;
}

.month-label {
  font-size: 24rpx;
  color: var(--primary);
  font-weight: 600;
  padding: 16rpx 8rpx 12rpx;
}

.record {
  padding: 24rpx;
  margin-bottom: 16rpx;
  position: relative;
}

.record-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.record-date {
  font-size: 30rpx;
  font-weight: 600;
}

.record-type {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: var(--radius-full);
  background: var(--primary-light);
  color: var(--primary);
}

.record-meta {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
  color: var(--text-muted);
}

.record-extra {
  font-size: 24rpx;
  color: var(--text-muted);
  margin-top: 8rpx;
}

.record-notes {
  font-size: 24rpx;
  color: var(--text-ink);
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx dashed var(--hairline);
}

.record-index {
  position: absolute;
  right: 20rpx;
  bottom: 16rpx;
  font-size: 22rpx;
  color: #ccc;
}

.footer-hint {
  text-align: center;
  font-size: 22rpx;
  color: var(--text-muted);
  padding: 24rpx;
}

.empty,
.card-empty {
  text-align: center;
  padding: 80rpx 32rpx;
  color: var(--text-muted);
  font-size: 28rpx;
}
</style>
