/** 与 PC 端 localStorage currentStoreId === 'all' 一致 */
export const ALL_STORES_ID = 'all'

export function isAllStoresMode(storeId) {
  const id = storeId != null ? String(storeId) : ''
  return id === '' || id === ALL_STORES_ID
}

/**
 * 是否可在顶栏选择「全部店铺」：超管=全系统；多店管理员=授权店合计
 */
export function canSelectAllStores(userStore, activeStoreCount = 0) {
  if (userStore.isPrivilegedAdmin) return true
  const allowed = userStore.allowedStoreIds || []
  if (allowed.length > 1) return true
  return activeStoreCount > 1
}
