import { describe, expect, it } from "vitest";
import { calcBMI, fmtMoney, fmtTime } from "@/lib/format";

describe("fmtTime", () => {
  it("ตัดวินาที/ไมโครวินาทีเหลือ HH:MM", () => {
    expect(fmtTime("09:30:00")).toBe("09:30");
    expect(fmtTime("09:30:00.000000")).toBe("09:30");
    expect(fmtTime("23:05:59")).toBe("23:05");
  });

  it("ค่าว่าง/null/undefined -> '-'", () => {
    expect(fmtTime(null)).toBe("-");
    expect(fmtTime(undefined)).toBe("-");
    expect(fmtTime("")).toBe("-");
  });
});

describe("fmtMoney", () => {
  it("ทศนิยม 2 ตำแหน่งเสมอ + คั่นหลักพัน", () => {
    expect(fmtMoney(1234.5)).toBe("1,234.50");
    expect(fmtMoney(0)).toBe("0.00");
    expect(fmtMoney(100)).toBe("100.00");
    expect(fmtMoney(1000000)).toBe("1,000,000.00");
  });

  it("ปัดทศนิยมตำแหน่งที่ 3", () => {
    expect(fmtMoney(1234.567)).toBe("1,234.57");
    expect(fmtMoney(2.994)).toBe("2.99");
  });
});

describe("calcBMI", () => {
  it("คำนวณถูกต้อง ทศนิยม 1 ตำแหน่ง (สูง 170 ซม. หนัก 65 กก. = 22.5)", () => {
    expect(calcBMI(170, 65)).toBe("22.5");
  });

  it("ปัดเป็น 1 ตำแหน่ง", () => {
    // 60 / (1.6^2) = 23.4375 -> "23.4"
    expect(calcBMI(160, 60)).toBe("23.4");
  });

  it("input ไม่ครบ/ไม่ถูกต้อง -> null", () => {
    expect(calcBMI(0, 65)).toBeNull(); // ไม่มีส่วนสูง
    expect(calcBMI(170, 0)).toBeNull(); // ไม่มีน้ำหนัก
    expect(calcBMI(NaN, 65)).toBeNull(); // ช่องว่าง (parseFloat("") = NaN)
    expect(calcBMI(170, NaN)).toBeNull();
    expect(calcBMI(-170, 65)).toBeNull(); // ค่าติดลบ
  });
});
