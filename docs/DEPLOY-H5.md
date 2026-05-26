# 移动 H5 上线说明（仅 H5，小程序后续再上）

## 1. 配置检查

`src/utils/config.js`：

- `USE_LOCAL = false` → 请求 `https://orangeloveart.cn/api`

`src/manifest.json` → `h5.router.base` 为 `/m/`（与 Nginx 子路径一致）。

## 2. 构建

```bash
cd art-training-system-wx
npm ci --legacy-peer-deps
UNI_PLATFORM=h5 npm run build:h5
```

产物目录：`dist/build/h5/`（静态文件，含 `index.html`、`assets/`）。

## 3. 服务器部署

将 `dist/build/h5/` 同步到服务器：

```text
/opt/art-training/mobile-h5/
```

Nginx 需配置（`setup-nginx-https.sh` 已含示例）：

```nginx
location = /m { return 301 /m/; }
location ^~ /m/ {
    alias /opt/art-training/mobile-h5/;
    try_files $uri $uri/ /m/index.html;
}
```

访问地址：**https://orangeloveart.cn/m/**

## 4. PC 后台跳转

PC 项目 `art-training-system` 生产构建需设置：

```bash
VITE_MOBILE_H5_URL=https://orangeloveart.cn/m/
```

手机浏览器打开 `https://orangeloveart.cn` 会自动跳转到上述 H5。

强制使用 PC 版：地址加 `?desktop=1` 或 `?stay=pc`。

## 5. GitHub Actions（可选）

**不配置也能上线**：本机 `npm run build:h5` 后 `rsync` 到服务器即可。

若用 CI：本仓库 `.github/workflows/deploy-h5.yml`（仅手动触发），在 GitHub → Settings → Secrets 配置：

| Secret | 说明 | 示例 |
|--------|------|------|
| `TENCENT_SSH_HOST` | 服务器 IP 或域名 | `orangeloveart.cn` |
| `TENCENT_SSH_USER` | SSH 用户名 | `ubuntu` 或 `github` |
| `TENCENT_SSH_KEY` | SSH 私钥全文 | `gha-cvm` 文件内容 |

与 PC / 后端仓库可共用同一套 SSH 密钥。

**若 CI 报 `uni: not found` 或 `npm ci` 失败**：多为 `package-lock.json` 指向内网 npm（`repo.wuxingdev.cn`）。workflow 已在 CI 使用公网 `registry.npmjs.org` 安装；本地仍可用内网源，互不影响。

## 6. 上线自测

- [ ] https://orangeloveart.cn/m/ 可打开登录页
- [ ] 教师 / 管理员登录、录课、上传图片
- [ ] 手机打开 https://orangeloveart.cn 自动跳到 /m/
- [ ] 后端 `/auth/mobile/login` 已部署

## 7. 本地开发

`config.js` 中 `USE_LOCAL = true`，执行 `npm run dev:h5`，访问一般为 `http://localhost:5174/m/`（带 base 时）。
