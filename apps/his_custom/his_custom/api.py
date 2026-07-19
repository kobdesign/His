"""REST API สำหรับ custom frontend (Next.js)

เรียกผ่าน:  /api/method/his_custom.api.<function_name>
ทุก endpoint ต้อง @frappe.whitelist() และต้องเช็คสิทธิ์เสมอ —
frappe.get_list เช็ค permission ของ user ที่ล็อกอินให้อยู่แล้ว
"""

import frappe
from frappe import _


@frappe.whitelist()
def ping():
	"""Health check สำหรับ frontend: /api/method/his_custom.api.ping"""
	return {"message": "pong", "user": frappe.session.user}


@frappe.whitelist()
def search_patients(query: str = "", limit: int = 20):
	"""ค้นหาผู้ป่วยด้วยชื่อ / เลข HN / เบอร์โทร — ใช้กับช่อง search หน้าเวชระเบียน"""
	filters = []
	if query:
		filters = [
			["Patient", "patient_name", "like", f"%{query}%"],
		]

	patients = frappe.get_list(
		"Patient",
		filters=filters,
		fields=[
			"name",
			"patient_name",
			"sex",
			"dob",
			"mobile",
			"status",
		],
		limit_page_length=int(limit),
		order_by="modified desc",
	)
	return patients


@frappe.whitelist()
def get_patient_summary(patient: str):
	"""ข้อมูลสรุปผู้ป่วยหนึ่งราย + นัดหมายล่าสุด — ใช้กับหน้า patient profile"""
	if not frappe.db.exists("Patient", patient):
		frappe.throw(_("Patient {0} not found").format(patient), frappe.DoesNotExistError)

	doc = frappe.get_doc("Patient", patient)
	doc.check_permission("read")

	appointments = frappe.get_list(
		"Patient Appointment",
		filters={"patient": patient},
		fields=["name", "appointment_date", "appointment_time", "status", "practitioner", "department"],
		limit_page_length=5,
		order_by="appointment_date desc",
	)

	return {
		"patient": {
			"name": doc.name,
			"patient_name": doc.patient_name,
			"sex": doc.sex,
			"dob": str(doc.dob) if doc.dob else None,
			"blood_group": doc.blood_group,
			"mobile": doc.mobile,
			"status": doc.status,
		},
		"recent_appointments": appointments,
	}
