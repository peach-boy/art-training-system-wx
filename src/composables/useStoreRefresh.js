import { ref, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { getCurrentStoreId } from '@/utils/storage'
import { onStoreChanged, offStoreChanged } from '@/utils/storeEvents'

/**
 * 店铺切换或页面再次显示时执行 reload（避免首页切店后立刻进 Tab 仍显示旧数据）
 * @param {() => void | Promise<void>} reloadFn
 */
export function useStoreRefresh(reloadFn) {
  const userStore = useUserStore()
  const lastStoreId = ref(getCurrentStoreId())
  let lastRevision = userStore.storeRevision

  const runReload = () => {
    lastStoreId.value = getCurrentStoreId()
    lastRevision = userStore.storeRevision
    return reloadFn()
  }

  const onStoreChange = () => {
    runReload()
  }

  onStoreChanged(onStoreChange)

  onShow(() => {
    const cur = getCurrentStoreId()
    if (cur !== lastStoreId.value || userStore.storeRevision !== lastRevision) {
      runReload()
    }
  })

  onUnmounted(() => {
    offStoreChanged(onStoreChange)
  })

  return { runReload }
}
