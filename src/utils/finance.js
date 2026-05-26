import { getCurrentStoreId } from './storage'

export const FIXED_COST_KEYS = ['房租', '物业费', '水电']

export const COST_CATEGORIES_SUPER = ['房租', '物业费', '水电', '租金', '工资', '物料采购', '运营费用', '其他']
export const COST_CATEGORIES_ADMIN = ['租金', '工资', '物料采购', '运营费用', '其他']

export function isAllStores() {
  const id = String(getCurrentStoreId() || '').trim().toLowerCase()
  return !id || id === 'all'
}

export function costBelongsToFixedBucket(record, key) {
  const cat = (record.category || '').trim()
  const nm = (record.name || '').trim()
  return cat === key || nm === key
}

export function isFixedCostEntry(record) {
  return FIXED_COST_KEYS.some((k) => costBelongsToFixedBucket(record, k))
}

export function formTouchesFixedCost(category, name) {
  const cat = (category || '').trim()
  const nm = (name || '').trim()
  return FIXED_COST_KEYS.some((k) => k === cat || k === nm)
}

export function costCategoriesForRole(isPrivilegedAdmin) {
  return isPrivilegedAdmin ? COST_CATEGORIES_SUPER : COST_CATEGORIES_ADMIN
}

export function filterCostListForRole(list, isPrivilegedAdmin) {
  if (isPrivilegedAdmin) return list || []
  return (list || []).filter((r) => !isFixedCostEntry(r))
}

export function sumCostAmount(list) {
  return (list || []).reduce((s, e) => s + Number(e.amount || 0), 0)
}

export function todayStr() {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function monthDefaultDate(year, month) {
  return `${year}-${String(month).padStart(2, '0')}-01`
}
