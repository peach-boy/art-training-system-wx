/**
 * API 地址配置
 *
 * 本地开发：USE_LOCAL = true
 *   - 模拟器：127.0.0.1 即可
 *   - 真机调试：把 LOCAL_BASE 改成 http://你的局域网IP:8081/api
 *
 * 连线上：USE_LOCAL = false
 */
const USE_LOCAL = true

/** 模拟器连本机后端（application.yml 默认 port 8081, context-path /api） */
const LOCAL_BASE = 'http://127.0.0.1:8081/api'

/** 真机调试示例：改成你电脑的局域网 IP，例如 'http://192.168.1.100:8081/api' */
// const LOCAL_BASE = 'http://192.168.1.100:8081/api'

const PROD_BASE = 'https://orangeloveart.cn/api'

const BASE_URL = USE_LOCAL ? LOCAL_BASE : PROD_BASE

module.exports = {
  BASE_URL,
  USE_LOCAL,
  ICP_NUMBER: '沪ICP备2026020949号'
}
