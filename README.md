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
npm run dev:mp-weixin   # 微信开发者工具打开 dist/dev/mp-weixin
```

## 配置

`src/utils/config.js`：

| USE_LOCAL | API |
|-----------|-----|
| `true` | `http://127.0.0.1:8081/api` |
| `false` | `https://orangeloveart.cn/api` |

H5 生产路径：`/m/`（`manifest.json` + `vite.config.js`）

小程序 AppID：`wx6e5d823915e06b80`

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
