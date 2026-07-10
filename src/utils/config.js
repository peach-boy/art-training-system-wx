/** API 与环境配置 */
/** false = 生产 API（小程序开发者工具联调推荐，无需本地后端） */
/** true  = 本地 http://127.0.0.1:8081/api（需启动后端 dev-local-wechat.sh） */
const USE_LOCAL = false
const LOCAL_BASE = 'http://127.0.0.1:8081/api'
const PROD_BASE = 'https://orangeloveart.cn/api'

export const BASE_URL = USE_LOCAL ? LOCAL_BASE : PROD_BASE
export const ICP_NUMBER = '沪ICP备2026020949号'

/** 11 位手机号视为教师账号 */
export const PHONE_PATTERN = /^1\d{10}$/

export const ADMIN_ROLES = ['super_admin', 'finance_admin', 'admin']
