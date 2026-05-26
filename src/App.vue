<script setup>
import { onLaunch } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'

onLaunch(() => {
  const userStore = useUserStore()
  if (userStore.isLoggedIn) {
    userStore.fetchCurrentUser().catch(() => {
      userStore.clearAuth()
    })
  }
})
</script>

<style lang="scss">
@import '@/styles/theme.scss';
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
