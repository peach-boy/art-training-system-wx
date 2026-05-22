# art-training-system-wx

ART 教务记录 — 微信小程序（教师端课时录入）

## 功能

- 教师手机号 + 密码登录
- 首页展示本月已上课时总数
- 录入课时（选学员、上传课堂照片）
- 查看课时记录

## 快速开始

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入本项目目录 `art-training-system-wx`
3. AppID 已配置：`wx6e5d823915e06b80`（见 `project.config.json`）
4. 复制本地私有配置：`cp project.private.config.example.json project.private.config.json`
5. 一键打开：`bash scripts/open-devtools.sh`
6. 本地开发在 `project.private.config.json` 中设置 `urlCheck: false`
7. 上线前在公众平台配置 request 合法域名：`https://orangeloveart.cn`

## API

默认连接：`https://orangeloveart.cn/api`

修改地址：编辑 `utils/config.js` 中的 `USE_LOCAL` / `LOCAL_BASE`

## 目录

```
pages/login/          登录
pages/index/          首页
pages/attendance/     课时列表、详情、表单
components/tab-bar/   底部导航
utils/request.js      请求封装（Token）
api/index.js          接口定义
```

## Git / GitHub

`.gitignore` 已忽略 `project.private.config.json`、构建缓存等私有/临时文件。

首次推送到 GitHub：

```bash
# 方式一：已安装 gh 且已登录
bash scripts/push-github.sh

# 方式二：手动
# 1. 在 https://github.com/new 创建空仓库 art-training-system-wx
# 2. git push -u origin main
```

仓库地址：`git@github.com:peach-boy/art-training-system-wx.git`

## 注意事项

- 不涉及微信支付
- 备案号：沪ICP备2026020949号
