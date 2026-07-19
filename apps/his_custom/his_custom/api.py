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


# ------------------------------------------------------------------
# ห้องตรวจแพทย์ (Patient Encounter)
# ------------------------------------------------------------------

# แหล่งข้อมูล link search ของ frontend — map logical key -> (child doctype, link field)
# อ่าน target doctype จาก meta จริงเสมอ เพราะ Frappe Health แต่ละรุ่น schema ไม่เท่ากัน
LINK_SOURCES = {
	"complaint": ("Patient Encounter Symptom", None),  # None = ใช้ Link field แรกของ child
	"diagnosis": ("Patient Encounter Diagnosis", None),
	"drug": ("Drug Prescription", "drug_code"),
	"dosage": ("Drug Prescription", "dosage"),
	"period": ("Drug Prescription", "period"),
	"dosage_form": ("Drug Prescription", "dosage_form"),
	"lab_test": ("Lab Prescription", "lab_test_code"),
	"warehouse": ("Pharmacy Dispense", "warehouse"),
	"item": ("Pharmacy Dispense Item", "item_code"),
}


def _link_target(child_dt: str, fieldname: str | None = None):
	"""หา (fieldname, target doctype) ของ Link field ใน child doctype แบบกันรุ่นต่างกัน"""
	if not frappe.db.exists("DocType", child_dt):
		return (None, None)
	meta = frappe.get_meta(child_dt)
	field = meta.get_field(fieldname) if fieldname else None
	if not field:
		field = next((f for f in meta.fields if f.fieldtype == "Link"), None)
	if not field or not field.options:
		return (None, None)
	return (field.fieldname, field.options)


def _get_or_create_master(doctype: str, value: str) -> str | None:
	"""คืนชื่อ master record — สร้างใหม่ให้ถ้า doctype ตั้งชื่อจาก field (เช่น Diagnosis, Complaint)"""
	value = (value or "").strip()
	if not value:
		return None
	if frappe.db.exists(doctype, value):
		return value
	autoname = frappe.get_meta(doctype).autoname or ""
	if autoname.startswith("field:"):
		doc = frappe.get_doc({"doctype": doctype, autoname.split(":", 1)[1]: value})
		doc.insert()
		return doc.name
	frappe.throw(_("{0} '{1}' ไม่มีในระบบ — กรุณาเลือกจากรายการ").format(_(doctype), value))


def _set_multiselect(doc, table_field: str, values, allow_create: bool = False):
	"""แทนที่ child table แบบ multiselect (symptoms / diagnosis) ด้วยรายการใหม่"""
	if values is None or not doc.meta.has_field(table_field):
		return
	child_dt = doc.meta.get_field(table_field).options
	link_field, target = _link_target(child_dt)
	if not link_field:
		return
	doc.set(table_field, [])
	for value in values:
		if allow_create:
			name = _get_or_create_master(target, value)
		else:
			name = (value or "").strip() or None
			if name and not frappe.db.exists(target, name):
				frappe.throw(_("{0} '{1}' ไม่มีในระบบ").format(_(target), name))
		if name:
			doc.append(table_field, {link_field: name})


def _encounter_to_dict(doc) -> dict:
	drugs = []
	if doc.meta.has_field("drug_prescription"):
		for row in doc.get("drug_prescription"):
			drugs.append(
				{
					"drug": row.get("drug_code") or row.get("medication"),
					"drug_name": row.get("drug_name"),
					"dosage": row.get("dosage"),
					"period": row.get("period"),
					"dosage_form": row.get("dosage_form"),
					"comment": row.get("comment"),
				}
			)

	lab_tests = []
	if doc.meta.has_field("lab_test_prescription"):
		link_field, _target = _link_target(
			doc.meta.get_field("lab_test_prescription").options, "lab_test_code"
		)
		if link_field:
			lab_tests = [
				row.get(link_field) for row in doc.get("lab_test_prescription") if row.get(link_field)
			]

	def table_links(table_field):
		if not doc.meta.has_field(table_field):
			return []
		link_field, _t = _link_target(doc.meta.get_field(table_field).options)
		if not link_field:
			return []
		return [row.get(link_field) for row in doc.get(table_field) if row.get(link_field)]

	notes = ""
	for fieldname in ("encounter_comment", "notes"):
		if doc.meta.has_field(fieldname):
			notes = doc.get(fieldname) or ""
			break

	return {
		"name": doc.name,
		"docstatus": doc.docstatus,
		"symptoms": table_links("symptoms"),
		"diagnosis": table_links("diagnosis"),
		"drugs": drugs,
		"lab_tests": lab_tests,
		"notes": notes,
	}


@frappe.whitelist()
def search_link(key: str, query: str = "", limit: int = 10):
	"""typeahead search สำหรับฟอร์มห้องตรวจ — จำกัดเฉพาะ doctype ใน LINK_SOURCES เท่านั้น"""
	if key not in LINK_SOURCES:
		frappe.throw(_("Unknown link key: {0}").format(key))

	child_dt, fieldname = LINK_SOURCES[key]
	_link_fieldname, target = _link_target(child_dt, fieldname)
	if not target:
		return {"doctype": None, "results": []}

	meta = frappe.get_meta(target)
	title_field = None
	if meta.title_field and meta.title_field != "name" and meta.has_field(meta.title_field):
		title_field = meta.title_field

	fields = ["name"] + ([title_field] if title_field else [])
	kwargs: dict = {
		"fields": fields,
		"limit_page_length": min(int(limit), 20),
	}
	if query:
		or_filters = [[target, "name", "like", f"%{query}%"]]
		if title_field:
			or_filters.append([target, title_field, "like", f"%{query}%"])
		kwargs["or_filters"] = or_filters

	rows = frappe.get_list(target, **kwargs)
	return {
		"doctype": target,
		"results": [
			{"value": r["name"], "label": (r.get(title_field) if title_field else None) or r["name"]}
			for r in rows
		],
	}


@frappe.whitelist()
def get_encounter_context(appointment: str):
	"""ข้อมูลทั้งหมดที่หน้าห้องตรวจต้องใช้: นัด + ผู้ป่วย + vitals + encounter (ถ้ามี)"""
	detail = get_appointment_detail(appointment)

	names = frappe.get_all(
		"Patient Encounter",
		filters={"appointment": appointment, "docstatus": ["<", 2]},
		order_by="docstatus desc, modified desc",  # ถ้ามีทั้ง submitted และ draft ให้ submitted ชนะ
		pluck="name",
		limit=1,
	)
	encounter = None
	if names:
		doc = frappe.get_doc("Patient Encounter", names[0])
		doc.check_permission("read")
		encounter = _encounter_to_dict(doc)

	detail["encounter"] = encounter
	return detail


@frappe.whitelist(methods=["POST"])
def save_encounter(
	appointment: str,
	symptoms=None,
	diagnosis=None,
	drugs=None,
	lab_tests=None,
	notes: str | None = None,
	submit=0,
):
	"""บันทึก (ร่าง) หรือจบการตรวจ — สร้าง/แก้ Patient Encounter ของนัดหมายนี้

	symptoms / diagnosis: list[str] — สร้าง master ใหม่ให้ถ้ายังไม่มี
	drugs: list[dict] — {drug, dosage, period, dosage_form, comment}
	lab_tests: list[str] — ชื่อ Lab Test Template
	submit: 1 = submit เอกสารจบการตรวจ
	"""
	from frappe.utils import cint

	symptoms = frappe.parse_json(symptoms) if isinstance(symptoms, str) else symptoms
	diagnosis = frappe.parse_json(diagnosis) if isinstance(diagnosis, str) else diagnosis
	drugs = frappe.parse_json(drugs) if isinstance(drugs, str) else drugs
	lab_tests = frappe.parse_json(lab_tests) if isinstance(lab_tests, str) else lab_tests

	appt = frappe.get_doc("Patient Appointment", appointment)
	appt.check_permission("read")

	if frappe.db.exists("Patient Encounter", {"appointment": appointment, "docstatus": 1}):
		frappe.throw(_("นัดหมายนี้ตรวจเสร็จแล้ว — Patient Encounter ถูก submit ไปแล้ว"))

	if not appt.practitioner:
		frappe.throw(
			_("นัดหมายนี้ยังไม่ได้ระบุแพทย์ (Practitioner) — กรุณาแก้ไขที่ Patient Appointment ก่อน")
		)

	existing = frappe.get_all(
		"Patient Encounter",
		filters={"appointment": appointment, "docstatus": 0},
		pluck="name",
		limit=1,
	)
	if existing:
		doc = frappe.get_doc("Patient Encounter", existing[0])
	else:
		doc = frappe.new_doc("Patient Encounter")
		doc.appointment = appointment
		doc.patient = appt.patient
		doc.practitioner = appt.practitioner
		if doc.meta.has_field("medical_department") and appt.get("department"):
			doc.medical_department = appt.department
		if doc.meta.has_field("company") and appt.get("company"):
			doc.company = appt.company

	doc.encounter_date = nowdate()
	doc.encounter_time = nowtime()

	_set_multiselect(doc, "symptoms", symptoms, allow_create=True)
	_set_multiselect(doc, "diagnosis", diagnosis, allow_create=True)

	# ใบสั่งยา — field ต่างรุ่นต่างกัน จึงเซ็ตเฉพาะ field ที่มีจริงใน meta
	if drugs is not None and doc.meta.has_field("drug_prescription"):
		child_meta = frappe.get_meta(doc.meta.get_field("drug_prescription").options)
		doc.set("drug_prescription", [])
		for d in drugs or []:
			row = {}
			for src, fieldname in (
				("drug", "drug_code"),
				("dosage", "dosage"),
				("period", "period"),
				("dosage_form", "dosage_form"),
				("comment", "comment"),
			):
				if d.get(src) and child_meta.has_field(fieldname):
					row[fieldname] = d[src]
			if (
				d.get("drug")
				and child_meta.has_field("medication")
				and frappe.db.exists("Medication", d["drug"])
			):
				row["medication"] = d["drug"]
			if row:
				doc.append("drug_prescription", row)

	# สั่งแล็บ
	if lab_tests is not None and doc.meta.has_field("lab_test_prescription"):
		link_field, target = _link_target(
			doc.meta.get_field("lab_test_prescription").options, "lab_test_code"
		)
		doc.set("lab_test_prescription", [])
		for t in lab_tests or []:
			if link_field and t and frappe.db.exists(target, t):
				doc.append("lab_test_prescription", {link_field: t})

	if notes is not None:
		for fieldname in ("encounter_comment", "notes"):
			if doc.meta.has_field(fieldname):
				doc.set(fieldname, notes)
				break

	doc.save()
	if cint(submit):
		doc.submit()

	return _encounter_to_dict(doc)


# ------------------------------------------------------------------
# ห้องยา (Pharmacy Dispense)
# ------------------------------------------------------------------


def _resolve_drug_item(drug: str | None) -> dict | None:
	"""แปลงค่า drug จากใบสั่งยาให้เป็น Item สำหรับตัดสต็อก

	drug_code ใน Drug Prescription อาจ link ไป Item ตรง ๆ (schema เก่า)
	หรือ Medication (Frappe Health รุ่นใหม่) — ถ้าเป็น Medication
	ให้ตามหา Item ที่ผูกไว้ใน field/child table ของมัน
	"""
	if not drug:
		return None

	item = None
	if frappe.db.exists("Item", drug):
		item = drug
	elif frappe.db.exists("DocType", "Medication") and frappe.db.exists("Medication", drug):
		med_meta = frappe.get_meta("Medication")
		med = frappe.get_doc("Medication", drug)
		for fieldname in ("item", "item_code"):
			if med_meta.has_field(fieldname) and med.get(fieldname):
				item = med.get(fieldname)
				break
		if not item:
			# หา child table แรกที่มี Link -> Item (เช่น linked_items)
			for table_field in med_meta.fields:
				if table_field.fieldtype != "Table":
					continue
				child_meta = frappe.get_meta(table_field.options)
				link = next(
					(f.fieldname for f in child_meta.fields if f.fieldtype == "Link" and f.options == "Item"),
					None,
				)
				rows = med.get(table_field.fieldname) if link else None
				if link and rows:
					item = rows[0].get(link)
					break

	if not item:
		return None

	item_name, stock_uom = frappe.db.get_value("Item", item, ["item_name", "stock_uom"])
	return {"item_code": item, "item_name": item_name, "stock_uom": stock_uom}


@frappe.whitelist()
def get_pharmacy_queue(date: str | None = None):
	"""คิวห้องยา — encounter ที่ submit แล้วของวัน เฉพาะที่มีใบสั่งยา พร้อมสถานะจ่ายยา"""
	date = date or nowdate()

	enc_meta = frappe.get_meta("Patient Encounter")
	fields = ["name", "patient", "patient_name", "encounter_date", "encounter_time"]
	for optional in ("practitioner_name", "medical_department"):
		if enc_meta.has_field(optional):
			fields.append(optional)

	encounters = frappe.get_list(
		"Patient Encounter",
		filters={"encounter_date": date, "docstatus": 1},
		fields=fields,
		order_by="encounter_time asc",
		limit_page_length=0,
	)
	if not encounters:
		return {"date": str(date), "encounters": []}

	names = [e.name for e in encounters]

	# นับรายการยาต่อ encounter — เอาเฉพาะที่มีใบสั่งยา
	drug_counts = {
		r.parent: r.drug_count
		for r in frappe.get_all(
			"Drug Prescription",
			filters={"parent": ["in", names], "parenttype": "Patient Encounter"},
			fields=["parent", "count(name) as drug_count"],
			group_by="parent",
		)
	}

	dispenses = {
		d.encounter: d.name
		for d in frappe.get_all(
			"Pharmacy Dispense",
			filters={"encounter": ["in", names], "docstatus": 1},
			fields=["encounter", "name"],
		)
	}

	rows = []
	for e in encounters:
		if not drug_counts.get(e.name):
			continue
		e["drug_count"] = drug_counts[e.name]
		e["dispensed"] = e.name in dispenses
		e["dispense_name"] = dispenses.get(e.name)
		rows.append(e)

	return {"date": str(date), "encounters": rows}


@frappe.whitelist()
def get_dispense_context(encounter: str):
	"""ข้อมูลหน้าจ่ายยา: encounter + ผู้ป่วย + ใบสั่งยาที่ resolve เป็น Item + dispense เดิม (ถ้ามี)"""
	doc = frappe.get_doc("Patient Encounter", encounter)
	doc.check_permission("read")
	if doc.docstatus != 1:
		frappe.throw(_("Encounter {0} ยังไม่จบการตรวจ (ยังไม่ submit)").format(encounter))

	patient = frappe.get_doc("Patient", doc.patient)

	prescriptions = []
	if doc.meta.has_field("drug_prescription"):
		for row in doc.get("drug_prescription"):
			drug = row.get("drug_code") or row.get("medication")
			resolved = _resolve_drug_item(drug)
			prescriptions.append(
				{
					"drug": drug,
					"drug_name": row.get("drug_name"),
					"dosage": row.get("dosage"),
					"period": row.get("period"),
					"comment": row.get("comment"),
					"item_code": resolved["item_code"] if resolved else None,
					"item_name": resolved["item_name"] if resolved else None,
					"stock_uom": resolved["stock_uom"] if resolved else None,
				}
			)

	dispense = None
	names = frappe.get_all(
		"Pharmacy Dispense",
		filters={"encounter": encounter, "docstatus": 1},
		pluck="name",
		limit=1,
	)
	if names:
		d = frappe.get_doc("Pharmacy Dispense", names[0])
		dispense = {
			"name": d.name,
			"warehouse": d.warehouse,
			"update_stock": d.update_stock,
			"stock_entry": d.stock_entry,
			"posting_date": str(d.posting_date) if d.posting_date else None,
			"items": [
				{
					"drug": r.drug,
					"item_code": r.item_code,
					"item_name": r.item_name,
					"qty": r.qty,
					"uom": r.uom,
					"dosage": r.dosage,
					"instructions": r.instructions,
				}
				for r in d.items
			],
		}

	return {
		"encounter": {
			"name": doc.name,
			"encounter_date": str(doc.encounter_date) if doc.encounter_date else None,
			"encounter_time": str(doc.encounter_time) if doc.encounter_time else None,
			"practitioner_name": doc.get("practitioner_name"),
		},
		"patient": {
			"name": patient.name,
			"patient_name": patient.patient_name,
			"sex": patient.sex,
			"age": _age_text(patient.dob),
			"mobile": patient.mobile,
		},
		"prescriptions": prescriptions,
		"dispense": dispense,
	}


@frappe.whitelist(methods=["POST"])
def submit_dispense(encounter: str, items, warehouse: str | None = None, update_stock=1):
	"""จ่ายยา — สร้าง Pharmacy Dispense แล้ว submit (ตัดสต็อกตาม update_stock)

	items: list[dict] — {drug, item_code, qty, uom, dosage, period, instructions}
	"""
	from frappe.utils import cint

	items = frappe.parse_json(items) if isinstance(items, str) else items
	if not items:
		frappe.throw(_("ไม่มีรายการยาให้จ่าย"))

	enc = frappe.get_doc("Patient Encounter", encounter)
	enc.check_permission("read")
	if enc.docstatus != 1:
		frappe.throw(_("Encounter {0} ยังไม่จบการตรวจ").format(encounter))

	doc = frappe.new_doc("Pharmacy Dispense")
	doc.encounter = encounter
	doc.patient = enc.patient
	doc.appointment = enc.get("appointment")
	doc.warehouse = warehouse
	doc.update_stock = cint(update_stock)
	for item in items:
		doc.append(
			"items",
			{
				"drug": item.get("drug"),
				"item_code": item.get("item_code"),
				"qty": flt(item.get("qty")) or 1,
				"uom": item.get("uom"),
				"dosage": item.get("dosage"),
				"period": item.get("period"),
				"instructions": item.get("instructions"),
			},
		)

	doc.insert()
	doc.submit()

	return {"name": doc.name, "stock_entry": doc.stock_entry}
