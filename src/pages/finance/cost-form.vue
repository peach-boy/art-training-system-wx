<template>
  <view class="form-page">
    <view class="form-card">
      <view class="field">
        <text class="label">分类</text>
        <picker :range="categories" :value="categoryIndex" @change="onCategoryChange">
          <view class="picker-val" :class="{ placeholder: !category }">{{ category || '请选择分类' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">项目名称 *</text>
        <input v-model="name" class="input" placeholder="如：办公用品、物料采购" />
      </view>
      <view class="field">
        <text class="label">金额（元） *</text>
        <input v-model="amount" class="input" type="digit" placeholder="请输入金额" />
      </view>
      <view class="field">
        <text class="label">记账日期 *</text>
        <picker mode="date" :value="entryDate" @change="onDateChange">
          <view class="picker-val">{{ entryDate || '请选择日期' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">备注</text>
        <textarea v-model="notes" class="textarea" placeholder="备注（可选）" />
      </view>
    </view>

    <view v-if="editingId" class="danger-zone">
      <button class="btn-delete" @tap="handleDelete">删除本条成本</button>
    </view>

    <view class="footer">
      <button class="btn-save" :loading="submitting" @tap="handleSave">保存</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { financialEntryAPI } from '@/api'
import { requireLogin, useUserStore } from '@/stores/user'
import {
  isAllStores,
  formTouchesFixedCost,
  costCategoriesForRole,
  monthDefaultDate
} from '@/utils/finance'

const userStore = useUserStore()

const editingId = ref(null)
const category = ref('')
const name = ref('')
const amount = ref('')
const entryDate = ref('')
const notes = ref('')
const submitting = ref(false)
let listYear = new Date().getFullYear()
let listMonth = new Date().getMonth() + 1

const categories = computed(() =>
  costCategoriesForRole(userStore.isPrivilegedAdmin)
)

const categoryIndex = computed(() => {
  const idx = categories.value.indexOf(category.value)
  return idx >= 0 ? idx : 0
})

onLoad(async (query) => {
  if (!requireLogin()) return
  if (!userStore.isFinanceStaff) {
    uni.showToast({ title: '无权限访问', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 800)
    return
  }
  listYear = Number(query.year) || listYear
  listMonth = Number(query.month) || listMonth
  if (query.id) {
    editingId.value = query.id
    uni.setNavigationBarTitle({ title: '编辑成本' })
    await loadEntry(query.id)
  } else {
    entryDate.value = monthDefaultDate(listYear, listMonth)
    if (!category.value && categories.value.length) {
      category.value = categories.value[categories.value.length - 1]
    }
  }
})

async function loadEntry(id) {
  try {
    const list = await financialEntryAPI.list(listYear, listMonth, 'cost')
    const item = (list || []).find((r) => String(r.id) === String(id))
    if (!item) {
      uni.showToast({ title: '记录不存在', icon: 'none' })
      return
    }
    if (!userStore.isPrivilegedAdmin && formTouchesFixedCost(item.category, item.name)) {
      uni.showToast({ title: '无权限编辑固定成本', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 800)
      return
    }
    category.value = item.category || ''
    name.value = item.name || ''
    amount.value = item.amount != null ? String(item.amount) : ''
    entryDate.value = item.entryDate || ''
    notes.value = item.notes || ''
  } catch (e) {
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
}

function onCategoryChange(e) {
  const idx = Number(e.detail.value)
  category.value = categories.value[idx] || ''
}

function onDateChange(e) {
  entryDate.value = e.detail.value
}

function validate() {
  if (isAllStores()) {
    uni.showToast({ title: '请先在「我的」选择店铺', icon: 'none' })
    return false
  }
  if (!userStore.isPrivilegedAdmin && formTouchesFixedCost(category.value, name.value)) {
    uni.showToast({
      title: '无权限维护固定成本（房租、物业费、水电）',
      icon: 'none'
    })
    return false
  }
  if (!(name.value || '').trim()) {
    uni.showToast({ title: '请填写项目名称', icon: 'none' })
    return false
  }
  const amt = Number(amount.value)
  if (amount.value === '' || Number.isNaN(amt) || amt < 0) {
    uni.showToast({ title: '请填写有效金额', icon: 'none' })
    return false
  }
  if (!entryDate.value) {
    uni.showToast({ title: '请选择记账日期', icon: 'none' })
    return false
  }
  return true
}

async function handleSave() {
  if (submitting.value || !validate()) return
  const payload = {
    type: 'cost',
    category: category.value || undefined,
    name: name.value.trim(),
    amount: Number(amount.value),
    entryDate: entryDate.value,
    notes: notes.value || ''
  }
  submitting.value = true
  try {
    if (editingId.value) {
      await financialEntryAPI.update(editingId.value, payload)
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await financialEntryAPI.create(payload)
      uni.showToast({ title: '保存成功', icon: 'success' })
    }
    setTimeout(() => {
      uni.navigateBack({ fail: () => uni.redirectTo({ url: '/pages/finance/cost-list' }) })
    }, 500)
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function handleDelete() {
  if (!editingId.value) return
  uni.showModal({
    title: '删除确认',
    content: '确定删除该成本项？',
    success: async (res) => {
      if (!res.confirm) return
      submitting.value = true
      try {
        await financialEntryAPI.delete(editingId.value)
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 500)
      } catch (e) {
        uni.showToast({ title: e.message || '删除失败', icon: 'none' })
      } finally {
        submitting.value = false
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.form-page {
  min-height: 100vh;
  background: var(--bg-page);
  padding: 24rpx 24rpx calc(140rpx + env(safe-area-inset-bottom));
}

.form-card {
  background: var(--canvas);
  border-radius: var(--radius-md);
  border: 1rpx solid var(--hairline);
  padding: 8rpx 24rpx 24rpx;
}

.field {
  padding: 20rpx 0;
  border-bottom: 1rpx solid var(--hairline);
}

.field:last-child {
  border-bottom: none;
}

.label {
  display: block;
  font-size: 24rpx;
  color: var(--text-muted);
  margin-bottom: 12rpx;
}

.input,
.textarea,
.picker-val {
  width: 100%;
  box-sizing: border-box;
  background: var(--bg-page);
  border: 1rpx solid var(--hairline);
  border-radius: var(--radius-sm);
  padding: 20rpx 24rpx;
  font-size: 28rpx;
}

.picker-val.placeholder {
  color: #bbb;
}

.textarea {
  min-height: 140rpx;
}

.danger-zone {
  margin-top: 32rpx;
}

.btn-delete {
  background: transparent;
  color: #c13515;
  font-size: 28rpx;
}

.footer {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: calc(24rpx + env(safe-area-inset-bottom));
}

.btn-save {
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  background: var(--primary);
  color: #fff;
  font-size: 30rpx;
}
</style>
