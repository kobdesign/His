import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import flt, nowdate, nowtime


class PharmacyDispense(Document):
	def before_insert(self):
		if not self.posting_date:
			self.posting_date = nowdate()
		if not self.posting_time:
			self.posting_time = nowtime()
		if not self.dispensed_by:
			self.dispensed_by = frappe.session.user

	def validate(self):
		self.check_duplicate_dispense()
		for row in self.items:
			if flt(row.qty) <= 0:
				frappe.throw(_("แถวที่ {0}: จำนวนจ่ายต้องมากกว่า 0").format(row.idx))

	def check_duplicate_dispense(self):
		existing = frappe.db.exists(
			"Pharmacy Dispense",
			{"encounter": self.encounter, "docstatus": 1, "name": ["!=", self.name]},
		)
		if existing:
			frappe.throw(
				_("Encounter {0} จ่ายยาไปแล้ว (เอกสาร {1})").format(self.encounter, existing)
			)

	def on_submit(self):
		if self.update_stock:
			self.make_stock_entry()

	def make_stock_entry(self):
		# แถวที่ไม่มี item_code = จ่ายนอกสต็อก (เช่น ยาที่ยังไม่ตั้งใน Item master) — ข้ามได้
		stock_rows = [row for row in self.items if row.item_code]
		if not stock_rows:
			return
		if not self.warehouse:
			frappe.throw(_("ระบุคลังยา (Warehouse) ก่อนตัดสต็อก หรือปิด Update Stock"))

		se = frappe.new_doc("Stock Entry")
		se.stock_entry_type = "Material Issue"
		se.purpose = "Material Issue"
		for row in stock_rows:
			se.append(
				"items",
				{
					"item_code": row.item_code,
					"qty": flt(row.qty),
					"uom": row.uom or frappe.db.get_value("Item", row.item_code, "stock_uom"),
					"s_warehouse": self.warehouse,
				},
			)
		se.insert()
		se.submit()
		self.db_set("stock_entry", se.name)

	def on_cancel(self):
		if self.stock_entry:
			se = frappe.get_doc("Stock Entry", self.stock_entry)
			self.db_set("stock_entry", None)
			if se.docstatus == 1:
				se.flags.ignore_links = True
				se.cancel()
