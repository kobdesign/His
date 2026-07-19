"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  patient: string;
  appointment: string;
  /** ส่วนสูงครั้งล่าสุด (หน่วยเมตร ตาม Vital Signs ของ Frappe Health) ใช้เติมให้อัตโนมัติ */
  defaultHeightM: number | null;
};

// ช่วงค่าปกติคร่าว ๆ สำหรับผู้ใหญ่ — ไว้เตือนสีเหลืองเฉย ๆ ไม่บล็อกการบันทึก
const NORMAL_RANGE: Record<string, [number, number]> = {
  temperature: [35.5, 37.5],
  pulse: [60, 100],
  respiratory_rate: [12, 20],
  bp_systolic: [90, 140],
  bp_diastolic: [60, 90],
  oxygen_saturation: [95, 100],
};

export default function VitalSignsForm({ patient, appointment, defaultHeightM }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({
    temperature: "",
    pulse: "",
    respiratory_rate: "",
    bp_systolic: "",
    bp_diastolic: "",
    oxygen_saturation: "",
    height_cm: defaultHeightM ? String(Math.round(defaultHeightM * 100)) : "",
    weight: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bmi = useMemo(() => {
    const h = parseFloat(values.height_cm) / 100;
    const w = parseFloat(values.weight);
    if (!h || !w || h <= 0) return null;
    return (w / (h * h)).toFixed(1);
  }, [values.height_cm, values.weight]);

  function set(field: string, v: string) {
    setValues((prev) => ({ ...prev, [field]: v }));
  }

  function outOfRange(field: string): boolean {
    const range = NORMAL_RANGE[field];
    const v = parseFloat(values[field]);
    if (!range || Number.isNaN(v)) return false;
    return v < range[0] || v > range[1];
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const num = (s: string) => (s.trim() === "" ? undefined : parseFloat(s));
    const heightCm = num(values.height_cm);

    try {
      const res = await fetch("/api/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient,
          appointment,
          temperature: num(values.temperature),
          pulse: num(values.pulse),
          respiratory_rate: num(values.respiratory_rate),
          bp_systolic: num(values.bp_systolic),
          bp_diastolic: num(values.bp_diastolic),
          oxygen_saturation: num(values.oxygen_saturation),
          // Vital Signs ของ Frappe Health เก็บส่วนสูงเป็นเมตร
          height: heightCm !== undefined ? heightCm / 100 : undefined,
          weight: num(values.weight),
          note: values.note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      router.push("/queue");
      router.refresh();
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  const inputCls = (field: string) =>
    `w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
      outOfRange(field) ? "border-amber-400 bg-amber-50" : "border-slate-300"
    }`;

  return (
    <form onSubmit={submit} className="rounded-lg border bg-white p-5 shadow-sm">
      <h2 className="font-semibold">บันทึกสัญญาณชีพ</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        ช่องที่เป็นสีเหลือง = ค่าอยู่นอกช่วงปกติของผู้ใหญ่ (เตือนเท่านั้น ไม่บล็อกการบันทึก)
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <Field label="อุณหภูมิ (°C)">
          <input type="number" step="0.1" inputMode="decimal" value={values.temperature}
            onChange={(e) => set("temperature", e.target.value)} className={inputCls("temperature")} />
        </Field>
        <Field label="ชีพจร (ครั้ง/นาที)">
          <input type="number" step="1" inputMode="numeric" value={values.pulse}
            onChange={(e) => set("pulse", e.target.value)} className={inputCls("pulse")} />
        </Field>
        <Field label="อัตราหายใจ (ครั้ง/นาที)">
          <input type="number" step="1" inputMode="numeric" value={values.respiratory_rate}
            onChange={(e) => set("respiratory_rate", e.target.value)} className={inputCls("respiratory_rate")} />
        </Field>
        <Field label="SpO2 (%)">
          <input type="number" step="1" inputMode="numeric" value={values.oxygen_saturation}
            onChange={(e) => set("oxygen_saturation", e.target.value)} className={inputCls("oxygen_saturation")} />
        </Field>
        <Field label="ความดันตัวบน (mmHg)">
          <input type="number" step="1" inputMode="numeric" value={values.bp_systolic}
            onChange={(e) => set("bp_systolic", e.target.value)} className={inputCls("bp_systolic")} />
        </Field>
        <Field label="ความดันตัวล่าง (mmHg)">
          <input type="number" step="1" inputMode="numeric" value={values.bp_diastolic}
            onChange={(e) => set("bp_diastolic", e.target.value)} className={inputCls("bp_diastolic")} />
        </Field>
        <Field label="ส่วนสูง (ซม.)">
          <input type="number" step="0.1" inputMode="decimal" value={values.height_cm}
            onChange={(e) => set("height_cm", e.target.value)} className={inputCls("height_cm")} />
        </Field>
        <Field label="น้ำหนัก (กก.)">
          <input type="number" step="0.1" inputMode="decimal" value={values.weight}
            onChange={(e) => set("weight", e.target.value)} className={inputCls("weight")} />
        </Field>
      </div>

      {bmi && (
        <p className="mt-3 text-sm text-slate-600">
          BMI: <span className="font-semibold">{bmi}</span> กก./ม.²
        </p>
      )}

      <div className="mt-4">
        <Field label="บันทึกเพิ่มเติม">
          <textarea rows={2} value={values.note} onChange={(e) => set("note", e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </Field>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          บันทึกไม่สำเร็จ: <span className="break-all">{error}</span>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button type="submit" disabled={saving}
          className="rounded-md bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
          {saving ? "กำลังบันทึก…" : "บันทึกสัญญาณชีพ"}
        </button>
        <span className="text-xs text-slate-400">
          บันทึกแล้วระบบจะ submit เอกสาร Vital Signs และพากลับหน้าคิว
        </span>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
