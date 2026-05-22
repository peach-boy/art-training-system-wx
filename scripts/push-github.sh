#!/usr/bin/env bash
# 创建 GitHub 仓库并推送（需已安装 gh 且已登录：gh auth login）
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v gh >/dev/null 2>&1; then
  echo "未安装 GitHub CLI。请先执行："
  echo "  brew install gh && gh auth login"
  echo ""
  echo "或在 GitHub 网页创建空仓库后推送："
  echo "  https://github.com/new  → 仓库名 art-training-system-wx"
  echo "  git push -u origin main"
  exit 1
fi

if gh repo view peach-boy/art-training-system-wx >/dev/null 2>&1; then
  git push -u origin main
else
  gh repo create peach-boy/art-training-system-wx --public --source=. --remote=origin --push
fi

echo "Done: https://github.com/peach-boy/art-training-system-wx"
