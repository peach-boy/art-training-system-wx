<template>
  <PageShell title="我的" :tab-bar="true" tab-active="profile">
    <view class="profile card">
      <view class="avatar">{{ avatarText }}</view>
      <view class="info">
        <text class="name">{{ userStore.displayName }}</text>
        <text class="role">{{ roleLabel }}</text>
        <text v-if="userStore.userInfo?.username" class="account">{{ userStore.userInfo.username }}</text>
      </view>
    </view>

    <view v-if="userStore.isAdmin && stores.length" class="card">
      <text class="section-title">当前店铺</text>
      <picker :range="storeNames" :value="storeIndex" @change="onStoreChange">
        <view class="store-picker">{{ currentStoreName || '选择店铺' }}</view>
      </picker>
    </view>

    <view class="actions card">
      <button class="action-btn" @tap="goHome">返回首页</button>
      <button class="action-btn action-btn--danger" @tap="onLogout">退出登录</button>
    </view>
  </PageShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import PageShell from '@/components/PageShell.vue'
import { useUserStore, requireLogin } from '@/stores/user'
import { storeAPI } from '@/api'
import { getCurrentStoreId, setCurrentStoreId } from '@/utils/storage'

const userStore = useUserStore()
const stores = ref([])
const storeIndex = ref(0)

const avatarText = computed(() => (userStore.displayName || '用').slice(0, 1))

const roleLabel = computed(() => {
  const map = {
    teacher: '教师',
    super_admin: '超级管理员',
    finance_admin: '财务管理员',
    admin: '管理员'
  }
  return map[userStore.role] || ''
})

const storeNames = computed(() => stores.value.map((s) => s.storeName || s.name))

const currentStoreName = computed(() => {
  const id = getCurrentStoreId()
  const found = stores.value.find((s) => String(s.storeId) === String(id))
  return found?.storeName || found?.name || ''
})

onShow(async () => {
  if (!requireLogin()) return
  if (userStore.isAdmin) {
    try {
      stores.value = (await storeAPI.getList()) || []
      const cur = getCurrentStoreId()
      const idx = stores.value.findIndex((s) => String(s.storeId) === String(cur))
      storeIndex.value = idx >= 0 ? idx : 0
    } catch (e) {
      stores.value = []
    }
  }
})

function onStoreChange(e) {
  const idx = Number(e.detail.value)
  storeIndex.value = idx
  const s = stores.value[idx]
  if (s?.storeId != null) {
    setCurrentStoreId(s.storeId)
    userStore.switchStore(s.storeId)
    uni.showToast({ title: '已切换店铺', icon: 'success' })
  }
}

function goHome() {
  uni.reLaunch({ url: '/pages/home/index' })
}

function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定退出当前账号？',
    success: async (res) => {
      if (!res.confirm) return
      await userStore.logout()
      uni.reLaunch({ url: '/pages/login/login' })
    }
  })
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

.profile {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
  font-size: 40rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.name {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
}

.role,
.account {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--text-muted);
}

.section-title {
  display: block;
  font-size: 26rpx;
  color: var(--text-muted);
  margin-bottom: 16rpx;
}

.store-picker {
  padding: 20rpx;
  background: var(--bg-page);
  border-radius: var(--radius-sm);
  font-size: 28rpx;
}

.action-btn {
  margin-bottom: 16rpx;
  background: var(--bg-page);
  color: var(--text-ink);
  border-radius: var(--radius-sm);
}

.action-btn--danger {
  color: #c13515;
}

.action-btn::after {
  border: none;
}
</style>
