import { describe, expect, it } from "vitest";
import { examReadiness, sortExamWorklist, sortPharmacyQueue } from "@/lib/worklist";

const appt = (name: string, status: string, has_vitals: boolean) => ({
  name,
  status,
  has_vitals,
});

describe("examReadiness", () => {
  it("คัดกรองแล้วและยังไม่ตรวจ -> ready", () => {
    expect(examReadiness(appt("a", "Checked In", true))).toBe("ready");
  });

  it("ยังไม่คัดกรอง -> waiting", () => {
    expect(examReadiness(appt("a", "Scheduled", false))).toBe("waiting");
  });

  it("ตรวจเสร็จแล้ว (Closed / Checked Out) -> finished แม้จะมี vitals", () => {
    expect(examReadiness(appt("a", "Closed", true))).toBe("finished");
    expect(examReadiness(appt("a", "Checked Out", true))).toBe("finished");
  });
});

describe("sortExamWorklist", () => {
  it("เรียง พร้อมตรวจ -> รอคัดกรอง -> เสร็จสิ้น", () => {
    const rows = [
      appt("finished", "Closed", true),
      appt("waiting", "Scheduled", false),
      appt("ready", "Checked In", true),
    ];
    expect(sortExamWorklist(rows).map((r) => r.name)).toEqual([
      "ready",
      "waiting",
      "finished",
    ]);
  });

  it("stable ภายในกลุ่มเดียวกัน", () => {
    const rows = [
      appt("r1", "Open", true),
      appt("r2", "Open", true),
      appt("w1", "Open", false),
    ];
    expect(sortExamWorklist(rows).map((r) => r.name)).toEqual(["r1", "r2", "w1"]);
  });
});

describe("sortPharmacyQueue", () => {
  it("รอจ่ายยา (dispensed=false) ขึ้นก่อนจ่ายแล้ว", () => {
    const rows = [
      { name: "done", dispensed: true },
      { name: "pending", dispensed: false },
    ];
    expect(sortPharmacyQueue(rows).map((r) => r.name)).toEqual(["pending", "done"]);
  });

  it("ไม่แก้ไข array ต้นฉบับ", () => {
    const rows = [
      { name: "done", dispensed: true },
      { name: "pending", dispensed: false },
    ];
    sortPharmacyQueue(rows);
    expect(rows.map((r) => r.name)).toEqual(["done", "pending"]);
  });
});
