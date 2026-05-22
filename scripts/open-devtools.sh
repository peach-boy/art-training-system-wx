#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CLI="/Applications/wechatwebdevtools.app/Contents/MacOS/cli"

if [[ ! -x "$CLI" ]]; then
  echo "未找到微信开发者工具，请先安装："
  echo "https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html"
  exit 1
fi

echo "打开项目: $PROJECT_DIR"
"$CLI" open --project "$PROJECT_DIR"
