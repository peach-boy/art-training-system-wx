import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

/** 生产 H5 部署在 https://域名/m/ 子路径 */
const H5_BASE = process.env.VITE_H5_BASE || '/m/'

export default defineConfig({
  plugins: [uni()],
  base: process.env.UNI_PLATFORM === 'h5' ? H5_BASE : '/',
  server: {
    port: 5174,
    host: true
  }
})
