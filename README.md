# art-training-system-wx

ART 教务 **移动版**（uni-app）— 一套代码编译 **微信小程序 + H5**，统一登录支持 **教师 + 管理员**。

## 技术栈

- uni-app Vue 3 + Vite
- Pinia
- 后端 API：`art-training-system-backend`

## 当前上线策略

- **先上 H5**：`https://orangeloveart.cn/m/`
- **小程序**：后续再构建提审
- **PC 后台**：手机访问自动跳转 H5（见 `art-training-system`）

## 功能

- 统一登录：`POST /auth/mobile/login`
- 教师 3 Tab / 管理员 4 Tab + FAB 录课
- 课时录入/列表/详情、学员列表与详情、课包课时核对
- 成本录入（财务相关角色，首页入口）
- 我的：店铺切换、退出

## 快速开始（本地）

```bash
cd art-training-system-wx
npm install --legacy-peer-deps

# 本地开发：src/utils/config.js → USE_LOCAL = true
npm run dev:h5          # http://localhost:5174/m/
npm run dev:mp-weixin   # 微信开发者工具打开 dist/dev/mp-weixin（见下方）
```

## 微信开发者工具联调（推荐：连生产 API）

**不用起本地后端**，只要生产已配置 `WECHAT_MINIAPP_SECRET` 且执行过迁移 SQL。

1. `src/utils/config.js` 保持 **`USE_LOCAL = false`**（默认即 `https://orangeloveart.cn/api`）
2. `npm run dev:mp-weixin`
3. 微信开发者工具打开 **`dist/dev/mp-weixin`**，AppID `wx990725d3b911a978`
4. 详情 → 本地设置 → 勾选 **不校验合法域名**（`manifest` 里已有 `urlCheck: false`，建议再勾一次）
5. 用 **生产库中已登记手机号** 的微信授权登录（在 PC 后台改教师/管理员手机号与你的微信一致）

注意：连的是**正式数据**，录入/删除会改生产库，请谨慎操作。

## 本地微信开发者工具 + 本地后端（可选）

完整步骤见后端：`art-training-system-backend/scripts/DEV-WECHAT-LOCAL.txt`

1. `USE_LOCAL = true` + `bash scripts/dev-local-wechat.sh`
2. 本地 MySQL 执行 `migrate_wechat_miniprogram_login.sql`

## 微信开发者工具（必读）

**不要**把项目根目录 `art-training-system-wx` 当作小程序目录打开，根目录没有 `app.json`，会报错。

| 场景 | 先执行 | 微信开发者工具「导入项目」目录 |
|------|--------|--------------------------------|
| 开发调试 | `npm run dev:mp-weixin` | `art-training-system-wx/dist/dev/mp-weixin` |
| 上传提审 | `npm run build:mp-weixin` | `art-training-system-wx/dist/build/mp-weixin` |

- AppID：`wx990725d3b911a978`（与 `src/manifest.json` 一致）
- 若 `dist/.../mp-weixin` 不存在，先 `npm install --legacy-peer-deps` 再执行上表对应命令
- `dist/` 在 `.gitignore` 中，换电脑后需重新构建

## 小程序登录（仅微信）

- 小程序端**仅支持**「微信手机号登录」，不再使用账号密码。
- 教师：须在 **教师管理** 中录入手机号，且与微信授权号码一致。
- 管理员：须在 **用户管理** 中录入手机号（`super_admin` / `finance_admin` / `admin`），且与微信授权号码一致。
- 未登记手机号登录会提示：「该手机号未在系统中登记…」
- 后端需配置环境变量 `WECHAT_MINIAPP_SECRET`（公众平台 → 开发管理 → AppSecret），并执行 `docs/migrate_wechat_miniprogram_login.sql`。
- 腾讯云 CVM + Docker：在服务器执行 `sudo bash scripts/setup-docker-env.sh`（见后端仓库 `art-training-system-backend/scripts/setup-docker-env.sh`）。
- 微信公众平台需开通 **手机号快速验证**（企业主体小程序；个人主体可能无法使用 getPhoneNumber）。
- **隐私与手机号（必配，否则 errno:112）**：见下方「errno 112 排查」。`manifest.json` 仅保留 `__usePrivacyCheck__`（**不要**在 `requiredPrivateInfos` 里写 `getPhoneNumber`）。

### errno 112：`api scope is not declared in the privacy agreement`

配置后仍报 112 时，请读 **[docs/WECHAT-PRIVACY-112.md](docs/WECHAT-PRIVACY-112.md)**（含「只改现网、预览用开发版」等情形）。

要点：须勾选 **「收集你的手机号」**（对应 `getPhoneNumber` 按钮），状态 **审核通过**；预览/开发版还须在 **版本管理 → 提交审核** 流程中同步开发版隐私指引；通过后删小程序、清授权，等待约 30 分钟～1 小时再测。
- **模拟器**：开发者工具里无法完成手机号登录，须 **预览 → 手机扫码**；隐私与手机号授权由 **微信官方弹窗** 处理（勿在代码里自定义 `onNeedPrivacyAuthorization` 弹层）。
- **登录页**：进入时若未同意隐私会弹出「隐私保护提示」→ 点 **同意** → 再点「微信手机号登录」授权手机号（`requirePrivacyAuthorize` + `onNeedPrivacyAuthorization`，与微信官方 demo 一致）。
- H5 仍使用账号 + 密码（`/auth/mobile/login`）。

## 配置

`src/utils/config.js`：

| USE_LOCAL | API |
|-----------|-----|
| `true` | `http://127.0.0.1:8081/api` |
| `false` | `https://orangeloveart.cn/api` |

H5 生产路径：`/m/`（`manifest.json` + `vite.config.js`）

小程序 AppID：`wx990725d3b911a978`

## H5 上线

详见 [docs/DEPLOY-H5.md](docs/DEPLOY-H5.md)

```bash
USE_LOCAL=false  # 确认 config.js
UNI_PLATFORM=h5 npm run build:h5
# 部署 dist/build/h5/ → 服务器 /opt/art-training/mobile-h5/
```

## 目录

```
src/
  pages/          页面
  components/     AppTabBar、PageShell
  api/            接口
  stores/         Pinia user
  utils/          request、storage、config
legacy/           原原生微信小程序（参考，不发布）
docs/DEPLOY-H5.md  H5 部署说明
```

## 后端依赖

- `POST /auth/mobile/login`、`GET /auth/current`
- 业务 API、上传 `/upload/lesson-image`

## 备案

沪ICP备2026020949号
