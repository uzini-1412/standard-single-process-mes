#!/usr/bin/env bash
# 배포 서버(VM)에서 실행: 최신 코드 받아서 재빌드 + 기동 + 오래된 이미지 정리.
# 사용법: cd standard-single-process-mes && ./deploy.sh
set -e

echo "=== 1/3 git pull ==="
git pull origin main

echo "=== 2/3 docker compose build & up ==="
docker compose up -d --build

echo "=== 3/3 오래된(dangling) 이미지 정리 ==="
docker image prune -f

echo "=== 완료 ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
