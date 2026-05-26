#!/usr/bin/env bash
# 修复 /m/：hash 路由；assets 单独 location；配置直接写入站点文件（不仅 include）
set -euo pipefail

SNIPPET=/etc/nginx/snippets/art-mobile-h5.conf
mkdir -p /etc/nginx/snippets /etc/nginx/backups

for f in /etc/nginx/sites-enabled/*.bak.*; do
  [ -f "$f" ] && mv "$f" /etc/nginx/backups/
done

cat > "$SNIPPET" <<'EOF'
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
EOF

find_config() {
  local f
  for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
    [ -f "$f" ] || continue
    [[ "$f" == *.bak* ]] && continue
    if grep -qE 'orangeloveart|/opt/art-training/www' "$f" 2>/dev/null; then
      echo "$f"
      return 0
    fi
  done
  for f in /etc/nginx/sites-enabled/art-training.conf /etc/nginx/sites-enabled/default; do
    [ -f "$f" ] && echo "$f" && return 0
  done
  return 1
}

CONFIG="${1:-}"
if [ -z "$CONFIG" ]; then
  CONFIG=$(find_config) || { echo "FAIL: 找不到 Nginx 站点配置"; exit 1; }
fi

echo "站点配置: $CONFIG"
cp "$CONFIG" "/etc/nginx/backups/$(basename "$CONFIG").$(date +%Y%m%d%H%M%S)"

# 删除旧的 /m/ 块与 include 行
sed -i '/art-mobile-h5.conf/d' "$CONFIG"
sed -i '/location = \/m/,/^[[:space:]]*}/d' "$CONFIG"
sed -i '/location \^~ \/m\//,/^[[:space:]]*}/d' "$CONFIG"
sed -i '/location @mobile_h5_fallback/,/^[[:space:]]*}/d' "$CONFIG"

inserted=0
insert_before() {
  local pattern="$1"
  local label="$2"
  if grep -qF "$pattern" "$CONFIG"; then
    awk -v pat="$pattern" -v snip="$SNIPPET" '
      index($0, pat) && !done {
        while ((getline line < snip) > 0) print line
        done=1
      }
      { print }
    ' "$CONFIG" > "${CONFIG}.tmp" && mv "${CONFIG}.tmp" "$CONFIG"
    inserted=1
    echo "已在「${label}」前插入 /m/ location"
    return 0
  fi
  return 1
}

insert_before 'location /api/' 'location /api/' || \
insert_before 'location /assets/' 'location /assets/' || \
insert_before 'location / {' 'location / {' || true

if [ "$inserted" -eq 0 ]; then
  awk -v snip="$SNIPPET" '
    /listen 443/ { inssl=1 }
    inssl && /root / && !done {
      while ((getline line < snip) > 0) print line
      done=1
    }
    { print }
  ' "$CONFIG" > "${CONFIG}.tmp" && mv "${CONFIG}.tmp" "$CONFIG"
  echo "已在 SSL server 的 root 后插入 /m/ location"
fi

if ! grep -q 'location \^~ /m/' "$CONFIG"; then
  echo "FAIL: 未能写入 location /m/，请手动编辑 $CONFIG"
  exit 1
fi

nginx -t
systemctl reload nginx

echo ""
echo "========== 部署目录 =========="
ls -la /opt/art-training/mobile-h5/ 2>/dev/null | head -10 || echo "WARN: 无 mobile-h5"
if [ -f /opt/art-training/mobile-h5/index.html ]; then
  head -8 /opt/art-training/mobile-h5/index.html
  if grep -q 'ART-CMS' /opt/art-training/mobile-h5/index.html; then
    echo ""
    echo "WARN: mobile-h5/index.html 仍是 PC 包！Nginx 修好后仍会显示 ART-CMS。"
    echo "请执行 H5 部署: rsync dist/build/h5/ → /opt/art-training/mobile-h5/"
  fi
fi

echo ""
echo "========== 本机验证 =========="
curl -sSk -H 'Host: orangeloveart.cn' https://127.0.0.1/m/ | head -12
