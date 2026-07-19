# HIS — Hospital Information System

ระบบสารสนเทศโรงพยาบาล สร้างบน [Frappe Health](https://frappe.io/health) (ERPNext for Healthcare)
พร้อม custom frontend สำหรับหน้างานที่ต้องการ UX เฉพาะทาง

## สถาปัตยกรรม

```
┌─────────────────────────┐      ┌──────────────────────────────────┐
│  frontend/  (Next.js)   │      │  Frappe bench (docker compose)   │
│  หน้าจอ high-traffic:    │─API─▶│  ├── frappe        (framework)  │
│  เวชระเบียน, คิว, ห้องตรวจ │      │  ├── erpnext       (ERP)        │
└─────────────────────────┘      │  ├── healthcare    (Frappe Health)│
                                 │  └── his_custom    (apps/ ใน repo)│
┌─────────────────────────┐      │                                  │
│  Frappe Desk (UI เดิม)   │─────▶│  MariaDB + Redis                 │
│  back-office: บัญชี, HR,  │      └──────────────────────────────────┘
│  จัดซื้อ, คลังยา           │
└─────────────────────────┘
```

- **หน้าจอ high-traffic** (แพทย์/พยาบาล/เวชระเบียน/การเงินหน้าเคาน์เตอร์) → custom UI ใน `frontend/`
- **งานหลังบ้าน** (บัญชี, HR, จัดซื้อ, รายงาน) → ใช้ Frappe Desk เดิม ไม่ต้องเขียนใหม่
- **customization ทุกอย่าง** (Custom Field, doc_events, API, DocType ใหม่) → อยู่ใน `apps/his_custom`
  ห้ามแก้ upstream ตรง ๆ เพื่อให้ upgrade ได้เสมอ

## โครงสร้าง repo

| path | คืออะไร |
|---|---|
| `docker-compose.yml` | dev stack: MariaDB, Redis ×2, bench container |
| `docker/init-bench.sh` | สคริปต์ติดตั้ง bench + สร้าง site ครั้งแรก |
| `apps/his_custom/` | Frappe custom app (mount เข้า container ให้ bench ใช้) |
| `frontend/` | Next.js frontend (App Router + Tailwind) |

## เริ่มใช้งาน — Backend

ต้องมี Docker + Docker Compose

```bash
# 1) ยกระบบขึ้น
docker compose up -d

# 2) ติดตั้ง bench + สร้าง site (ครั้งแรกครั้งเดียว ~10-20 นาที)
docker compose exec frappe bash /workspace/docker/init-bench.sh

# 3) รัน dev server
docker compose exec frappe bash -c "cd frappe-bench && bench start"
```

เปิด http://localhost:8000 — site `his.localhost`, login `Administrator` / `admin`

> ถ้าเข้าแล้วเจอ "site not found" ให้เพิ่ม `127.0.0.1 his.localhost` ใน `/etc/hosts`
> แล้วเข้า http://his.localhost:8000 แทน

## เริ่มใช้งาน — Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # แล้วใส่ FRAPPE_API_KEY / FRAPPE_API_SECRET
npm run dev
```

เปิด http://localhost:3000 — สร้าง API key จาก Frappe: **User → API Access → Generate Keys**

การเรียก API มี 2 ทาง:
- **Server Component** → `src/lib/frappe.ts` (token auth ผ่าน env — ห้ามหลุดไป client)
- **Browser** → เรียก `/frappe-api/*` ซึ่ง rewrite ไปที่ Frappe (ใช้ session cookie ปกติ)

Custom endpoint ตัวอย่างอยู่ที่ `apps/his_custom/his_custom/api.py`
(`/api/method/his_custom.api.search_patients` ฯลฯ)

## Roadmap

1. **Phase 1 — OPD นำร่อง** ✅: คิว/เช็คอิน (`/queue`) → คัดกรอง vital signs → ห้องตรวจแพทย์ (`/exam`) → ห้องยา+ตัดสต็อก (`/pharmacy`) → ออกบิล/รับชำระ (`/billing`)
2. **Phase 2 — IPD**: Admission / Transfer / Discharge, dashboard เตียง
3. **Phase 3 — สิทธิการรักษา + เคลม**: UC / ประกันสังคม / ข้าราชการ, ส่งออก 16/43 แฟ้ม, E-Claim สปสช.
4. **Phase 4 — Integration**: LIS เครื่องแล็บ, PACS (Orthanc/HL7/FHIR), ระบบคิว/จอเรียกคิว

## หมายเหตุ license

ERPNext / Frappe Health เป็น **GPLv3** — โค้ดใน `apps/his_custom` ที่ต่อขยายตัวมันอยู่ใต้ GPL ด้วย
ส่วน `frontend/` คุยผ่าน REST API ล้วน ๆ ถือเป็นงานแยก กำหนด license เองได้
