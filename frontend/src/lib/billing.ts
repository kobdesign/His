/** สถานะและการจัดลำดับของคิวการเงิน — pure logic, ทดสอบได้ */

export type BillState = "unbilled" | "unpaid" | "paid";

type BillableRow = { invoice: { outstanding_amount: number } | null };

/** ยังไม่ออกบิล -> ออกบิลแล้วแต่ยังค้างชำระ -> ชำระครบ */
export function billState(row: BillableRow): BillState {
  if (!row.invoice) return "unbilled";
  return row.invoice.outstanding_amount > 0 ? "unpaid" : "paid";
}

/** ลำดับที่ต้องดำเนินการก่อน (เลขน้อย = ขึ้นก่อน) */
export const BILL_STATE_ORDER: Record<BillState, number> = {
  unbilled: 0,
  unpaid: 1,
  paid: 2,
};

/** จัดลำดับคิว: รอออกบิล -> ค้างชำระ -> ชำระแล้ว (stable, ไม่แก้ array เดิม) */
export function sortByBillState<T extends BillableRow>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => BILL_STATE_ORDER[billState(a)] - BILL_STATE_ORDER[billState(b)],
  );
}
