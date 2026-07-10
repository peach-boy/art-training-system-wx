<template>
  <view class="login-page">
    <view class="login-status" :style="{ height: statusBarHeight + 'px' }" />
    <view class="login-body">
      <view class="login-brand">
        <view class="login-logo">A</view>
        <text class="login-title">ART 教务移动版</text>
        <!-- #ifdef MP-WEIXIN -->
        <text class="login-sub">微信手机号登录（须与系统登记号码一致）</text>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <text class="login-sub">教师与管理员统一登录</text>
        <!-- #endif -->
      </view>

      <!-- #ifdef MP-WEIXIN -->
      <view class="login-form login-form--wechat">
        <button
          class="btn-wechat"
          open-type="getPhoneNumber"
          :loading="loading"
          :disabled="loading"
          @getphonenumber="onGetPhoneNumber"
        >
          微信手机号登录
        </button>
        <text v-if="privacyContractName" class="login-tip">
          登录即表示同意
          <text class="login-tip-link" @tap="openPrivacyContract">{{ privacyContractName }}</text>
        </text>
        <text v-if="isDevtools" class="login-tip login-tip--warn">模拟器无法完成手机号登录，请点工具栏「预览」扫码，在手机微信中操作。</text>
        <text class="login-tip">仅支持已在系统中录入手机号的教师或管理员。</text>
      </view>
      <view v-if="showPrivacy" class="privacy-mask" @tap.stop>
        <view class="privacy-box">
          <text class="privacy-title">隐私保护提示</text>
          <text class="privacy-desc">
            使用手机号登录前，请阅读并同意
            <text class="login-tip-link" @tap="openPrivacyContract">{{ privacyContractName || '用户隐私保护指引' }}</text>
          </text>
          <button
            id="agree-btn"
            class="btn-wechat"
            open-type="agreePrivacyAuthorization"
            @agreeprivacyauthorization="onPrivacyPopupAgree"
          >
            同意
          </button>
          <button class="btn-privacy-cancel" @tap="onPrivacyPopupDisagree">不同意</button>
        </view>
      </view>
      <!-- #endif -->

      <!-- #ifndef MP-WEIXIN -->
      <view class="login-form">
        <view class="field">
          <text class="field-label">账号</text>
          <input
            class="field-input"
            type="text"
            :value="account"
            placeholder="手机号或管理员用户名"
            placeholder-class="field-ph"
            :adjust-position="true"
            @input="account = inputEventValue($event)"
          />
        </view>
        <view class="field">
          <text class="field-label">密码</text>
          <input
            class="field-input"
            password
            :value="password"
            placeholder="请输入密码"
            placeholder-class="field-ph"
            :adjust-position="true"
            @input="password = inputEventValue($event)"
          />
        </view>

        <view v-if="needCaptcha" class="field field-captcha">
          <text class="field-label">验证码</text>
          <input
            class="field-input"
            type="text"
            :value="captchaCode"
            placeholder="请输入验证码"
            placeholder-class="field-ph"
            :adjust-position="true"
            @input="captchaCode = inputEventValue($event)"
          />
          <view class="captcha-box" @tap="loadCaptcha">
            <image
              v-if="captchaImage"
              class="captcha-img"
              :src="captchaImage"
              mode="widthFix"
            />
            <view v-else class="captcha-placeholder">点击获取验证码</view>
            <text v-if="captchaImage" class="captcha-hint">点击图片刷新</text>
          </view>
        </view>

        <button class="btn-login" :loading="loading" :disabled="loading" @tap="handlePasswordLogin">
          登录
        </button>

        <text class="login-tip">{{ loginTip }}</text>
      </view>
      <!-- #endif -->

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
import { inputEventValue } from '@/utils/input'

const userStore = useUserStore()

const statusBarHeight = ref(20)
const account = ref('')
const password = ref('')
const captchaKey = ref('')
const captchaCode = ref('')
const captchaImage = ref('')
const loading = ref(false)
const icpNumber = ICP_NUMBER
// #ifdef MP-WEIXIN
const isDevtools = ref(false)
const privacyContractName = ref('')
const showPrivacy = ref(false)
let resolvePrivacyAuthorization = null
// #endif

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
  // #ifndef MP-WEIXIN
  if (val && !captchaImage.value) loadCaptcha()
  // #endif
})

onMounted(() => {
  try {
    statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 20
  } catch (e) {
    /* ignore */
  }
  if (isLoggedIn()) {
    uni.reLaunch({ url: '/pages/home/index' })
    return
  }
  // #ifdef MP-WEIXIN
  try {
    const sys = uni.getSystemInfoSync()
    const host = (sys.hostName || sys.host || '').toLowerCase()
    isDevtools.value =
      sys.platform === 'devtools' || host.includes('devtools') || host.includes('simulator')
  } catch (e) {
    /* ignore */
  }
  setupPrivacyAuth()
  trySilentWechatLogin()
  // #endif
})

function wxLoginCode() {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (res) => {
        if (res.code) resolve(res.code)
        else reject(new Error('微信登录失败'))
      },
      fail: () => reject(new Error('微信登录失败'))
    })
  })
}

/** 已绑定 openid 时静默登录 */
async function trySilentWechatLogin() {
  loading.value = true
  try {
    const loginCode = await wxLoginCode()
    const data = await authAPI.wechatMiniProgramLogin({ loginCode })
    userStore.applyLogin(data)
    navigateAfterLogin(data.role)
  } catch {
    /* 未绑定或需授权手机号，展示登录按钮 */
  } finally {
    loading.value = false
  }
}

/** 兼容 uni-app 事件结构 */
function parseGetPhoneDetail(e) {
  let detail = e?.detail || {}
  if (detail.detail && typeof detail.detail === 'object') {
    detail = detail.detail
  }
  return detail
}

// #ifdef MP-WEIXIN
function syncPrivacyContractName() {
  if (typeof wx === 'undefined' || !wx.getPrivacySetting) return
  wx.getPrivacySetting({
    success: (res) => {
      console.info('[login] getPrivacySetting', res)
      if (res.privacyContractName) {
        privacyContractName.value = res.privacyContractName
      }
      if (res.needAuthorization) {
        showPrivacy.value = true
      }
    }
  })
}

/** 微信官方推荐：onNeedPrivacyAuthorization + requirePrivacyAuthorize + 同意按钮 */
function setupPrivacyAuth() {
  syncPrivacyContractName()
  if (typeof wx === 'undefined') return
  if (wx.onNeedPrivacyAuthorization) {
    wx.onNeedPrivacyAuthorization((resolve) => {
      resolvePrivacyAuthorization = resolve
      showPrivacy.value = true
    })
  }
  if (wx.requirePrivacyAuthorize) {
    wx.requirePrivacyAuthorize({
      success: () => {
        showPrivacy.value = false
      },
      fail: () => {
        /* 用户拒绝或未弹出 */
      }
    })
  }
}

function openPrivacyContract() {
  if (typeof wx === 'undefined' || !wx.openPrivacyContract) return
  wx.openPrivacyContract({})
}

function onPrivacyPopupAgree() {
  if (resolvePrivacyAuthorization) {
    resolvePrivacyAuthorization({ buttonId: 'agree-btn', event: 'agree' })
    resolvePrivacyAuthorization = null
  }
  showPrivacy.value = false
  syncPrivacyContractName()
}

function onPrivacyPopupDisagree() {
  if (resolvePrivacyAuthorization) {
    resolvePrivacyAuthorization({ event: 'disagree' })
    resolvePrivacyAuthorization = null
  }
  showPrivacy.value = false
}

function promptPrivacyPopup() {
  showPrivacy.value = true
  if (typeof wx !== 'undefined' && wx.requirePrivacyAuthorize) {
    wx.requirePrivacyAuthorize({})
  }
}

function phoneAuthFailToast(detail) {
  console.warn('[login] getPhoneNumber', detail)
  if (isDevtools.value) {
    uni.showToast({ title: '请用「预览」扫码，在手机微信中登录', icon: 'none', duration: 3000 })
    return
  }
  const errMsg = detail.errMsg || ''
  const errLower = errMsg.toLowerCase()
  const errno = detail.errno

  if (errno === 1400001) {
    uni.showToast({ title: '手机号验证次数已达上限', icon: 'none', duration: 3500 })
    return
  }
  if (errno === 103 || errno === 104 || errLower.includes('privacy')) {
    promptPrivacyPopup()
    return
  }
  if (errno === 112 || errLower.includes('scope is not declared')) {
    uni.showModal({
      title: 'errno:112 隐私指引未生效',
      content:
        '须在公众平台勾选「收集你的手机号」且审核通过；预览版还需在「提交审核」里同步开发版隐私指引。详见项目 docs/WECHAT-PRIVACY-112.md。通过后删小程序重进，等待约 30 分钟。',
      showCancel: false,
      confirmText: '我知道了'
    })
    return
  }
  if (errLower.includes('no permission')) {
    uni.showToast({ title: '小程序未开通手机号（需企业认证）', icon: 'none', duration: 3500 })
    return
  }
  if (errLower.includes('deny') || errLower.includes('cancel')) {
    uni.showToast({ title: '已取消授权', icon: 'none' })
    return
  }
  const hint = errMsg.replace(/^getPhoneNumber:fail\s*/i, '').trim()
  uni.showToast({
    title: hint ? `未能获取手机号：${hint}` : '未能获取手机号，请重试',
    icon: 'none',
    duration: 4000
  })
}
// #endif

async function onGetPhoneNumber(e) {
  if (loading.value) {
    uni.showToast({ title: '正在连接，请稍候…', icon: 'none' })
    return
  }
  const detail = parseGetPhoneDetail(e)
  if (detail.errMsg !== 'getPhoneNumber:ok' || !detail.code) {
    // #ifdef MP-WEIXIN
    phoneAuthFailToast(detail)
    // #endif
    // #ifndef MP-WEIXIN
    uni.showToast({ title: '需要授权手机号才能登录', icon: 'none' })
    // #endif
    return
  }
  loading.value = true
  try {
    const loginCode = await wxLoginCode()
    const data = await authAPI.wechatMiniProgramLogin({
      loginCode,
      phoneCode: detail.code
    })
    userStore.applyLogin(data)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => navigateAfterLogin(data.role), 400)
  } catch (err) {
    uni.showToast({ title: err.message || '登录失败', icon: 'none', duration: 2800 })
  } finally {
    loading.value = false
  }
}

// #ifndef MP-WEIXIN
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

async function handlePasswordLogin() {
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
// #endif

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
  text-align: center;
  padding: 0 24rpx;
}

.login-form {
  background: var(--canvas);
  border-radius: var(--radius-md);
  padding: 32rpx;
  border: 1rpx solid var(--hairline);
}

.login-form--wechat {
  padding: 40rpx 32rpx;
}

.btn-wechat {
  height: 96rpx;
  line-height: 96rpx;
  background: #07c160;
  color: #fff;
  font-size: 32rpx;
  font-weight: 500;
  border-radius: var(--radius-sm);
  border: none;
}

.btn-wechat::after {
  border: none;
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

.captcha-box {
  margin-top: 16rpx;
  width: 100%;
  background: #fff;
  border-radius: var(--radius-sm);
  border: 1rpx solid var(--hairline);
  overflow: hidden;
  box-sizing: border-box;
}

.captcha-img {
  width: 100%;
  display: block;
  vertical-align: top;
}

.captcha-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150rpx;
  font-size: 28rpx;
  color: var(--primary);
  background: var(--primary-light);
}

.captcha-hint {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: var(--text-muted);
  padding: 8rpx 0 12rpx;
  background: #fafafa;
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
  line-height: 1.5;
}

.login-tip--warn {
  color: #c45c00;
  font-weight: 500;
}

.login-tip-link {
  color: var(--primary);
  text-decoration: underline;
}

.privacy-mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}

.privacy-box {
  width: 100%;
  max-width: 600rpx;
  background: #fff;
  border-radius: var(--radius-md);
  padding: 40rpx 32rpx;
}

.privacy-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-ink);
  margin-bottom: 16rpx;
}

.privacy-desc {
  display: block;
  font-size: 26rpx;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 32rpx;
}

.btn-privacy-cancel {
  margin-top: 20rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: transparent;
  color: var(--text-muted);
  font-size: 28rpx;
  border: none;
}

.btn-privacy-cancel::after {
  border: none;
}

.login-icp {
  display: block;
  margin-top: 48rpx;
  text-align: center;
  font-size: 22rpx;
  color: #929292;
}
</style>
