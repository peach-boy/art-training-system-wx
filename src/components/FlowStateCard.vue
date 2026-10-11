<template>
  <view class="mp-flow-page">
    <view class="mp-flow-card">
      <view v-if="icon" class="mp-flow-icon-wrap">
        <AppIcon :src="icon" :size="iconSize" />
      </view>
      <view v-if="kicker" class="mp-flow-kicker mp-t">{{ kicker }}</view>
      <view class="mp-flow-title mp-t">{{ title }}</view>
      <view v-if="desc" class="mp-flow-desc mp-t">{{ desc }}</view>
      <slot />
    </view>
  </view>
</template>

<script setup>
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  title: { type: String, required: true },
  desc: { type: String, default: '' },
  kicker: { type: String, default: '' },
  icon: { type: String, default: '' },
  iconSize: { type: Number, default: 120 }
})
</script>
