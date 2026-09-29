<template>
  <view class="login-page">
    <!-- 顶部品牌区 -->
    <view class="hero">
      <view class="hero-bubble hero-bubble--a" />
      <view class="hero-bubble hero-bubble--b" />
      <view class="hero-bubble hero-bubble--c" />
      <view class="login-status" :style="{ height: statusBarHeight + 'px' }" />
      <view class="login-brand">
        <view class="login-logo">
          <view class="logo-fruit" />
          <view class="logo-leaf" />
        </view>
        <text class="login-title">橙子课时助手</text>
        <text class="login-sub">录课时、看课表，随手就能办</text>
      </view>
    </view>

    <!-- 登录卡片 -->
    <view class="login-body">
      <!-- #ifdef MP-WEIXIN -->
      <view class="login-form login-form--wechat">
        <text class="form-title">欢迎回来</text>
        <text class="form-desc">使用微信绑定的手机号快速登录，无需记密码</text>

        <button
          class="btn-wechat"
          open-type="getPhoneNumber"
          @getphonenumber="onGetPhoneNumber"
        >
          <text class="btn-wechat__icon">☎</text>
          <text>微信手机号一键登录</text>
        </button>
        <text v-if="loginError" class="login-error">{{ loginError }}</text>

        <view class="login-points">
          <text class="login-point">员工 / 管理员通用</text>
          <text class="login-point">号码需已在系统登记</text>
        </view>

        <text v-if="isDevtools" class="login-tip login-tip--warn">模拟器无法完成手机号登录，请点工具栏「预览」扫码，在手机微信中操作。</text>
        <text v-if="privacyContractName" class="login-tip">
          登录即表示同意
          <text class="login-tip-link" @tap="openPrivacyContract">{{ privacyContractName }}</text>
        </text>
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
        <text class="form-title">欢迎回来</text>
        <text class="form-desc">员工与管理员统一登录</text>
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
import { onLoad } from '@dcloudio/uni-app'
import { authAPI } from '@/api'
import { PHONE_PATTERN, ICP_NUMBER } from '@/utils/config'
import { useUserStore, navigateAfterLogin } from '@/stores/user'
import { isLoggedIn, setSkipSilentWechatLogin, shouldSkipSilentWechatLogin } from '@/utils/storage'
import { inputEventValue } from '@/utils/input'

const userStore = useUserStore()
let skipSilentOnce = false

const statusBarHeight = ref(20)
const account = ref('')
const password = ref('')
const captchaKey = ref('')
const captchaCode = ref('')
const captchaImage = ref('')
const loading = ref(false)
const loginError = ref('')
let loginSeq = 0
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
    : '员工请使用手机号登录，免验证码'
)

watch(needCaptcha, (val) => {
  // #ifndef MP-WEIXIN
  if (val && !captchaImage.value) loadCaptcha()
  // #endif
})

onLoad((query) => {
  if (query?.loggedOut === '1') skipSilentOnce = true
})

/** 主动退出后不再静默登录：onMounted 可能早于 onLoad，这里直接读页面参数和本地标记 */
function shouldSkipSilent() {
  if (skipSilentOnce) return true
  if (shouldSkipSilentWechatLogin()) return true
  try {
    const pages = getCurrentPages()
    const opts = pages[pages.length - 1]?.options || {}
    return opts.loggedOut === '1'
  } catch (e) {
    return false
  }
}

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
  if (!shouldSkipSilent()) {
    trySilentWechatLogin()
  }
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
  const seq = ++loginSeq
  try {
    const loginCode = await wxLoginCode()
    if (seq !== loginSeq) return
    const data = await authAPI.wechatMiniProgramLogin({ loginCode })
    if (seq !== loginSeq) return
    userStore.applyLogin(data)
    navigateAfterLogin(data.role)
  } catch {
    /* 未绑定或需授权手机号，留在登录页点按钮 */
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
  loginSeq += 1
  const seq = loginSeq
  loginError.value = ''
  const detail = parseGetPhoneDetail(e)
  if (detail.errMsg !== 'getPhoneNumber:ok' || !detail.code) {
    const failText = detail.errMsg || '没有拿到手机号授权'
    loginError.value = failText
    // #ifdef MP-WEIXIN
    phoneAuthFailToast(detail)
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
    if (seq !== loginSeq) return
    setSkipSilentWechatLogin(false)
    userStore.applyLogin(data)
    uni.showToast({ title: `已登录 ${data.realName || ''}`, icon: 'none', duration: 2000 })
    setTimeout(() => navigateAfterLogin(data.role), 400)
  } catch (err) {
    loginError.value = err.message || '登录失败'
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
    setSkipSilentWechatLogin(false)
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
$ink: #2a241f;
$muted: #8a8178;
$orange: #f37021;

.login-page {
  min-height: 100vh;
  background: #f6f2ec;
}

/* 顶部品牌区 */
.hero {
  position: relative;
  overflow: hidden;
  padding-bottom: 150rpx;
  background: linear-gradient(160deg, #ff9a3d 0%, #f37021 55%, #e4551a 100%);
  border-radius: 0 0 64rpx 64rpx;
}

.hero-bubble {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
}

.hero-bubble--a { width: 360rpx; height: 360rpx; top: -120rpx; right: -100rpx; }
.hero-bubble--b { width: 220rpx; height: 220rpx; top: 220rpx; left: -90rpx; background: rgba(255, 255, 255, 0.09); }
.hero-bubble--c { width: 120rpx; height: 120rpx; top: 120rpx; right: 120rpx; background: rgba(255, 255, 255, 0.1); }

.login-brand {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 72rpx;
}

/* 橙子 logo：橙色圆 + 绿叶 */
.login-logo {
  position: relative;
  width: 148rpx;
  height: 148rpx;
  border-radius: 44rpx;
  background: #fff;
  box-shadow: 0 16rpx 40rpx rgba(120, 40, 0, 0.28);
}

.logo-fruit {
  position: absolute;
  left: 28rpx;
  top: 40rpx;
  width: 92rpx;
  height: 88rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ffb15a 0%, #f37021 70%);
}

.logo-leaf {
  position: absolute;
  left: 76rpx;
  top: 22rpx;
  width: 44rpx;
  height: 22rpx;
  border-radius: 22rpx 0 22rpx 0;
  background: #4fae3a;
  transform: rotate(-18deg);
}

.login-title {
  margin-top: 30rpx;
  font-size: 48rpx;
  font-weight: 800;
  letter-spacing: 4rpx;
  color: #fff;
}

.login-sub {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.88);
}

/* 登录卡片 */
.login-body {
  position: relative;
  margin-top: -96rpx;
  padding: 0 32rpx 60rpx;
}

.login-form {
  padding: 48rpx 36rpx 40rpx;
  background: #fff;
  border-radius: 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(120, 60, 10, 0.12);
}

.form-title {
  display: block;
  font-size: 40rpx;
  font-weight: 800;
  color: $ink;
}

.form-desc {
  display: block;
  margin: 10rpx 0 40rpx;
  font-size: 26rpx;
  line-height: 1.5;
  color: $muted;
}

.btn-wechat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  height: 104rpx;
  line-height: 104rpx;
  background: linear-gradient(135deg, #ff8a3d, #f37021);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  border-radius: 999rpx;
  border: none;
  box-shadow: 0 12rpx 28rpx rgba(243, 112, 33, 0.35);
}

.btn-wechat::after { border: none; }

.btn-wechat__icon {
  font-size: 34rpx;
  line-height: 1;
}

.login-points {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 32rpx;
}

.login-point {
  padding: 6rpx 20rpx;
  font-size: 22rpx;
  color: $orange;
  background: rgba(243, 112, 33, 0.09);
  border-radius: 999rpx;
}

.login-error {
  display: block;
  margin-top: 28rpx;
  padding: 18rpx 22rpx;
  font-size: 25rpx;
  line-height: 1.5;
  color: #c13515;
  background: #fff1ee;
  border-radius: 16rpx;
}

.login-tip {
  display: block;
  margin-top: 24rpx;
  text-align: center;
  font-size: 23rpx;
  color: $muted;
  line-height: 1.6;
}

.login-tip--warn {
  color: #c45c00;
  font-weight: 500;
}

.login-tip-link {
  color: $orange;
  text-decoration: underline;
}

/* H5 账号密码 */
.field { margin-bottom: 28rpx; }

.field-label {
  display: block;
  font-size: 24rpx;
  color: $muted;
  margin-bottom: 12rpx;
}

.field-input {
  width: 100%;
  height: 92rpx;
  padding: 0 28rpx;
  box-sizing: border-box;
  background: #f6f2ec;
  border-radius: 24rpx;
  border: 2rpx solid transparent;
  font-size: 28rpx;
  color: $ink;
}

.field-ph { color: #b7aea4; }

.captcha-box {
  margin-top: 16rpx;
  width: 100%;
  background: #fff;
  border-radius: 20rpx;
  border: 1rpx solid #f0eae3;
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
  color: $orange;
  background: rgba(243, 112, 33, 0.08);
}

.captcha-hint {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: $muted;
  padding: 8rpx 0 12rpx;
  background: #faf7f3;
}

.btn-login {
  margin-top: 12rpx;
  height: 100rpx;
  line-height: 100rpx;
  background: linear-gradient(135deg, #ff8a3d, #f37021);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  border-radius: 999rpx;
  border: none;
  box-shadow: 0 12rpx 28rpx rgba(243, 112, 33, 0.3);
}

.btn-login::after { border: none; }

/* 隐私弹层 */
.privacy-mask {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(42, 36, 31, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}

.privacy-box {
  width: 100%;
  max-width: 620rpx;
  background: #fff;
  border-radius: 36rpx;
  padding: 44rpx 36rpx 32rpx;
}

.privacy-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: $ink;
  margin-bottom: 16rpx;
}

.privacy-desc {
  display: block;
  font-size: 26rpx;
  color: $muted;
  line-height: 1.6;
  margin-bottom: 32rpx;
}

.btn-privacy-cancel {
  margin-top: 16rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: transparent;
  color: $muted;
  font-size: 28rpx;
  border: none;
}

.btn-privacy-cancel::after { border: none; }

.login-icp {
  display: block;
  margin-top: 40rpx;
  text-align: center;
  font-size: 22rpx;
  color: #b7aea4;
}
</style>
