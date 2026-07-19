"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DispenseContext, PrescriptionLine } from "@/lib/types";
import SearchSelect from "@/components/SearchSelect";

type DispenseRow = {
  drug: string | null;
  drug_name: string | null;
  dosage: string | null;
  period: string | null;
  instructions: string | null;
  item_code: string | null;
  item_name: string | null;
  uom: string | null;
  qty: string;
};

function fromPrescription(p: PrescriptionLine): DispenseRow {
  return {
    drug: p.drug,
    drug_name: p.drug_name,
    dosage: p.dosage,
    period: p.period,
    instructions: p.comment,
    item_code: p.item_code,
    item_name: p.item_name,
    uom: p.stock_uom,
    qty: "1",
  };
}

export default function DispenseForm({ context }: { context: DispenseContext }) {
  const router = useRouter();
  const dispensed = context.dispense;

  const [rows, setRows] = useState<DispenseRow[]>(
    context.prescriptions.map(fromPrescription),
  );
  const [warehouse, setWarehouse] = useState("");
  const [updateStock, setUpdateStock] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------- โหมดอ่านอย่างเดียว: จ่ายไปแล้ว ----------
  if (dispensed) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          จ่ายยาแล้ว — เอกสาร <span className="font-mono text-xs">{dispensed.name}</span>
          {dispensed.posting_date && <> · {dispensed.posting_date}</>}
          {dispensed.stock_entry && (
            <>
              {" "}
              · ตัดสต็อกแล้ว (Stock Entry{" "}
              <span className="font-mono text-xs">{dispensed.stock_entry}</span>)
            </>
          )}
        </div>
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">ยา</th>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 font-medium">จำนวน</th>
                <th className="px-4 py-2 font-medium">วิธีใช้</th>
                <th className="px-4 py-2 font-medium">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {dispensed.items.map((it, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2 font-medium">{it.drug ?? "-"}</td>
                  <td className="px-4 py-2">
                    {it.item_code ?? <span className="text-slate-400">นอกสต็อก</span>}
                  </td>
                  <td className="px-4 py-2 tabular-nums">
                    {it.qty} {it.uom ?? ""}
                  </td>
                  <td className="px-4 py-2">{it.dosage ?? "-"}</td>
                  <td className="px-4 py-2">{it.instructions ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ---------- โหมดจ่ายยา ----------
  function setRow(i: number, patch: Partial<DispenseRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const unresolved = rows.filter((r) => !r.item_code).length;

  async function submit() {
    const stockNote =
      updateStock && unresolved > 0
        ? `\n\nหมายเหตุ: ${unresolved} รายการยังไม่ได้เลือก Item จะถูกบันทึกแบบไม่ตัดสต็อก`
        : "";
    if (!window.confirm(`ยืนยันจ่ายยา ${rows.length} รายการ?${stockNote}`)) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/pharmacy/dispense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounter: context.encounter.name,
          warehouse: warehouse || undefined,
          update_stock: updateStock ? 1 : 0,
          items: rows.map((r) => ({
            drug: r.drug,
            item_code: r.item_code,
            qty: parseFloat(r.qty) || 1,
            uom: r.uom,
            dosage: r.dosage,
            period: r.period,
            instructions: r.instructions,
          })),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      router.push("/pharmacy");
      router.refresh();
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-center text-slate-500">
          encounter นี้ไม่มีใบสั่งยา
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">ยา (ใบสั่ง)</th>
                <th className="px-4 py-2 font-medium">วิธีใช้ / ระยะเวลา</th>
                <th className="px-4 py-2 font-medium">Item ตัดสต็อก</th>
                <th className="px-4 py-2 font-medium">จำนวนจ่าย</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t align-top">
                  <td className="px-4 py-2">
                    <p className="font-medium">{r.drug ?? "-"}</p>
                    {r.drug_name && r.drug_name !== r.drug && (
                      <p className="text-xs text-slate-500">{r.drug_name}</p>
                    )}
                    {r.instructions && (
                      <p className="text-xs text-slate-500">{r.instructions}</p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {r.dosage ?? "-"}
                    {r.period && <> · {r.period}</>}
                  </td>
                  <td className="w-64 px-4 py-2">
                    <SearchSelect
                      linkKey="item"
                      placeholder="เลือก Item…"
                      value={r.item_code ?? ""}
                      onSelect={(o) => setRow(i, { item_code: o.value, item_name: o.label })}
                    />
                    {!r.item_code && (
                      <p className="mt-1 text-xs text-amber-600">
                        ยังไม่ผูก Item — จะไม่ตัดสต็อกแถวนี้
                      </p>
                    )}
                  </td>
                  <td className="w-36 px-4 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        inputMode="decimal"
                        value={r.qty}
                        onChange={(e) => setRow(i, { qty: e.target.value })}
                        className="w-20 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <span className="text-xs text-slate-500">{r.uom ?? ""}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-6">
            <label className="block w-64">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                คลังยา (Warehouse)
              </span>
              <SearchSelect
                linkKey="warehouse"
                placeholder="เลือกคลังยา…"
                value={warehouse}
                onSelect={(o) => setWarehouse(o.value)}
              />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={updateStock}
                onChange={(e) => setUpdateStock(e.target.checked)}
                className="h-4 w-4 accent-teal-600"
              />
              ตัดสต็อก (สร้าง Stock Entry)
            </label>
          </div>
          {updateStock && !warehouse && (
            <p className="mt-2 text-xs text-amber-600">
              เลือกคลังยาก่อนยืนยัน หรือปิดการตัดสต็อก
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          จ่ายยาไม่สำเร็จ: <span className="break-all">{error}</span>
        </div>
      )}

      {rows.length > 0 && (
        <button
          type="button"
          onClick={submit}
          disabled={saving || (updateStock && !warehouse)}
          className="rounded-md bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก…" : "ยืนยันจ่ายยา"}
        </button>
      )}
    </div>
  );
}
