import { describe, expect, it } from "vitest";
import { billState, sortByBillState } from "@/lib/billing";

const row = (name: string, invoice: { outstanding_amount: number } | null) => ({
  name,
  invoice,
});

describe("billState", () => {
  it("ไม่มีใบแจ้งหนี้ -> unbilled", () => {
    expect(billState(row("A", null))).toBe("unbilled");
  });

  it("มีใบแจ้งหนี้ ยอดคงค้าง > 0 -> unpaid", () => {
    expect(billState(row("B", { outstanding_amount: 500 }))).toBe("unpaid");
  });

  it("มีใบแจ้งหนี้ ยอดคงค้าง = 0 -> paid", () => {
    expect(billState(row("C", { outstanding_amount: 0 }))).toBe("paid");
  });
});

describe("sortByBillState", () => {
  it("เรียง รอออกบิล -> ค้างชำระ -> ชำระแล้ว", () => {
    const rows = [
      row("paid", { outstanding_amount: 0 }),
      row("unpaid", { outstanding_amount: 200 }),
      row("unbilled", null),
    ];
    expect(sortByBillState(rows).map((r) => r.name)).toEqual([
      "unbilled",
      "unpaid",
      "paid",
    ]);
  });

  it("stable — รักษาลำดับเดิมภายในสถานะเดียวกัน", () => {
    const rows = [
      row("u1", null),
      row("u2", null),
      row("u3", null),
    ];
    expect(sortByBillState(rows).map((r) => r.name)).toEqual(["u1", "u2", "u3"]);
  });

  it("ไม่แก้ไข array ต้นฉบับ", () => {
    const rows = [row("paid", { outstanding_amount: 0 }), row("unbilled", null)];
    const before = rows.map((r) => r.name);
    sortByBillState(rows);
    expect(rows.map((r) => r.name)).toEqual(before);
  });
});
