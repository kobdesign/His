"""REST API สำหรับ custom frontend (Next.js)

เรียกผ่าน:  /api/method/his_custom.api.<function_name>
ทุก endpoint ต้อง @frappe.whitelist() และต้องเช็คสิทธิ์เสมอ —
frappe.get_list เช็ค permission ของ user ที่ล็อกอินให้อยู่แล้ว
"""

import frappe
from frappe import _
from frappe.utils import getdate, nowdate, nowtime


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


# ------------------------------------------------------------------
# OPD Queue + Triage (หน้าคัดกรอง)
# ------------------------------------------------------------------


def _appointment_status_options() -> list[str]:
	options = frappe.get_meta("Patient Appointment").get_field("status").options or ""
	return [s for s in options.split("\n") if s]


def _age_text(dob) -> str | None:
	if not dob:
		return None
	dob = getdate(dob)
	today = getdate(nowdate())
	years = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
	return f"{years} ปี"


@frappe.whitelist()
def get_opd_queue(date: str | None = None):
	"""คิว OPD ของวัน — นัดหมายทั้งหมด (ยกเว้นที่ยกเลิก) พร้อมสถานะการคัดกรอง"""
	date = date or nowdate()

	appointments = frappe.get_list(
		"Patient Appointment",
		filters={
			"appointment_date": date,
			"status": ["not in", ["Cancelled"]],
		},
		fields=[
			"name",
			"patient",
			"patient_name",
			"status",
			"appointment_time",
			"appointment_date",
			"department",
			"practitioner_name",
			"appointment_type",
		],
		order_by="appointment_time asc",
		limit_page_length=0,
	)

	# ติดธงว่ารายไหนบันทึก vital signs ของนัดนี้ไปแล้ว
	names = [a.name for a in appointments]
	vitals_done: set[str] = set()
	if names:
		vitals_done = {
			v.appointment
			for v in frappe.get_list(
				"Vital Signs",
				filters={"appointment": ["in", names], "docstatus": ["<", 2]},
				fields=["appointment"],
				limit_page_length=0,
			)
		}
	for a in appointments:
		a["has_vitals"] = a.name in vitals_done

	return {
		"date": str(date),
		"appointments": appointments,
		"status_options": _appointment_status_options(),
	}


@frappe.whitelist()
def update_appointment_status(appointment: str, status: str):
	"""เปลี่ยนสถานะนัดหมาย เช่น เช็คอินเมื่อผู้ป่วยมาถึง"""
	allowed = _appointment_status_options()
	if status not in allowed:
		frappe.throw(
			_("Invalid status {0}. Allowed: {1}").format(status, ", ".join(allowed)),
			frappe.ValidationError,
		)

	doc = frappe.get_doc("Patient Appointment", appointment)
	doc.status = status
	doc.save()  # เช็ค write permission ของ user ที่ล็อกอินให้เอง
	return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def get_appointment_detail(appointment: str):
	"""รายละเอียดนัดหมาย + ข้อมูลผู้ป่วย + vital signs ครั้งล่าสุด — ใช้กับหน้าคัดกรอง"""
	doc = frappe.get_doc("Patient Appointment", appointment)
	doc.check_permission("read")

	patient = frappe.get_doc("Patient", doc.patient)

	latest_vitals = frappe.get_list(
		"Vital Signs",
		filters={"patient": doc.patient, "docstatus": 1},
		fields=[
			"name",
			"signs_date",
			"signs_time",
			"temperature",
			"pulse",
			"respiratory_rate",
			"bp_systolic",
			"bp_diastolic",
			"height",
			"weight",
			"bmi",
		],
		order_by="signs_date desc, signs_time desc",
		limit_page_length=1,
	)

	return {
		"appointment": {
			"name": doc.name,
			"status": doc.status,
			"appointment_date": str(doc.appointment_date) if doc.appointment_date else None,
			"appointment_time": str(doc.appointment_time) if doc.appointment_time else None,
			"department": doc.department,
			"practitioner_name": doc.practitioner_name,
			"appointment_type": doc.appointment_type,
		},
		"patient": {
			"name": patient.name,
			"patient_name": patient.patient_name,
			"sex": patient.sex,
			"dob": str(patient.dob) if patient.dob else None,
			"age": _age_text(patient.dob),
			"blood_group": patient.blood_group,
			"mobile": patient.mobile,
		},
		"latest_vitals": latest_vitals[0] if latest_vitals else None,
	}


@frappe.whitelist(methods=["POST"])
def submit_vital_signs(
	patient: str,
	appointment: str | None = None,
	temperature: float | None = None,
	pulse: float | None = None,
	respiratory_rate: float | None = None,
	bp_systolic: float | None = None,
	bp_diastolic: float | None = None,
	oxygen_saturation: float | None = None,
	height: float | None = None,  # เมตร (frontend แปลงจาก ซม. มาแล้ว)
	weight: float | None = None,  # กก.
	note: str | None = None,
):
	"""บันทึกสัญญาณชีพจากหน้าคัดกรอง — สร้าง Vital Signs แล้ว submit ทันที"""
	doc = frappe.new_doc("Vital Signs")
	doc.patient = patient
	if appointment:
		doc.appointment = appointment
	doc.signs_date = nowdate()
	doc.signs_time = nowtime()

	numeric_fields = {
		"temperature": temperature,
		"pulse": pulse,
		"respiratory_rate": respiratory_rate,
		"bp_systolic": bp_systolic,
		"bp_diastolic": bp_diastolic,
		"height": height,
		"weight": weight,
	}
	for fieldname, value in numeric_fields.items():
		if value not in (None, ""):
			doc.set(fieldname, float(value))

	# SpO2 เป็น Custom Field จาก fixtures ของ app นี้ — กันพังถ้ายังไม่ migrate
	if oxygen_saturation not in (None, "") and doc.meta.has_field("oxygen_saturation"):
		doc.oxygen_saturation = float(oxygen_saturation)

	if note:
		doc.vital_signs_note = note

	doc.insert()  # เช็ค create permission
	doc.submit()

	return {
		"name": doc.name,
		"bmi": doc.bmi,
		"patient": doc.patient,
		"appointment": doc.appointment,
	}
