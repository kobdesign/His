app_name = "his_custom"
app_title = "HIS Custom"
app_publisher = "iPassion Co., Ltd."
app_description = "Hospital Information System customizations on top of Frappe Health / ERPNext"
app_email = "abhisak@ipassion.co.th"
app_license = "gpl-3.0"

# Frappe Health (app ชื่อ "healthcare") และ erpnext ต้องถูกติดตั้งก่อน
required_apps = ["erpnext", "healthcare"]

# ------------------------------------------------------------------
# จุดต่อขยายที่ใช้บ่อย — เปิดคอมเมนต์เมื่อเริ่มใช้จริง
# ------------------------------------------------------------------

# Fixtures: เก็บ Custom Field / Property Setter / Translation ลง git
# fixtures = [
# 	{"dt": "Custom Field", "filters": [["module", "=", "HIS Custom"]]},
# 	{"dt": "Property Setter", "filters": [["module", "=", "HIS Custom"]]},
# ]

# Document Events: hook ลอจิกเพิ่มเข้ากับ DocType ของ Frappe Health
# doc_events = {
# 	"Patient Encounter": {
# 		"on_submit": "his_custom.events.patient_encounter.on_submit",
# 	},
# 	"Patient Appointment": {
# 		"after_insert": "his_custom.events.patient_appointment.after_insert",
# 	},
# }

# Scheduled Tasks
# scheduler_events = {
# 	"daily": [
# 		"his_custom.tasks.daily",
# 	],
# }

# Override doctype class ของ Frappe Health เมื่อ workflow ไม่ตรงกับ รพ.
# override_doctype_class = {
# 	"Patient Appointment": "his_custom.overrides.CustomPatientAppointment",
# }
