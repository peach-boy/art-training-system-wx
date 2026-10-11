<template>
  <view v-if="show" class="store-switch">
    <view class="store-switch__label mp-t">当前店铺</view>
    <picker
      class="store-switch__picker-host"
      :range="pickerLabels"
      :value="storeIndex"
      @change="onStoreChange"
    >
      <view class="store-switch__picker">
        <view class="store-dot" :class="{ 'store-dot--all': isAllMode }" />
        <view class="store-switch__name mp-t mp-t--ellipsis">{{ currentStoreName }}</view>
        <view class="store-switch__arrow mp-t">▾</view>
      </view>
    </picker>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
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

watch([pickerOptions, currentId], () => {
  syncPickerIndex()
})

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
  flex-direction: row;
  align-items: center;
  padding: 22rpx 24rpx;
  margin-bottom: 24rpx;
  background: #fff;
  border-radius: 28rpx;
  border: 1rpx solid var(--hairline);
  box-shadow: 0 6rpx 24rpx rgba(42, 36, 31, 0.05);
}

.store-switch__label {
  flex-shrink: 0;
  width: 132rpx;
  font-size: 26rpx;
  color: var(--text-muted);
  line-height: 1.4;
}

/* 微信 picker 默认不占宽，需单独拉满右侧 */
.store-switch__picker-host {
  flex: 1;
  width: 0;
  min-width: 0;
}

.store-switch__picker {
  display: flex;
  flex-direction: row;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  min-height: 72rpx;
  padding: 14rpx 20rpx;
  background: var(--bg-page);
  border-radius: 20rpx;
}

.store-dot {
  flex-shrink: 0;
  width: 16rpx;
  height: 16rpx;
  margin-right: 12rpx;
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
  font-weight: 600;
  color: var(--text-ink);
  text-align: left;
  line-height: 1.35;
}

.store-switch__arrow {
  flex-shrink: 0;
  margin-left: 12rpx;
  font-size: 22rpx;
  color: var(--text-muted);
  line-height: 1;
}
</style>
