#!/usr/bin/env bash
# 在服务器上运行：sudo bash diagnose-m-h5.sh
set -euo pipefail

echo "========== 1. mobile-h5 目录 =========="
MOBILE=/opt/art-training/mobile-h5
if [ -f "$MOBILE/index.html" ]; then
  head -12 "$MOBILE/index.html"
  if grep -q 'ART-CMS' "$MOBILE/index.html"; then
    echo ">>> 问题 A: mobile-h5 里是 PC 包，需要重新 Deploy H5（GitHub workflow 或 rsync dist/build/h5）"
  elif grep -qE '教务移动|/m/assets/' "$MOBILE/index.html"; then
    echo ">>> mobile-h5 文件看起来正确"
  fi
else
  echo ">>> 问题 A: 缺少 $MOBILE/index.html"
fi
echo
ls -la "$MOBILE" 2>/dev/null | head -8 || true
echo

echo "========== 2. www/m 软链 =========="
ls -la /opt/art-training/www/m 2>/dev/null || echo "无 www/m"
if [ -L /opt/art-training/www/m ]; then
  readlink -f /opt/art-training/www/m || true
fi
if [ -d /opt/art-training/www/m ] && [ ! -L /opt/art-training/www/m ]; then
  head -6 /opt/art-training/www/m/index.html 2>/dev/null || true
  echo ">>> 问题 B: www/m 是实体目录（常为 PC 副本），fix 脚本会备份并改为软链"
fi
echo

echo "========== 3. Nginx 是否包含 /m/ location =========="
grep -rn 'art-mobile-h5\|location \^~ /m/\|location = /m' /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null || echo "未找到 /m/ 配置"
echo

echo "========== 4. 生效配置（nginx -T 片段）=========="
nginx -T 2>/dev/null | grep -n 'server_name\|location \^~ /m/\|location = /m\|art-mobile-h5\|root /opt/art-training' | head -40 || nginx -t
echo

echo "========== 5. 本机 curl（走 127.0.0.1 避免 CDN）=========="
curl -sS -H 'Host: orangeloveart.cn' http://127.0.0.1/m/ 2>/dev/null | head -12 || true
curl -sSk -H 'Host: orangeloveart.cn' https://127.0.0.1/m/ 2>/dev/null | head -12 || true
