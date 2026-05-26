import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// #ifdef H5
import { setupH5InputFocus } from '@/utils/h5InputFocus'
// #endif

export function createApp() {
  const app = createSSRApp(App)
  app.use(createPinia())
  // #ifdef H5
  setupH5InputFocus()
  // #endif
  return { app }
}
