<template>
  <FlowStateCard
    v-if="!ticket"
    icon="/static/logo.svg"
    title="二维码无效"
    desc="请回到电脑上刷新二维码，再用手机扫一次。"
  />

  <FlowStateCard
    v-else-if="!userStore.isLoggedIn"
    icon="/static/logo.svg"
    title="请先登录小程序"
    desc="登录后会回到这里，再确认即可让电脑进入同一账号。"
  >
    <button class="mp-btn" hover-class="mp-btn--hover" @tap="goLogin">去登录</button>
  </FlowStateCard>

  <FlowStateCard
    v-else-if="done"
    icon="/static/logo.svg"
    kicker="完成"
    title="电脑已登录"
    desc="可以关闭这个页面，回到电脑继续使用。"
  >
    <button class="mp-btn mp-btn--ghost" hover-class="mp-btn--hover" @tap="goHome">返回首页</button>
  </FlowStateCard>

  <FlowStateCard
    v-else
    icon="/static/logo.svg"
    kicker="电脑登录确认"
    title="以管理员身份登录"
    desc="电脑端只匹配管理员手机号。教师身份不能登录电脑；你的手机号须已写在管理员资料里。"
  >
    <button
      class="mp-btn"
      :class="{ 'mp-btn--off': confirming }"
      hover-class="mp-btn--hover"
      :disabled="confirming"
      @tap="confirm"
    >
      {{ confirming ? '确认中…' : '确认登录' }}
    </button>
    <button class="mp-btn mp-btn--ghost" hover-class="mp-btn--hover" @tap="goHome">取消</button>
  </FlowStateCard>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { authAPI } from '@/api'
import { useUserStore } from '@/stores/user'
import { setPendingPcTicket } from '@/utils/storage'
import { sceneFromPageQuery } from '@/utils/miniProgramScene'
import FlowStateCard from '@/components/FlowStateCard.vue'

const userStore = useUserStore()
const ticket = ref('')
const confirming = ref(false)
const done = ref(false)

onLoad((query) => {
  ticket.value = sceneFromPageQuery(query)
})

function goLogin() {
  setPendingPcTicket(ticket.value)
  uni.reLaunch({ url: '/pages/login/login' })
}

function goHome() {
  uni.reLaunch({ url: '/pages/home/index' })
}

async function confirm() {
  if (confirming.value || done.value || !ticket.value) return
  confirming.value = true
  try {
    await authAPI.confirmPcLogin(ticket.value)
    done.value = true
  } catch (e) {
    uni.showToast({ title: e.message || '确认失败', icon: 'none', duration: 2500 })
  } finally {
    confirming.value = false
  }
}
</script>
