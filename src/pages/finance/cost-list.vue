<template>
  <view class="cost-page">
    <view class="month-nav">
      <view class="month-btn" @tap="prevMonth">‹</view>
      <text class="month-label">{{ currentYear }} 年 {{ currentMonth }} 月</text>
      <view class="month-btn" @tap="nextMonth">›</view>
    </view>

    <view class="sum-card">
      <text class="sum-value">¥{{ formatMoney(totalDisplay) }}</text>
      <text class="sum-label">{{ userStore.isPrivilegedAdmin ? '成本合计' : '成本合计（不含固定成本）' }}</text>
    </view>

    <view v-if="isAllStores()" class="store-warn">
      请先在首页选择具体店铺后再录入成本
    </view>

    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="displayList.length === 0" class="empty">本月暂无成本项</view>
    <view v-else class="entry-list">
      <view
        v-for="item in displayList"
        :key="item.id"
        class="entry card"
        @tap="goEdit(item)"
      >
        <view class="entry-head">
          <text class="entry-name">{{ item.name || '—' }}</text>
          <text class="entry-amount">¥{{ formatMoney(item.amount) }}</text>
        </view>
        <view class="entry-meta">
          <text v-if="item.category" class="entry-tag">{{ item.category }}</text>
          <text>{{ item.entryDate || '—' }}</text>
        </view>
        <view v-if="item.notes" class="entry-notes">{{ item.notes }}</view>
      </view>
    </view>

    <view class="fab-wrap">
      <button class="fab" :disabled="isAllStores()" @tap="goAdd">+ 录入成本</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { financialEntryAPI } from '@/api'
import { requireLogin, useUserStore } from '@/stores/user'
import { useStoreRefresh } from '@/composables/useStoreRefresh'
import {
  isAllStores,
  filterCostListForRole,
  sumCostAmount
} from '@/utils/finance'
import { formatMoney } from '@/utils/format'

const userStore = useUserStore()

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth() + 1)
const loading = ref(false)
const costList = ref([])

const displayList = computed(() =>
  filterCostListForRole(costList.value, userStore.isPrivilegedAdmin)
)

const totalDisplay = computed(() => sumCostAmount(displayList.value))

onShow(() => {
  if (!requireLogin()) return
  if (!userStore.isFinanceStaff) {
    uni.showToast({ title: '无权限访问', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 800)
    return
  }
  loadList()
})

useStoreRefresh(() => loadList())

async function loadList() {
  loading.value = true
  try {
    costList.value =
      (await financialEntryAPI.list(currentYear.value, currentMonth.value, 'cost')) || []
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function prevMonth() {
  if (currentMonth.value === 1) {
    currentYear.value -= 1
    currentMonth.value = 12
  } else {
    currentMonth.value -= 1
  }
  loadList()
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentYear.value += 1
    currentMonth.value = 1
  } else {
    currentMonth.value += 1
  }
  loadList()
}

function goAdd() {
  if (isAllStores()) {
    uni.showToast({ title: '请先在首页选择店铺', icon: 'none' })
    return
  }
  uni.navigateTo({
    url: `/pages/finance/cost-form?year=${currentYear.value}&month=${currentMonth.value}`
  })
}

function goEdit(item) {
  uni.navigateTo({
    url: `/pages/finance/cost-form?id=${item.id}&year=${currentYear.value}&month=${currentMonth.value}`
  })
}
</script>

<style lang="scss" scoped>
.cost-page {
  min-height: 100vh;
  background: var(--bg-page);
  padding: 24rpx 24rpx calc(140rpx + env(safe-area-inset-bottom));
}

.month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.month-btn {
  width: 64rpx;
  height: 64rpx;
  line-height: 60rpx;
  text-align: center;
  font-size: 40rpx;
  color: var(--primary);
  background: var(--canvas);
  border-radius: var(--radius-full);
  border: 1rpx solid var(--hairline);
}

.month-label {
  font-size: 32rpx;
  font-weight: 600;
  min-width: 240rpx;
  text-align: center;
}

.sum-card {
  background: linear-gradient(135deg, #fff1f0, #ffccc7);
  border-radius: var(--radius-md);
  padding: 32rpx;
  text-align: center;
  margin-bottom: 24rpx;
}

.sum-value {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #ff4d4f;
}

.sum-label {
  display: block;
  font-size: 24rpx;
  color: var(--text-muted);
  margin-top: 8rpx;
}

.store-warn {
  background: #fffbe6;
  border: 1rpx solid #ffe58f;
  color: #ad6800;
  padding: 20rpx 24rpx;
  border-radius: var(--radius-sm);
  font-size: 26rpx;
  margin-bottom: 20rpx;
}

.card {
  background: var(--canvas);
  border-radius: var(--radius-md);
  border: 1rpx solid var(--hairline);
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.entry-head {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.entry-name {
  font-size: 30rpx;
  font-weight: 600;
  flex: 1;
}

.entry-amount {
  font-size: 30rpx;
  font-weight: 700;
  color: #ff4d4f;
}

.entry-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  font-size: 24rpx;
  color: var(--text-muted);
}

.entry-tag {
  padding: 4rpx 12rpx;
  background: var(--bg-page);
  border-radius: var(--radius-full);
}

.entry-notes {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: var(--text-muted);
  line-height: 1.4;
}

.fab-wrap {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
}

.fab {
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  background: var(--primary);
  color: #fff;
  font-size: 30rpx;
}

.fab[disabled] {
  opacity: 0.5;
}

.empty {
  text-align: center;
  padding: 60rpx;
  color: var(--text-muted);
  font-size: 28rpx;
}
</style>
