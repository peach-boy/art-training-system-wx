<template>
  <PageShell :title="pageTitle" :tab-bar="true" tab-active="home" :show-back="false">
    <view class="hello">
      <view class="hello__text">
        <text class="hello__greet">{{ greeting }}，{{ userStore.displayName }}</text>
        <text class="hello__role" :class="'hello__role--' + roleDisplay.badgeTheme">{{ roleDisplay.subLabel }}</text>
      </view>
      <view class="hello__avatar" :class="'hello__avatar--' + roleDisplay.badgeTheme">{{ avatarText }}</view>
    </view>

    <StoreSwitcher v-if="userStore.isAdmin" />

    <view class="cta" hover-class="cta--hover" @tap="goRecord">
      <view class="cta__text">
        <text class="cta__title">录入课时</text>
        <text class="cta__sub">选学员、点节数，可拍照留档</text>
      </view>
      <view class="cta__plus">+</view>
    </view>

    <view v-if="userStore.isTeacher" class="stats">
      <view class="stat">
        <text class="stat__value">{{ monthClassHours }}</text>
        <text class="stat__label">本月课时</text>
      </view>
      <view class="stat">
        <text class="stat__value">{{ recordTotal }}</text>
        <text class="stat__label">记录总数</text>
      </view>
    </view>

    <view v-else-if="showAdminStats" class="stats">
      <view class="stat">
        <text class="stat__value">{{ adminStats.totalCount }}</text>
        <text class="stat__label">本周课时</text>
      </view>
      <view class="stat">
        <text class="stat__value">{{ adminStats.distinctStudents }}</text>
        <text class="stat__label">上课学员</text>
      </view>
      <view class="stat stat--warn">
        <text class="stat__value">{{ adminStats.feeOverdue }}</text>
        <text class="stat__label">待续费</text>
      </view>
    </view>

    <view v-if="userStore.isPrivilegedAdmin && !statsLoading" class="admin-hint">
      超级管理员：门店统计与财务报表请在 PC 后台查看
    </view>

    <view class="menu">
      <view class="menu-item" hover-class="menu-item--hover" @tap="goAttendance">
        <view class="menu-icon menu-icon--blue">课</view>
        <view class="menu-main">
          <text class="menu-title">课时记录</text>
          <text class="menu-sub">按日、周、月查看已录入课时</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view v-if="userStore.isAdmin" class="menu-item" hover-class="menu-item--hover" @tap="goStudents">
        <view class="menu-icon menu-icon--orange">生</view>
        <view class="menu-main">
          <text class="menu-title">学员列表</text>
          <text class="menu-sub">课包、剩余课时与上课记录</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
      <view v-if="userStore.isFinanceStaff" class="menu-item" hover-class="menu-item--hover" @tap="goCost">
        <view class="menu-icon menu-icon--teal">¥</view>
        <view class="menu-main">
          <text class="menu-title">录入成本</text>
          <text class="menu-sub">门店成本与支出记录</text>
        </view>
        <text class="menu-arrow">›</text>
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
import { getRoleDisplay } from '@/utils/role'

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

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const roleDisplay = computed(() => getRoleDisplay(userStore.role))

const pageTitle = computed(() =>
  roleDisplay.value.isTeacher ? '员工首页' : '管理首页'
)

const quickSectionTitle = computed(() =>
  roleDisplay.value.isTeacher ? '员工快捷操作' : '管理快捷操作'
)

/** 普通/财务管理员展示门店统计；超管移动端不拉统计 */
const showAdminStats = computed(
  () => userStore.isAdmin && !userStore.isPrivilegedAdmin
)

onShow(() => {
  if (!requireLogin()) return
  if (userStore.role === 'parent') {
    uni.reLaunch({ url: '/pages/parent/home' })
    return
  }
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
$ink: #2a241f;
$muted: #8a8178;
$orange: #f37021;

.hello {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.hello__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10rpx;
}

.hello__greet {
  font-size: 40rpx;
  font-weight: 700;
  color: $ink;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hello__role {
  padding: 4rpx 18rpx;
  font-size: 22rpx;
  font-weight: 600;
  border-radius: 999rpx;
}

.hello__role--teacher { color: $orange; background: rgba(243, 112, 33, 0.12); }
.hello__role--admin { color: #2f54eb; background: rgba(47, 84, 235, 0.1); }

.hello__avatar {
  flex-shrink: 0;
  width: 88rpx;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
  border-radius: 30rpx;
}

.hello__avatar--teacher { background: linear-gradient(135deg, #f37021, #ff9a4d); }
.hello__avatar--admin { background: linear-gradient(135deg, #2f54eb, #6d8cff); }

/* 主操作 */
.cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
  padding: 36rpx 32rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #f37021 0%, #ff9a4d 100%);
  box-shadow: 0 16rpx 36rpx rgba(243, 112, 33, 0.28);
}

.cta--hover { opacity: 0.92; }

.cta__text {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.cta__title {
  font-size: 40rpx;
  font-weight: 700;
  color: #fff;
}

.cta__sub {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
}

.cta__plus {
  width: 88rpx;
  height: 88rpx;
  line-height: 80rpx;
  text-align: center;
  font-size: 60rpx;
  color: #f37021;
  background: #fff;
  border-radius: 50%;
}

/* 数据 */
.stats {
  display: flex;
  margin-bottom: 24rpx;
  padding: 28rpx 0;
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 6rpx 24rpx rgba(42, 36, 31, 0.05);
}

.stat {
  flex: 1;
  text-align: center;
  border-right: 1rpx solid #f0eae3;
}

.stat:last-child { border-right: none; }

.stat__value {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: $ink;
}

.stat--warn .stat__value { color: #c13515; }

.stat__label {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: $muted;
}

.admin-hint {
  margin-bottom: 24rpx;
  padding: 18rpx 24rpx;
  font-size: 23rpx;
  line-height: 1.5;
  color: #ad6800;
  background: #fffbe6;
  border-radius: 16rpx;
}

/* 菜单 */
.menu {
  background: #fff;
  border-radius: 24rpx;
  box-shadow: 0 6rpx 24rpx rgba(42, 36, 31, 0.05);
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding: 26rpx 28rpx;
  border-bottom: 1rpx solid #f0eae3;
}

.menu-item:last-child { border-bottom: none; }
.menu-item--hover { background: #faf6f1; }

.menu-icon {
  flex-shrink: 0;
  width: 76rpx;
  height: 76rpx;
  line-height: 76rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  border-radius: 24rpx;
}

.menu-icon--blue { color: #3d7dff; background: rgba(61, 125, 255, 0.12); }
.menu-icon--orange { color: $orange; background: rgba(243, 112, 33, 0.12); }
.menu-icon--teal { color: #0e8a8a; background: rgba(26, 166, 166, 0.14); }

.menu-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.menu-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $ink;
}

.menu-sub {
  font-size: 22rpx;
  color: $muted;
}

.menu-arrow {
  font-size: 40rpx;
  line-height: 1;
  color: #cfc6bc;
}
</style>
