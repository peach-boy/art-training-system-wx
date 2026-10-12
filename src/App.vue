<script setup>
import { onLaunch } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { getToken, getUserInfo } from '@/utils/storage'

onLaunch(() => {
  const userStore = useUserStore()
  if (userStore.isLoggedIn) {
    const launchToken = getToken()
    userStore.fetchCurrentUser().catch(() => {
      // 观察员会话过期时，请求层已切回管理员登录态，这里不能再清掉
      if (getToken() !== launchToken) {
        userStore.token = getToken()
        userStore.userInfo = getUserInfo()
        userStore.observing = false
        return
      }
      userStore.clearAuth()
    })
  }
})
</script>

<style lang="scss">
@import '@/styles/theme.scss';
@import '@/styles/mp-layout.scss';
@import '@/styles/mp-ui.scss';
@import '@/styles/h5-input-fix.scss';

page {
  background-color: var(--bg-page);
  color: var(--text-ink);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  font-size: 28rpx;
  box-sizing: border-box;
}

view,
text,
button,
input {
  box-sizing: border-box;
}
</style>
