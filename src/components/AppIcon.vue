<template>
  <view class="app-icon" :style="boxStyle">
    <image
      class="app-icon__img"
      :src="src"
      mode="aspectFit"
      :style="boxStyle"
    />
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  /** 图标边长（rpx），微信端 SVG 必须写死宽高 */
  size: { type: Number, default: 48 }
})

const boxStyle = computed(() => ({
  width: `${props.size}rpx`,
  height: `${props.size}rpx`
}))
</script>

<style lang="scss" scoped>
.app-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-sizing: border-box;
}

.app-icon__img {
  display: block;
  flex: none;
}
</style>
