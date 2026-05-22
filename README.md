# art-training-system-wx

ART 教务记录 — 微信小程序（个人主体 / 内部工具 MVP）

## 功能

- 教师手机号 + 密码登录
- 课时记录列表 / 详情 / 录入 / 修正（仅归属学员）
- 门店切换、退出登录

## 快速开始

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 导入本项目目录 `art-training-system-wx`
3. AppID 已配置：`wx6e5d823915e06b80`（见 `project.config.json`）
4. 一键打开：`bash scripts/open-devtools.sh`
5. 本地开发已关闭域名校验（`project.private.config.json` 中 `urlCheck: false`）
6. 上线前在公众平台配置 request 合法域名：`https://orangeloveart.cn`
7. 工具中点 **编译** 运行

## API

默认连接：`https://orangeloveart.cn/api`

修改地址：编辑 `utils/config.js` 中的 `BASE_URL`

## 目录

```
pages/login/          登录
pages/index/          首页
pages/attendance/     课时列表、详情、表单
pages/profile/        我的 / 门店切换
utils/request.js      请求封装（Token + X-Store-Id）
api/index.js          接口定义
```

## 注意事项

- 录入课时前须选择**具体门店**（不能为「全部店铺」）
- 不涉及微信支付
- 备案号：沪ICP备2026020949号
