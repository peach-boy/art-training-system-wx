<template>
  <view class="login-page">
    <!-- 顶部品牌区 -->
    <view class="hero">
      <view class="hero-bubble hero-bubble--a" />
      <view class="hero-bubble hero-bubble--b" />
      <view class="hero-bubble hero-bubble--c" />
      <view class="login-status" :style="{ height: statusBarHeight + 'px' }" />
      <view class="login-brand">
        <image class="login-logo" src="/static/logo.svg" mode="aspectFit" />
        <text class="login-title">乐橙助教</text>
        <text class="login-sub">录课时 · 看进度 · 家校同步</text>
      </view>
    </view>

    <!-- 登录卡片 -->
    <view class="login-body">
      <!-- #ifdef MP-WEIXIN -->
      <view class="login-form login-form--wechat">
        <text class="form-title">欢迎使用</text>
        <text class="form-desc">请选择你的身份，用微信手机号一键登录</text>

        <view class="role-list">
          <view
            v-for="item in loginRoles"
            :key="item.value"
            class="role-card"
            :class="['role-card--' + item.value, { active: loginType === item.value }]"
            @tap="chooseLoginType(item.value)"
          >
            <view v-if="loginType === item.value" class="role-card__check">✓</view>
            <view class="role-card__icon">
              <image class="role-card__img" :src="item.icon" mode="aspectFit" />
            </view>
            <text class="role-card__name">{{ item.label }}</text>
          </view>
        </view>

        <view class="role-hint" :class="{ 'role-hint--on': !!loginType }">
          <text>{{ loginType ? currentRoleDesc : '不同身份匹配不同的账号资料，请选对哦' }}</text>
        </view>

        <button
          v-if="loginType"
          class="btn-wechat"
          :class="'btn-wechat--' + loginType"
          :loading="loading"
          :disabled="loading"
          open-type="getPhoneNumber"
          @getphonenumber="onGetPhoneNumber"
        >
          <text>{{ loading ? '登录中…' : '微信授权，以' + loginTypeLabel + '登录' }}</text>
        </button>
        <button v-else class="btn-wechat btn-wechat--idle" @tap="onNeedRole">
          <text>请先选择身份</text>
        </button>
        <text v-if="loginError" class="login-error">{{ loginError }}</text>

        <text v-if="isDevtools" class="login-tip login-tip--warn">模拟器无法完成手机号登录，请点工具栏「预览」扫码，在手机微信中操作。</text>
        <text v-if="privacyContractName" class="login-tip">
          登录即表示同意
          <text class="login-tip-link" @tap="openPrivacyContract">{{ privacyContractName }}</text>
        </text>
        <text class="demo-entry" @tap="openDemoLogin">体验账号登录</text>
      </view>

      <view v-if="showDemo" class="privacy-mask" @tap="closeDemoLogin">
        <view class="demo-box" @tap.stop>
          <text class="privacy-title">体验账号登录</text>
          <text class="privacy-desc">供审核和演示使用，请输入体验账号的手机号和密码。</text>
          <input
            class="field-input demo-input"
            type="number"
            maxlength="11"
            :value="account"
            placeholder="体验账号手机号"
            placeholder-class="field-ph"
            :adjust-position="true"
            @input="account = inputEventValue($event)"
          />
          <input
            class="field-input demo-input"
            password
            :value="password"
            placeholder="密码"
            placeholder-class="field-ph"
            :adjust-position="true"
            @input="password = inputEventValue($event)"
          />
          <button class="btn-wechat demo-submit" :loading="loading" :disabled="loading" @tap="handleDemoLogin">
            登录
          </button>
          <button class="btn-privacy-cancel" @tap="closeDemoLogin">取消</button>
        </view>
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
const loginType = ref('')
const LAST_ROLE_KEY = 'lecheng_last_login_role'
const loginRoles = [
  { value: 'teacher', label: '教师', desc: '匹配教师资料里的手机号，录课时、看学员', icon: '/static/login/role-teacher.svg' },
  { value: 'admin', label: '管理员', desc: '匹配管理员资料里的手机号，管理门店教务', icon: '/static/login/role-admin.svg' },
  { value: 'parent', label: '家长', desc: '匹配学员联系电话，查看孩子课时与照片', icon: '/static/login/role-parent.svg' }
]
let loginSeq = 0
const loginTypeLabel = computed(() => loginRoles.find((item) => item.value === loginType.value)?.label || '')
const currentRoleDesc = computed(() => loginRoles.find((item) => item.value === loginType.value)?.desc || '')

function onNeedRole() {
  uni.showToast({ title: '请先选择登录身份', icon: 'none' })
}
const icpNumber = ICP_NUMBER
// #ifdef MP-WEIXIN
const isDevtools = ref(false)
const privacyContractName = ref('')
const showPrivacy = ref(false)
const showDemo = ref(false)
let resolvePrivacyAuthorization = null

function openDemoLogin() {
  loginError.value = ''
  showDemo.value = true
}

function closeDemoLogin() {
  showDemo.value = false
  password.value = ''
}

/** 体验账号：员工手机号 + 密码（不需要验证码），供小程序审核和演示使用 */
async function handleDemoLogin() {
  if (loading.value) return
  const acc = (account.value || '').trim()
  if (!PHONE_PATTERN.test(acc) || !password.value) {
    uni.showToast({ title: '请填写11位手机号和密码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    loginSeq += 1
    const data = await authAPI.mobileLogin({ account: acc, password: password.value })
    setSkipSilentWechatLogin(false)
    showDemo.value = false
    password.value = ''
    userStore.applyLogin(data)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => navigateAfterLogin(data.role), 400)
  } catch (e) {
    uni.showToast({ title: e.message || '登录失败', icon: 'none', duration: 2500 })
  } finally {
    loading.value = false
  }
}
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
    navigateAfterLogin(userStore.role)
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
  // 记住上次选择的身份，打开即可直接点登录
  try {
    const last = uni.getStorageSync(LAST_ROLE_KEY)
    if (last && loginRoles.some((r) => r.value === last)) chooseLoginType(last)
  } catch (e) {
    /* ignore */
  }
  // #endif
})

function chooseLoginType(type) {
  if (loginType.value === type) return
  loginSeq += 1
  loginType.value = type
  loginError.value = ''
  try {
    uni.setStorageSync(LAST_ROLE_KEY, type)
  } catch (e) {
    /* ignore */
  }
  if (type !== 'parent' && !shouldSkipSilent()) {
    trySilentWechatLogin()
  }
}

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
    const data = await authAPI.wechatMiniProgramLogin({ loginCode, loginType: loginType.value })
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
      phoneCode: detail.code,
      loginType: loginType.value
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
$ink: #2b1b12;
$muted: #8a8178;
$orange: #f37021;

.login-page {
  min-height: 100vh;
  background: #fff8ef;
}

/* 顶部品牌区 */
.hero {
  position: relative;
  overflow: hidden;
  padding-bottom: 170rpx;
  background: linear-gradient(170deg, #ffe7c7 0%, #fff1de 55%, #fff8ef 100%);
}

.hero-bubble {
  position: absolute;
  border-radius: 50%;
  background: rgba(243, 112, 33, 0.14);
}

.hero-bubble--a { width: 420rpx; height: 420rpx; top: -150rpx; right: -130rpx; background: rgba(255, 154, 61, 0.22); }
.hero-bubble--b { width: 240rpx; height: 240rpx; top: 260rpx; left: -110rpx; background: rgba(58, 36, 24, 0.06); }
.hero-bubble--c { width: 110rpx; height: 110rpx; top: 150rpx; right: 110rpx; background: rgba(243, 112, 33, 0.16); }

.login-brand {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 64rpx;
}

.login-logo {
  width: 180rpx;
  height: 180rpx;
  border-radius: 48rpx;
  box-shadow: 0 22rpx 48rpx rgba(240, 86, 26, 0.32);
}

.login-title {
  margin-top: 32rpx;
  font-size: 56rpx;
  font-weight: 800;
  letter-spacing: 10rpx;
  text-indent: 10rpx;
  color: $ink;
}

.login-sub {
  margin-top: 14rpx;
  font-size: 25rpx;
  letter-spacing: 2rpx;
  color: $muted;
}

/* 登录卡片 */
.login-body {
  position: relative;
  margin-top: -110rpx;
  padding: 0 32rpx 60rpx;
}

.login-form {
  padding: 44rpx 32rpx 36rpx;
  background: #fff;
  border-radius: 44rpx;
  box-shadow: 0 24rpx 64rpx rgba(150, 70, 10, 0.12);
}

.form-title {
  display: block;
  text-align: center;
  font-size: 38rpx;
  font-weight: 800;
  color: $ink;
}

.form-desc {
  display: block;
  margin: 10rpx 0 32rpx;
  text-align: center;
  font-size: 24rpx;
  line-height: 1.5;
  color: $muted;
}

.role-list {
  display: flex;
  gap: 16rpx;
}

.role-card {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28rpx 0 24rpx;
  border-radius: 28rpx;
  background: #f8f4ef;
  border: 3rpx solid transparent;
  transition: all 0.2s ease;
}

.role-card__icon {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
  background: #fff;
  transition: transform 0.2s ease;
}

.role-card__img {
  width: 48rpx;
  height: 48rpx;
}

.role-card__name {
  margin-top: 16rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: $muted;
}

.role-card__check {
  position: absolute;
  top: 10rpx;
  right: 10rpx;
  width: 34rpx;
  height: 34rpx;
  line-height: 34rpx;
  text-align: center;
  font-size: 20rpx;
  font-weight: 800;
  color: #fff;
  border-radius: 50%;
}

.role-card.active { transform: translateY(-4rpx); }
.role-card.active .role-card__icon { transform: scale(1.06); }
.role-card.active .role-card__name { color: $ink; }

.role-card--teacher.active { background: #fff3ea; border-color: #f37021; }
.role-card--teacher .role-card__check { background: #f37021; }
.role-card--admin.active { background: #fff3ea; border-color: #f37021; }
.role-card--admin .role-card__check { background: #f37021; }
.role-card--parent.active { background: #fff3ea; border-color: #f37021; }
.role-card--parent .role-card__check { background: #f37021; }

.role-hint {
  margin: 22rpx 0 26rpx;
  padding: 16rpx 20rpx;
  text-align: center;
  font-size: 23rpx;
  line-height: 1.5;
  color: #b7aea4;
  background: #faf7f3;
  border-radius: 18rpx;
}

.role-hint--on { color: #6b6158; }

.btn-wechat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  height: 104rpx;
  line-height: 104rpx;
  background: linear-gradient(135deg, #f98a3c, #f37021);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  border-radius: 999rpx;
  border: none;
  box-shadow: 0 14rpx 30rpx rgba(243, 112, 33, 0.35);
}

.btn-wechat::after { border: none; }
.btn-wechat--admin { background: linear-gradient(135deg, #f98a3c, #f37021); box-shadow: 0 14rpx 30rpx rgba(243, 112, 33, 0.3); }
.btn-wechat--parent { background: linear-gradient(135deg, #f98a3c, #f37021); box-shadow: 0 14rpx 30rpx rgba(243, 112, 33, 0.3); }
.btn-wechat--idle { background: #e9e2d9; color: #a39a90; box-shadow: none; }
.btn-wechat[disabled] { opacity: 0.7; }

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

.demo-entry {
  display: block;
  margin-top: 28rpx;
  padding: 12rpx 0;
  text-align: center;
  font-size: 22rpx;
  color: #b7aea4;
}

.demo-box {
  width: 100%;
  max-width: 620rpx;
  background: #fff;
  border-radius: 36rpx;
  padding: 44rpx 36rpx 32rpx;
}

.demo-input {
  margin-bottom: 20rpx;
}

.demo-submit {
  margin-top: 12rpx;
  height: 92rpx;
  line-height: 92rpx;
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
  background: #f7f0e6;
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
  background: linear-gradient(135deg, #f98a3c, #f37021);
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
