#!/usr/bin/env bash
# ตั้งค่า bench + สร้าง site ครั้งแรก (รันภายใน container "frappe" เท่านั้น)
#
#   docker compose exec frappe bash /workspace/docker/init-bench.sh
#
# ใช้เวลาราว 10-20 นาที (โหลด frappe / erpnext / healthcare จาก GitHub)
# รันซ้ำได้: ขั้นตอนที่ทำไปแล้วจะถูกข้าม

set -euo pipefail

FRAPPE_BRANCH="${FRAPPE_BRANCH:-version-15}"
SITE_NAME="${SITE_NAME:-his.localhost}"
DB_ROOT_PASSWORD="${DB_ROOT_PASSWORD:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin}"

cd /home/frappe

# ---------- 1) bench init ----------
if [ ! -d frappe-bench/apps/frappe ]; then
  echo "==> bench init (frappe ${FRAPPE_BRANCH})"
  bench init \
    --skip-redis-config-generation \
    --frappe-branch "${FRAPPE_BRANCH}" \
    frappe-bench
fi

cd frappe-bench

# ---------- 2) ชี้ service ไปที่ container อื่นใน compose ----------
echo "==> configure db/redis hosts"
bench set-config -g db_host mariadb
bench set-config -g redis_cache "redis://redis-cache:6379"
bench set-config -g redis_queue "redis://redis-queue:6379"
bench set-config -g redis_socketio "redis://redis-queue:6379"

# ---------- 3) ดึง apps ----------
if [ ! -d apps/erpnext ]; then
  echo "==> get-app erpnext"
  bench get-app --branch "${FRAPPE_BRANCH}" --resolve-deps erpnext
fi

if [ ! -d apps/healthcare ]; then
  echo "==> get-app healthcare (Frappe Health)"
  bench get-app --branch "${FRAPPE_BRANCH}" healthcare https://github.com/frappe/health
fi

if [ ! -d apps/his_custom ]; then
  echo "==> get-app his_custom (local, จาก repo นี้)"
  bench get-app /workspace/apps/his_custom
fi

# ---------- 4) สร้าง site ----------
if [ ! -d "sites/${SITE_NAME}" ]; then
  echo "==> new-site ${SITE_NAME}"
  # bench รุ่นใหม่ใช้ --mariadb-user-host-login-scope, รุ่นเก่าใช้ --no-mariadb-socket
  bench new-site "${SITE_NAME}" \
    --mariadb-root-password "${DB_ROOT_PASSWORD}" \
    --admin-password "${ADMIN_PASSWORD}" \
    --mariadb-user-host-login-scope='%' \
  || bench new-site "${SITE_NAME}" \
    --mariadb-root-password "${DB_ROOT_PASSWORD}" \
    --admin-password "${ADMIN_PASSWORD}" \
    --no-mariadb-socket
fi

# ---------- 5) ติดตั้ง apps ลง site ----------
for app in erpnext healthcare his_custom; do
  if ! bench --site "${SITE_NAME}" list-apps | grep -q "^${app}"; then
    echo "==> install-app ${app}"
    bench --site "${SITE_NAME}" install-app "${app}"
  fi
done

# ---------- 6) ค่าสำหรับ dev + headless frontend ----------
echo "==> dev config"
bench --site "${SITE_NAME}" set-config developer_mode 1
bench --site "${SITE_NAME}" set-config allow_cors '*'   # dev เท่านั้น — production ให้ระบุ origin ของ frontend
bench --site "${SITE_NAME}" enable-scheduler
bench use "${SITE_NAME}"

echo ""
echo "เสร็จแล้ว! สั่งรันด้วย:"
echo "  docker compose exec frappe bash -c 'cd frappe-bench && bench start'"
echo "แล้วเปิด http://localhost:8000 (Administrator / ${ADMIN_PASSWORD})"
