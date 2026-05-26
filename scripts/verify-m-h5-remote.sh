#!/usr/bin/env bash
# 在服务器上检查 /m/ 是否指向 mobile-h5（而非 PC 的 www）
set -euo pipefail

MOBILE_DIR=/opt/art-training/mobile-h5
INDEX="$MOBILE_DIR/index.html"

if [ ! -f "$INDEX" ]; then
  echo "FAIL: 缺少 $INDEX，请先部署 dist/build/h5"
  exit 1
fi

if grep -q 'ART-CMS' "$INDEX"; then
  echo "FAIL: mobile-h5/index.html 仍是 PC 包（ART-CMS），请重新执行 H5 构建部署"
  exit 1
fi

if ! grep -qE '教务移动|/m/assets/' "$INDEX"; then
  echo "WARN: index.html 未包含预期标题或 /m/assets/ 路径，请人工确认:"
  head -20 "$INDEX"
  exit 1
fi

echo "OK: mobile-h5/index.html 看起来是移动 H5 包"
head -12 "$INDEX"
