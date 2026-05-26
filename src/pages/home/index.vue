<template>
  <PageShell title="首页" :tab-bar="true" tab-active="home">
    <StoreSwitcher />

    <view v-if="showWelcome" class="welcome card">
      <view class="welcome__avatar">{{ avatarText }}</view>
      <view class="welcome__text">
        <text class="welcome__name">{{ userStore.displayName }}</text>
        <text v-if="roleLabel" class="welcome__role">{{ roleLabel }}</text>
      </view>
    </view>

    <view v-if="statsLoading" class="stats-loading card">数据加载中…</view>

    <view v-else-if="userStore.isTeacher" class="stats-row">
      <view class="stat card">
        <text class="stat__value">{{ monthClassHours }}</text>
        <text class="stat__label">本月课时</text>
      </view>
      <view class="stat card">
        <text class="stat__value">{{ recordTotal }}</text>
        <text class="stat__label">记录总数</text>
      </view>
    </view>

    <view v-else-if="!statsLoading && showAdminStats" class="stats-row">
      <view class="stat card">
        <text class="stat__value">{{ adminStats.totalCount }}</text>
        <text class="stat__label">本周课时</text>
      </view>
      <view class="stat card">
        <text class="stat__value">{{ adminStats.distinctStudents }}</text>
        <text class="stat__label">上课学员</text>
      </view>
      <view class="stat card stat--warn">
        <text class="stat__value">{{ adminStats.feeOverdue }}</text>
        <text class="stat__label">待续费</text>
      </view>
    </view>

    <view class="quick card">
      <text class="section-title">快捷操作</text>
      <view class="quick-grid">
        <view class="quick-item" @tap="goRecord">
          <text class="quick-item__icon">+</text>
          <text>录入课时</text>
        </view>
        <view class="quick-item" @tap="goAttendance">
          <text class="quick-item__icon">☰</text>
          <text>课时记录</text>
        </view>
        <view v-if="userStore.isAdmin" class="quick-item" @tap="goStudents">
          <text class="quick-item__icon">👤</text>
          <text>学员列表</text>
        </view>
        <view v-if="userStore.isFinanceStaff" class="quick-item" @tap="goCost">
          <text class="quick-item__icon">¥</text>
          <text>录入成本</text>
        </view>
      </view>
    </view>
  </PageShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageShell from '@/components/PageShell.vue'
import StoreSwitcher from '@/components/StoreSwitcher.vue'
import { useUserStore, requireLogin } from '@/stores/user'
import { useStoreRefresh } from '@/composables/useStoreRefresh'
import { attendanceAPI, dashboardAPI } from '@/api'

function weekRange() {
  const now = new Date()
  const day = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - day + 1)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start: fmt(monday), end: fmt(sunday) }
}

const userStore = useUserStore()

const statsLoading = ref(false)
const monthClassHours = ref('-')
const recordTotal = ref('-')
const adminStats = ref({
  totalCount: '-',
  distinctStudents: '-',
  feeOverdue: '-'
})

function resetStatsPlaceholder() {
  monthClassHours.value = '-'
  recordTotal.value = '-'
  adminStats.value = {
    totalCount: '-',
    distinctStudents: '-',
    feeOverdue: '-'
  }
}

const avatarText = computed(() => (userStore.displayName || '用').slice(0, 1))

/** 系统管理员（超管）移动端首页不展示用户信息卡片 */
const showWelcome = computed(() => !userStore.isPrivilegedAdmin)

/** 仅普通/财务管理员展示工作台统计；超管请用 PC 端 */
const showAdminStats = computed(
  () => userStore.isAdmin && !userStore.isPrivilegedAdmin
)

const roleLabel = computed(() => {
  if (userStore.isPrivilegedAdmin) return ''
  const map = {
    teacher: '教师',
    finance_admin: '财务管理员',
    admin: '管理员'
  }
  return map[userStore.role] || ''
})

onShow(() => {
  if (!requireLogin()) return
  loadStats()
})

useStoreRefresh(() => loadStats())

async function loadStats() {
  statsLoading.value = true
  resetStatsPlaceholder()
  try {
    if (userStore.isTeacher) {
      try {
        const [summary, pageData] = await Promise.all([
          attendanceAPI.getMonthlySummary(),
          attendanceAPI.getPage({ current: 1, size: 1 })
        ])
        monthClassHours.value =
          summary?.classHoursTotal != null ? String(summary.classHoursTotal) : '0'
        recordTotal.value = pageData?.total != null ? String(pageData.total) : '0'
      } catch (e) {
        monthClassHours.value = '-'
        recordTotal.value = '-'
      }
      return
    }

    if (showAdminStats.value) {
      try {
        const { start, end } = weekRange()
        const [stats, counts] = await Promise.all([
          dashboardAPI.getStats(start, end),
          dashboardAPI.getStudentCounts()
        ])
        const rows = stats?.rows || []
        adminStats.value = {
          totalCount: rows.reduce((s, r) => s + Number(r.count || 0), 0),
          distinctStudents: stats?.distinctStudents ?? '-',
          feeOverdue: counts?.feeOverdue ?? '-'
        }
      } catch (e) {
        adminStats.value = { totalCount: '-', distinctStudents: '-', feeOverdue: '-' }
      }
    }
  } finally {
    statsLoading.value = false
  }
}

function goRecord() {
  uni.navigateTo({ url: '/pages/attendance/form?mode=create' })
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
.card {
  background: var(--canvas);
  border-radius: var(--radius-md);
  border: 1rpx solid var(--hairline);
  padding: 28rpx;
  margin-bottom: 24rpx;
}

.welcome {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.welcome__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 36rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome__name {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: var(--text-ink);
}

.welcome__role {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: var(--text-muted);
}

.stats-loading {
  text-align: center;
  padding: 32rpx;
  font-size: 26rpx;
  color: var(--text-muted);
  margin-bottom: 24rpx;
}

.stats-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.stat {
  flex: 1;
  margin-bottom: 0;
  text-align: center;
  padding: 24rpx 12rpx;
}

.stat__value {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: var(--primary);
}

.stat--warn .stat__value {
  color: #c13515;
}

.stat__label {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: var(--text-muted);
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 20rpx;
  color: var(--text-ink);
}

.quick-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.quick-item {
  width: calc(33.33% - 14rpx);
  min-width: 180rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 20rpx 0;
  font-size: 24rpx;
  color: var(--text-ink);
  background: var(--bg-page);
  border-radius: var(--radius-sm);
}

.quick-item__icon {
  font-size: 40rpx;
  color: var(--primary);
}
</style>
