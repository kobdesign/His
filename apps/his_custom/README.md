# HIS Custom

Frappe app สำหรับ customization ทั้งหมดของระบบ HIS — ติดตั้งทับ ERPNext + Frappe Health (`healthcare`)

หลักการสำคัญ: **ห้ามแก้โค้ดใน frappe / erpnext / healthcare ตรง ๆ** ทุกอย่างทำผ่าน app นี้ด้วย
hooks, Custom Field (เก็บเป็น fixtures), override_doctype_class และ API ใหม่ใน `his_custom/api.py`
เพื่อให้ upgrade ตัว upstream ได้เสมอ

## โครงสร้าง

```
his_custom/
├── hooks.py          # จุดต่อขยายทั้งหมด (doc_events, fixtures, overrides, scheduler)
├── api.py            # REST endpoints สำหรับ custom frontend
├── modules.txt
├── patches.txt
└── his_custom/       # module "HIS Custom" — DocType ใหม่ ๆ จะถูกสร้างในนี้
```

## ติดตั้ง (ภายใน bench)

```bash
bench get-app /workspace/apps/his_custom
bench --site his.localhost install-app his_custom
```
