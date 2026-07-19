"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DrugRow, EncounterData } from "@/lib/types";
import SearchSelect from "@/components/SearchSelect";
import TagPicker from "@/components/TagPicker";

type Props = {
  appointment: string;
  initial: EncounterData | null;
};

const emptyDrug = (): DrugRow => ({
  drug: null,
  dosage: null,
  period: null,
  dosage_form: null,
  comment: null,
});

export default function ExamForm({ appointment, initial }: Props) {
  const router = useRouter();
  const submitted = initial?.docstatus === 1;

  const [symptoms, setSymptoms] = useState<string[]>(initial?.symptoms ?? []);
  const [diagnosis, setDiagnosis] = useState<string[]>(initial?.diagnosis ?? []);
  const [drugs, setDrugs] = useState<DrugRow[]>(initial?.drugs ?? []);
  const [labTests, setLabTests] = useState<string[]>(initial?.lab_tests ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState<"draft" | "submit" | null>(null);
  const [savedDraft, setSavedDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setDrug(i: number, patch: Partial<DrugRow>) {
    setDrugs((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  async function save(submit: boolean) {
    if (submit && !window.confirm("ยืนยันจบการตรวจ? เอกสารจะถูก submit และแก้ไขไม่ได้อีก")) {
      return;
    }
    setSaving(submit ? "submit" : "draft");
    setError(null);
    setSavedDraft(null);

    try {
      const res = await fetch("/api/encounter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointment,
          symptoms,
          diagnosis,
          // ตัดแถวยาที่ยังไม่ได้เลือกตัวยาออก
          drugs: drugs.filter((d) => d.drug),
          lab_tests: labTests,
          notes,
          submit: submit ? 1 : 0,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as EncounterData;
      if (submit) {
        router.push("/exam");
        router.refresh();
      } else {
        setSavedDraft(data.name);
        setSaving(null);
      }
    } catch (e) {
      setError(String(e));
      setSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      {submitted && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          ตรวจเสร็จแล้ว — เอกสาร <span className="font-mono text-xs">{initial?.name}</span> ถูก
          submit ไปแล้ว แสดงแบบอ่านอย่างเดียว
        </div>
      )}

      <Section title="อาการสำคัญ (Chief Complaint)">
        <TagPicker
          linkKey="complaint"
          placeholder="พิมพ์ค้นหาอาการ หรือเพิ่มใหม่…"
          allowCreate
          values={symptoms}
          disabled={submitted}
          onChange={setSymptoms}
        />
      </Section>

      <Section title="การวินิจฉัย (Diagnosis)">
        <TagPicker
          linkKey="diagnosis"
          placeholder="พิมพ์ค้นหาการวินิจฉัย หรือเพิ่มใหม่…"
          allowCreate
          values={diagnosis}
          disabled={submitted}
          onChange={setDiagnosis}
        />
      </Section>

      <Section title="ใบสั่งยา">
        {drugs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs text-slate-500">
                <tr>
                  <th className="pb-1 pr-2 font-medium">ตัวยา *</th>
                  <th className="pb-1 pr-2 font-medium">ขนาด/วิธีใช้ (Dosage)</th>
                  <th className="pb-1 pr-2 font-medium">ระยะเวลา</th>
                  <th className="pb-1 pr-2 font-medium">รูปแบบยา</th>
                  <th className="pb-1 pr-2 font-medium">หมายเหตุ</th>
                  <th className="pb-1"></th>
                </tr>
              </thead>
              <tbody>
                {drugs.map((row, i) => (
                  <tr key={i} className="align-top">
                    <td className="w-56 py-1 pr-2">
                      <SearchSelect linkKey="drug" placeholder="ค้นหายา…" value={row.drug ?? ""}
                        disabled={submitted} onSelect={(o) => setDrug(i, { drug: o.value })} />
                    </td>
                    <td className="w-44 py-1 pr-2">
                      <SearchSelect linkKey="dosage" placeholder="เช่น 1-0-1" value={row.dosage ?? ""}
                        disabled={submitted} onSelect={(o) => setDrug(i, { dosage: o.value })} />
                    </td>
                    <td className="w-36 py-1 pr-2">
                      <SearchSelect linkKey="period" placeholder="เช่น 5 วัน" value={row.period ?? ""}
                        disabled={submitted} onSelect={(o) => setDrug(i, { period: o.value })} />
                    </td>
                    <td className="w-36 py-1 pr-2">
                      <SearchSelect linkKey="dosage_form" placeholder="เม็ด/แคปซูล…" value={row.dosage_form ?? ""}
                        disabled={submitted} onSelect={(o) => setDrug(i, { dosage_form: o.value })} />
                    </td>
                    <td className="py-1 pr-2">
                      <input type="text" value={row.comment ?? ""} disabled={submitted}
                        onChange={(e) => setDrug(i, { comment: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100" />
                    </td>
                    <td className="py-1">
                      {!submitted && (
                        <button type="button"
                          onClick={() => setDrugs((prev) => prev.filter((_, idx) => idx !== i))}
                          className="mt-1 px-1 text-slate-400 hover:text-rose-600" aria-label="ลบแถวยา">
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!submitted && (
          <button type="button" onClick={() => setDrugs((prev) => [...prev, emptyDrug()])}
            className="rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-teal-500 hover:text-teal-700">
            + เพิ่มยา
          </button>
        )}
      </Section>

      <Section title="ส่งตรวจแล็บ">
        <TagPicker
          linkKey="lab_test"
          placeholder="ค้นหารายการตรวจ (Lab Test Template)…"
          values={labTests}
          disabled={submitted}
          onChange={setLabTests}
        />
      </Section>

      <Section title="บันทึกแพทย์">
        <textarea rows={3} value={notes} disabled={submitted}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100" />
      </Section>

      {error && (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          บันทึกไม่สำเร็จ: <span className="break-all">{error}</span>
        </div>
      )}
      {savedDraft && (
        <div className="rounded-md border border-teal-300 bg-teal-50 px-4 py-2 text-sm text-teal-800">
          บันทึกร่างแล้ว — <span className="font-mono text-xs">{savedDraft}</span>
        </div>
      )}

      {!submitted && (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => save(false)} disabled={saving !== null}
            className="rounded-md border border-teal-600 px-5 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50">
            {saving === "draft" ? "กำลังบันทึก…" : "บันทึกร่าง"}
          </button>
          <button type="button" onClick={() => save(true)} disabled={saving !== null}
            className="rounded-md bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50">
            {saving === "submit" ? "กำลัง submit…" : "จบการตรวจ (Submit)"}
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </section>
  );
}
