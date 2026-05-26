<template>
  <view v-if="record" class="page-detail">
    <view class="detail-hero">
      <view class="detail-name">{{ record.studentName || '—' }}</view>
      <view class="tag">{{ lessonTypeLabel }}</view>
    </view>

    <view v-if="imagePreview" class="detail-image-wrap" @tap="previewImage">
      <image class="detail-image" :src="imagePreview" mode="aspectFill" />
      <view class="detail-image-tip">点击查看大图</view>
    </view>

    <view class="detail-card">
      <view class="info-row">
        <text class="label">上课日期</text>
        <text>{{ record.classDate }} {{ record.dayOfWeekText || '' }}</text>
      </view>
      <view class="info-row">
        <text class="label">课包</text>
        <text>{{ record.packageName || '—' }}</text>
      </view>
      <view class="info-row">
        <text class="label">课程类型</text>
        <text>{{ record.courseTypeName || '—' }}</text>
      </view>
      <view class="info-row">
        <text class="label">课件</text>
        <text>{{ record.coursewareName || '—' }}</text>
      </view>
      <view class="info-row">
        <text class="label">授课老师</text>
        <text>{{ record.teacherName || '—' }}</text>
      </view>
      <view class="info-row">
        <text class="label">扣除课时</text>
        <text>{{ record.classesDeducted }}</text>
      </view>
      <view v-if="record.income != null" class="info-row">
        <text class="label">课时收入</text>
        <text>¥{{ record.income }}</text>
      </view>
      <view class="info-row">
        <text class="label">备注</text>
        <text class="info-value">{{ record.notes || '—' }}</text>
      </view>
      <view class="info-row">
        <text class="label">录入时间</text>
        <text>{{ recordedAtText }}</text>
      </view>
    </view>

    <view class="detail-footer">
      <button class="footer-btn" @tap="goEdit">修正课时</button>
    </view>
  </view>
  <view v-else class="empty">{{ loading ? '加载中...' : '记录不存在' }}</view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { attendanceAPI } from '@/api'
import { requireLogin } from '@/stores/user'
import { labelOf } from '@/utils/lessonType'
import { formatDateTime } from '@/utils/format'
import { imageFullUrl } from '@/utils/media'

const record = ref(null)
const loading = ref(true)
const lessonTypeLabel = ref('')
const recordedAtText = ref('-')
const imagePreview = ref('')
let recordId = ''

onLoad((query) => {
  if (!requireLogin()) return
  recordId = query.id || ''
  loadDetail()
})

async function loadDetail() {
  loading.value = true
  try {
    const data = await attendanceAPI.getById(recordId)
    record.value = data
    lessonTypeLabel.value = labelOf(data.lessonType)
    recordedAtText.value = formatDateTime(data.recordedAt)
    imagePreview.value = imageFullUrl(data.imageUrl)
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function previewImage() {
  if (!imagePreview.value) return
  uni.previewImage({ urls: [imagePreview.value] })
}

function goEdit() {
  uni.navigateTo({ url: `/pages/attendance/form?mode=edit&id=${recordId}` })
}
</script>

<style lang="scss" scoped>
.page-detail {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

.detail-hero {
  background: linear-gradient(145deg, #1a1a2e 0%, #243b5e 100%);
  padding: 40rpx 32rpx 48rpx;
  color: #fff;
}

.detail-name {
  font-size: 44rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
}

.tag {
  display: inline-block;
  padding: 8rpx 20rpx;
  border-radius: var(--radius-full);
  background: rgba(243, 112, 33, 0.25);
  color: #ffd4b8;
  font-size: 24rpx;
}

.detail-image-wrap {
  margin: -24rpx 24rpx 0;
  position: relative;
  border-radius: var(--radius-md);
  overflow: hidden;
  height: 360rpx;
  box-shadow: 0 12rpx 32rpx rgba(26, 26, 46, 0.12);
}

.detail-image {
  width: 100%;
  height: 100%;
}

.detail-image-tip {
  position: absolute;
  right: 16rpx;
  bottom: 16rpx;
  padding: 8rpx 16rpx;
  border-radius: var(--radius-full);
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 22rpx;
}

.detail-card {
  margin: 24rpx;
  background: var(--canvas);
  border-radius: var(--radius-md);
  padding: 8rpx 24rpx;
  border: 1rpx solid var(--hairline);
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid var(--hairline);
  font-size: 28rpx;
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  color: var(--text-muted);
  flex-shrink: 0;
}

.info-value {
  text-align: right;
  max-width: 60%;
  word-break: break-all;
}

.detail-footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  border-top: 1rpx solid var(--hairline);
}

.footer-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 32rpx;
  background: var(--primary);
  color: #fff;
}

.empty {
  text-align: center;
  padding: 80rpx;
  color: var(--text-muted);
}
</style>
