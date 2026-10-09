<template>
  <view v-if="show" class="store-switch card">
    <text class="store-switch__label">当前店铺</text>
    <picker :range="pickerLabels" :value="storeIndex" @change="onStoreChange">
      <view class="store-switch__picker">
        <view class="store-dot" :class="{ 'store-dot--all': isAllMode }" />
        <text class="store-switch__name">{{ currentStoreName }}</text>
        <text class="store-switch__arrow">▼</text>
      </view>
    </picker>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { storeAPI } from '@/api'
import { getCurrentStoreId, setCurrentStoreId } from '@/utils/storage'
import { ALL_STORES_ID, canSelectAllStores, isAllStoresMode } from '@/utils/storeScope'

const userStore = useUserStore()
const stores = ref([])
const storeIndex = ref(0)

const activeStores = computed(() =>
  (stores.value || []).filter((s) => s.status === 'active' || s.status == null)
)

const canUseAll = computed(() => canSelectAllStores(userStore, activeStores.value.length))

const pickerOptions = computed(() => {
  const opts = []
  if (canUseAll.value) {
    opts.push({ id: ALL_STORES_ID, label: '全部店铺' })
  }
  for (const s of activeStores.value) {
    opts.push({ id: String(s.storeId), label: s.storeName || s.name || `店铺#${s.storeId}` })
  }
  return opts
})

const pickerLabels = computed(() => pickerOptions.value.map((o) => o.label))

const show = computed(() => {
  if (!userStore.isAdmin) return false
  if (userStore.isPrivilegedAdmin) return activeStores.value.length > 0
  return canUseAll.value || activeStores.value.length > 1
})

const currentId = computed(() => {
  const id = userStore.currentStoreId || getCurrentStoreId()
  return id != null ? String(id) : ''
})

const isAllMode = computed(() => isAllStoresMode(currentId.value))

const currentStoreName = computed(() => {
  if (isAllMode.value) return '全部店铺'
  const found = activeStores.value.find((s) => String(s.storeId) === currentId.value)
  return found?.storeName || found?.name || pickerLabels.value[0] || '选择店铺'
})

function syncPickerIndex() {
  const opts = pickerOptions.value
  if (!opts.length) {
    storeIndex.value = 0
    return
  }
  let idx = opts.findIndex((o) => o.id === currentId.value)
  if (idx < 0) idx = 0
  storeIndex.value = idx
}

function ensureValidStoreSelection() {
  const opts = pickerOptions.value
  if (!opts.length) return

  const cur = getCurrentStoreId()
  const ids = opts.map((o) => o.id)

  if (userStore.isPrivilegedAdmin) {
    if (!cur || cur === '') {
      setCurrentStoreId(ALL_STORES_ID)
      userStore.switchStore(ALL_STORES_ID)
    } else if (cur !== ALL_STORES_ID && !ids.includes(String(cur))) {
      setCurrentStoreId(ALL_STORES_ID)
      userStore.switchStore(ALL_STORES_ID)
    }
    return
  }

  if (canUseAll.value && cur === ALL_STORES_ID) return

  const allowed = (userStore.allowedStoreIds || []).map(String)
  if (cur && ids.includes(String(cur))) return
  if (cur && allowed.includes(String(cur))) {
    setCurrentStoreId(cur)
    userStore.switchStore(cur)
    return
  }

  const fallback = opts.find((o) => o.id !== ALL_STORES_ID) || opts[0]
  if (fallback) {
    setCurrentStoreId(fallback.id)
    userStore.switchStore(fallback.id)
  }
}

async function loadStores() {
  if (!userStore.isAdmin) {
    stores.value = []
    return
  }
  try {
    stores.value = (await storeAPI.getList()) || []
    ensureValidStoreSelection()
    userStore.currentStoreId = getCurrentStoreId()
    syncPickerIndex()
  } catch (e) {
    stores.value = []
  }
}

onShow(() => {
  loadStores()
})

function onStoreChange(e) {
  const idx = Number(e.detail.value)
  const opt = pickerOptions.value[idx]
  if (!opt) return
  storeIndex.value = idx
  setCurrentStoreId(opt.id)
  userStore.switchStore(opt.id)
  const name = opt.id === ALL_STORES_ID ? '全部店铺' : opt.label
  uni.showToast({ title: `已切换到：${name}`, icon: 'none' })
}

defineExpose({ reload: loadStores })
</script>

<style lang="scss" scoped>
.store-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 24rpx;
  background: var(--canvas);
  border-radius: var(--radius-md);
  border: 1rpx solid var(--hairline);
}

.store-switch__label {
  flex-shrink: 0;
  font-size: 26rpx;
  color: var(--text-muted);
}

.store-switch__picker {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10rpx;
  padding: 12rpx 20rpx;
  background: var(--bg-page);
  border-radius: var(--radius-sm);
}

.store-dot {
  flex-shrink: 0;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #f37021;
}

.store-dot--all {
  background: linear-gradient(135deg, #f37021, #3a2418);
}

.store-switch__name {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-ink);
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store-switch__arrow {
  font-size: 20rpx;
  color: var(--text-muted);
}
</style>
