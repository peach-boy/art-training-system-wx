/** API 与环境配置 */
/** 上线 H5 须为 false；本地开发改为 true */
const USE_LOCAL = false
const LOCAL_BASE = 'http://127.0.0.1:8081/api'
const PROD_BASE = 'https://orangeloveart.cn/api'

export const BASE_URL = USE_LOCAL ? LOCAL_BASE : PROD_BASE
export const ICP_NUMBER = '沪ICP备2026020949号'

/** 11 位手机号视为教师账号 */
export const PHONE_PATTERN = /^1\d{10}$/

export const ADMIN_ROLES = ['super_admin', 'finance_admin', 'admin']
