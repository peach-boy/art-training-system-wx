#!/usr/bin/env bash
# 修复 /m/：hash 路由无需 SPA fallback；assets 单独 location，避免回落到 PC 的 index.html
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

CONFIG="${1:-/etc/nginx/sites-enabled/art-training.conf}"
if [ ! -f "$CONFIG" ]; then
  for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf; do
    [ -f "$f" ] || continue
    [[ "$f" == *.bak.* ]] && continue
    if grep -qE '/opt/art-training/www|orangeloveart' "$f" 2>/dev/null; then
      CONFIG="$f"
      break
    fi
  done
fi

echo "站点配置: $CONFIG"
cp "$CONFIG" "/etc/nginx/backups/$(basename "$CONFIG").$(date +%Y%m%d%H%M%S)"

# 移除旧的 /m/ 相关 location（避免重复）
sed -i '/location = \/m/,/^[[:space:]]*}/d' "$CONFIG" 2>/dev/null || true
sed -i '/location \^~ \/m\//,/^[[:space:]]*}/d' "$CONFIG" 2>/dev/null || true
sed -i '/location @mobile_h5_fallback/,/^[[:space:]]*}/d' "$CONFIG" 2>/dev/null || true
sed -i '/art-mobile-h5.conf/d' "$CONFIG" 2>/dev/null || true

if ! grep -q 'art-mobile-h5.conf' "$CONFIG"; then
  sed -i '/^[[:space:]]*location \/ {/i \    include /etc/nginx/snippets/art-mobile-h5.conf;' "$CONFIG"
fi

nginx -t
systemctl reload nginx
echo "OK. 目录检查:"
ls -la /opt/art-training/mobile-h5/ | head -12
ls /opt/art-training/mobile-h5/assets/ 2>/dev/null | head -5 || echo "WARN: 无 assets，请重新 Deploy H5"
