#!/usr/bin/env bash
# 修复 /m/：1) 确保 mobile-h5 正确  2) www/m 软链兜底  3) 写入 Nginx location（所有 443 站点）
set -euo pipefail

MOBILE=/opt/art-training/mobile-h5
WWW=/opt/art-training/www
DOMAIN="${H5_PUBLIC_HOST:-orangeloveart.cn}"

BLOCKS_FILE=$(mktemp)
trap 'rm -f "$BLOCKS_FILE"' EXIT
cat > "$BLOCKS_FILE" <<'NGINX'

    location = /m {
        return 301 /m/;
    }
    location ^~ /m/assets/ {
        alias /opt/art-training/mobile-h5/assets/;
        expires 7d;
        access_log off;
    }
    location ^~ /m/ {
        alias /opt/art-training/mobile-h5/;
        index index.html;
    }
NGINX

echo "========== 1. 检查 mobile-h5 目录 =========="
if [ ! -f "$MOBILE/index.html" ]; then
  echo "FAIL: 缺少 $MOBILE/index.html，请先 Deploy H5（rsync dist/build/h5）"
  exit 1
fi
head -10 "$MOBILE/index.html"
if grep -q 'ART-CMS' "$MOBILE/index.html"; then
  echo "FAIL: mobile-h5 仍是 PC 包，GitHub Actions 部署未成功或 rsync 路径错误"
  exit 1
fi
echo "OK: mobile-h5 为移动 H5 包"

echo ""
echo "========== 2. www/m 软链（try_files 兜底）=========="
if [ -e "$WWW/m" ] && [ ! -L "$WWW/m" ]; then
  bak="$WWW/m.bak.$(date +%Y%m%d%H%M%S)"
  echo "备份并移除错误的 www/m 目录: $bak"
  mv "$WWW/m" "$bak"
fi
ln -sfn "$MOBILE" "$WWW/m"
ls -la "$WWW/m"

echo ""
echo "========== 3. 写入 Nginx =========="
mkdir -p /etc/nginx/backups /etc/nginx/snippets

for f in /etc/nginx/sites-enabled/*.bak.*; do
  [ -f "$f" ] && mv "$f" /etc/nginx/backups/
done

patch_config() {
  local CONFIG="$1"
  [ -f "$CONFIG" ] || return 0
  grep -qE 'listen.*443|orangeloveart|/opt/art-training/www' "$CONFIG" 2>/dev/null || return 0

  echo "处理: $CONFIG"
  cp "$CONFIG" "/etc/nginx/backups/$(basename "$CONFIG").$(date +%Y%m%d%H%M%S)"

  # 精确删除旧 /m/ 块（避免 /m/assets/ 与 /m/ 正则冲突）
  sed -i '/location = \/m {/,/^[[:space:]]*}/d' "$CONFIG"
  sed -i '/location \^~ \/m\/assets\/ {/,/^[[:space:]]*}/d' "$CONFIG"
  sed -i '/location \^~ \/m\/ {/,/^[[:space:]]*}/d' "$CONFIG"
  sed -i '/location @mobile_h5_fallback/,/^[[:space:]]*}/d' "$CONFIG"
  sed -i '/art-mobile-h5.conf/d' "$CONFIG"

  if grep -q 'location \^~ /m/assets/' "$CONFIG"; then
    echo "WARN: 仍有 /m/ location，请人工检查 $CONFIG"
    return 1
  fi

  local tmp
  tmp=$(mktemp)
  insert_awk() {
    local anchor="$1"
    awk -v anchor="$anchor" -v blocks="$BLOCKS_FILE" '
      function emit() {
        while ((getline line < blocks) > 0) print line
        close(blocks)
      }
      /server[[:space:]]*\{/ { inserver=1; ssl=0 }
      /^[[:space:]]*\}/ && inserver { inserver=0; ssl=0 }
      /listen[[:space:]]+443/ && inserver { ssl=1 }
      !done && ssl && inserver && index($0, anchor) > 0 {
        emit(); done=1
      }
      { print }
    ' "$CONFIG"
  }

  if grep -q 'location /api/' "$CONFIG"; then
    insert_awk 'location /api/' > "$tmp"
  elif grep -q 'location /assets/' "$CONFIG"; then
    insert_awk 'location /assets/' > "$tmp"
  else
    insert_awk 'location / {' > "$tmp"
  fi

  if ! grep -q 'location \^~ /m/assets/' "$tmp"; then
    echo "FAIL: 无法在 $CONFIG 的 443 server 中插入 /m/ location"
    rm -f "$tmp"
    return 1
  fi

  mv "$tmp" "$CONFIG"
}

patched=0
while IFS= read -r -d '' CONFIG; do
  patch_config "$CONFIG" && patched=1 || true
done < <(find /etc/nginx/sites-enabled /etc/nginx/conf.d -maxdepth 1 -name '*.conf' -type f ! -name '*.bak*' -print0 2>/dev/null)

if [ "$patched" -eq 0 ]; then
  echo "FAIL: 未找到可补丁的 Nginx 配置"
  exit 1
fi

nginx -t
systemctl reload nginx

echo ""
echo "========== 4. 验证 =========="
echo "--- 磁盘 mobile-h5 ---"
head -6 "$MOBILE/index.html"
echo "--- 磁盘 www/m ---"
head -6 "$WWW/m/index.html"
echo "--- curl 127.0.0.1 ---"
HTML=$(curl -sSk -H "Host: ${DOMAIN}" "https://127.0.0.1/m/")
echo "$HTML" | head -12
echo "$HTML" | grep -qE '教务移动|/m/assets/' || {
  echo "FAIL: Nginx 仍返回 PC 页"
  echo "请执行: sudo nginx -T | grep -n 'location.*\/m'"
  exit 1
}
echo "OK: /m/ 已指向移动 H5"
