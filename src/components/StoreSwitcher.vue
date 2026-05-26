<template>
  <view v-if="show" class="store-switch card">
    <text class="store-switch__label">当前店铺</text>
    <picker :range="storeNames" :value="storeIndex" @change="onStoreChange">
      <view class="store-switch__picker">
        <text class="store-switch__name">{{ currentStoreName || '选择店铺' }}</text>
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

const emit = defineEmits(['change'])

const userStore = useUserStore()
const stores = ref([])
const storeIndex = ref(0)

const show = computed(() => userStore.isAdmin && stores.value.length > 0)

const storeNames = computed(() => stores.value.map((s) => s.storeName || s.name))

const currentStoreName = computed(() => {
  const id = getCurrentStoreId()
  const found = stores.value.find((s) => String(s.storeId) === String(id))
  return found?.storeName || found?.name || storeNames.value[0] || ''
})

async function loadStores() {
  if (!userStore.isAdmin) {
    stores.value = []
    return
  }
  try {
    stores.value = (await storeAPI.getList()) || []
    const cur = getCurrentStoreId()
    let idx = stores.value.findIndex((s) => String(s.storeId) === String(cur))
    if (idx < 0 && stores.value.length) {
      idx = 0
      const first = stores.value[0]
      if (first?.storeId != null) {
        setCurrentStoreId(first.storeId)
        userStore.switchStore(first.storeId)
      }
    }
    storeIndex.value = idx >= 0 ? idx : 0
  } catch (e) {
    stores.value = []
  }
}

onShow(() => {
  loadStores()
})

function onStoreChange(e) {
  const idx = Number(e.detail.value)
  storeIndex.value = idx
  const s = stores.value[idx]
  if (s?.storeId != null) {
    setCurrentStoreId(s.storeId)
    userStore.switchStore(s.storeId)
    uni.showToast({ title: '已切换店铺', icon: 'success' })
    emit('change', s.storeId)
  }
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
  gap: 8rpx;
  padding: 12rpx 20rpx;
  background: var(--bg-page);
  border-radius: var(--radius-sm);
}

.store-switch__name {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store-switch__arrow {
  font-size: 20rpx;
  color: var(--text-muted);
}
</style>
