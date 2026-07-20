/** การจัดลำดับ worklist ของห้องตรวจและห้องยา — pure logic, ทดสอบได้ */

/** สถานะนัดที่ถือว่าจบกระบวนการตรวจแล้ว (ไม่ต้องขึ้นคิวหน้า) */
const EXAM_DONE_STATUSES = new Set(["Closed", "Checked Out"]);

export type ExamReadiness = "ready" | "waiting" | "finished";

type ExamRow = { status: string; has_vitals: boolean };

/** พร้อมตรวจ (คัดกรองแล้ว) / รอคัดกรอง / เสร็จสิ้น */
export function examReadiness(a: ExamRow): ExamReadiness {
  if (EXAM_DONE_STATUSES.has(a.status)) return "finished";
  return a.has_vitals ? "ready" : "waiting";
}

const EXAM_ORDER: Record<ExamReadiness, number> = {
  ready: 0,
  waiting: 1,
  finished: 2,
};

/** จัดลำดับคิวห้องตรวจ: พร้อมตรวจ -> รอคัดกรอง -> เสร็จสิ้น (stable) */
export function sortExamWorklist<T extends ExamRow>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => EXAM_ORDER[examReadiness(a)] - EXAM_ORDER[examReadiness(b)],
  );
}

type PharmacyRow = { dispensed: boolean };

/** จัดลำดับคิวห้องยา: รอจ่ายยา -> จ่ายแล้ว (stable) */
export function sortPharmacyQueue<T extends PharmacyRow>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => Number(a.dispensed) - Number(b.dispensed),
  );
}
