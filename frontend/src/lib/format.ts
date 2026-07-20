/** ฟังก์ชันจัดรูปแบบที่ใช้ร่วมกันทุกหน้าจอ — pure, ไม่มี side effect (ทดสอบได้ตรง ๆ) */

/** "09:30:00" / "09:30:00.000000" -> "09:30" ; ค่าว่าง -> "-" */
export function fmtTime(t: string | null | undefined): string {
  if (!t) return "-";
  return t.split(".")[0].slice(0, 5);
}

/** จำนวนเงิน -> รูปแบบไทย ทศนิยม 2 ตำแหน่ง เช่น 1234.5 -> "1,234.50" */
export function fmtMoney(n: number): string {
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * คำนวณ BMI จากส่วนสูง (ซม.) และน้ำหนัก (กก.) -> string ทศนิยม 1 ตำแหน่ง
 * คืน null เมื่อ input ไม่ครบ/ไม่ถูกต้อง (0, ว่าง, NaN, ติดลบ)
 */
export function calcBMI(heightCm: number, weightKg: number): string | null {
  const h = heightCm / 100;
  if (!h || !weightKg || h <= 0) return null;
  return (weightKg / (h * h)).toFixed(1);
}
