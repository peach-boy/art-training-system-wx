/** 全局店铺切换事件（首页切换后，各 Tab 页立即按新店铺刷新） */
export const STORE_CHANGED_EVENT = 'app-store-changed'

export function notifyStoreChanged(storeId) {
  uni.$emit(STORE_CHANGED_EVENT, storeId)
}

export function onStoreChanged(handler) {
  uni.$on(STORE_CHANGED_EVENT, handler)
}

export function offStoreChanged(handler) {
  uni.$off(STORE_CHANGED_EVENT, handler)
}
