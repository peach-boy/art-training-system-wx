<template>
  <view class="login-page">
    <view class="login-status" :style="{ height: statusBarHeight + 'px' }" />
    <view class="login-body">
      <view class="login-brand">
        <view class="login-logo">A</view>
        <text class="login-title">ART 教务移动版</text>
        <text class="login-sub">教师与管理员统一登录</text>
      </view>

      <view class="login-form">
        <view class="field">
          <text class="field-label">账号</text>
          <input
            v-model="account"
            class="field-input"
            placeholder="手机号或管理员用户名"
            placeholder-class="field-ph"
          />
        </view>
        <view class="field">
          <text class="field-label">密码</text>
          <input
            v-model="password"
            class="field-input"
            password
            placeholder="请输入密码"
            placeholder-class="field-ph"
          />
        </view>

        <view v-if="needCaptcha" class="field field-captcha">
          <text class="field-label">验证码</text>
          <view class="captcha-row">
            <input
              v-model="captchaCode"
              class="field-input captcha-input"
              placeholder="验证码"
              placeholder-class="field-ph"
            />
            <image
              v-if="captchaImage"
              class="captcha-img"
              :src="captchaImage"
              mode="aspectFit"
              @tap="loadCaptcha"
            />
            <view v-else class="captcha-placeholder" @tap="loadCaptcha">刷新</view>
          </view>
        </view>

        <button class="btn-login" :loading="loading" :disabled="loading" @tap="handleLogin">
          登录
        </button>

        <text class="login-tip">{{ loginTip }}</text>
      </view>

      <text class="login-icp" @tap="copyIcp">{{ icpNumber }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { authAPI } from '@/api'
import { PHONE_PATTERN, ICP_NUMBER } from '@/utils/config'
import { useUserStore, navigateAfterLogin } from '@/stores/user'
import { isLoggedIn } from '@/utils/storage'

const userStore = useUserStore()

const statusBarHeight = ref(20)
const account = ref('')
const password = ref('')
const captchaKey = ref('')
const captchaCode = ref('')
const captchaImage = ref('')
const loading = ref(false)
const icpNumber = ICP_NUMBER

const needCaptcha = computed(() => {
  const v = (account.value || '').trim()
  return v.length > 0 && !PHONE_PATTERN.test(v)
})

const loginTip = computed(() =>
  needCaptcha.value
    ? '管理员账号需填写图形验证码'
    : '教师请使用手机号登录，免验证码'
)

watch(needCaptcha, (val) => {
  if (val && !captchaImage.value) loadCaptcha()
})

onMounted(() => {
  try {
    statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 20
  } catch (e) {
    /* ignore */
  }
  if (isLoggedIn()) {
    uni.reLaunch({ url: '/pages/home/index' })
  }
})

async function loadCaptcha() {
  try {
    const data = await authAPI.getCaptcha()
    captchaKey.value = data.captchaKey
    captchaImage.value = data.captchaImage
    captchaCode.value = ''
  } catch (e) {
    uni.showToast({ title: e.message || '验证码加载失败', icon: 'none' })
  }
}

async function handleLogin() {
  if (loading.value) return
  const acc = (account.value || '').trim()
  if (!acc || !password.value) {
    uni.showToast({ title: '请填写账号和密码', icon: 'none' })
    return
  }
  if (needCaptcha.value && !captchaCode.value) {
    uni.showToast({ title: '请填写验证码', icon: 'none' })
    return
  }

  loading.value = true
  try {
    const payload = {
      account: acc,
      password: password.value
    }
    if (needCaptcha.value) {
      payload.captchaKey = captchaKey.value
      payload.captchaCode = captchaCode.value
    }
    const data = await authAPI.mobileLogin(payload)
    userStore.applyLogin(data)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => navigateAfterLogin(data.role), 400)
  } catch (e) {
    uni.showToast({ title: e.message || '登录失败', icon: 'none' })
    if (needCaptcha.value) loadCaptcha()
  } finally {
    loading.value = false
  }
}

function copyIcp() {
  uni.setClipboardData({ data: icpNumber })
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: var(--bg-page);
}

.login-body {
  padding: 48rpx 40rpx 60rpx;
}

.login-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 64rpx;
}

.login-logo {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #f37021, #ff8534);
  color: #fff;
  font-size: 48rpx;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(243, 112, 33, 0.35);
}

.login-title {
  margin-top: 24rpx;
  font-size: 40rpx;
  font-weight: 600;
  color: var(--text-ink);
}

.login-sub {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: var(--text-muted);
}

.login-form {
  background: var(--canvas);
  border-radius: var(--radius-md);
  padding: 32rpx;
  border: 1rpx solid var(--hairline);
}

.field {
  margin-bottom: 28rpx;
}

.field-label {
  display: block;
  font-size: 24rpx;
  color: var(--text-muted);
  margin-bottom: 12rpx;
}

.field-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background: var(--bg-page);
  border-radius: var(--radius-sm);
  border: 1rpx solid var(--hairline);
  font-size: 28rpx;
  color: var(--text-ink);
}

.field-ph {
  color: #929292;
}

.captcha-row {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.captcha-input {
  flex: 1;
}

.captcha-img,
.captcha-placeholder {
  width: 200rpx;
  height: 88rpx;
  border-radius: var(--radius-sm);
  border: 1rpx solid var(--hairline);
  flex-shrink: 0;
}

.captcha-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: var(--primary);
  background: var(--primary-light);
}

.btn-login {
  margin-top: 12rpx;
  height: 96rpx;
  line-height: 96rpx;
  background: var(--primary);
  color: #fff;
  font-size: 32rpx;
  font-weight: 500;
  border-radius: var(--radius-sm);
  border: none;
}

.btn-login::after {
  border: none;
}

.login-tip {
  display: block;
  margin-top: 24rpx;
  text-align: center;
  font-size: 24rpx;
  color: var(--text-muted);
}

.login-icp {
  display: block;
  margin-top: 48rpx;
  text-align: center;
  font-size: 22rpx;
  color: #929292;
}
</style>
