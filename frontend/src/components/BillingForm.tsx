"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BillingContext } from "@/lib/types";
import SearchSelect from "@/components/SearchSelect";

const fmtMoney = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type ChargeRow = {
  include: boolean;
  source: string;
  item_code: string;
  item_name: string | null;
  qty: string;
  rate_hint: number | null;
};

export default function BillingForm({ context }: { context: BillingContext }) {
  const router = useRouter();
  const invoice = context.invoice;

  const [rows, setRows] = useState<ChargeRow[]>(
    context.charges.map((c) => ({
      include: true,
      source: c.source,
      item_code: c.item_code,
      item_name: c.item_name,
      qty: String(c.qty),
      rate_hint: c.rate_hint,
    })),
  );
  const [modeOfPayment, setModeOfPayment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paidMessage, setPaidMessage] = useState<string | null>(null);

  // ---------- มีใบแจ้งหนี้แล้ว: แสดงบิล + รับชำระ ----------
  if (invoice) {
    const paid = invoice.outstanding_amount <= 0;

    async function pay() {
      if (!invoice) return;
      if (!window.confirm(`รับชำระเงิน ${fmtMoney(invoice.outstanding_amount)} บาท?`)) return;
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/billing/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoice: invoice.name,
            mode_of_payment: modeOfPayment || undefined,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { payment_entry: string };
        setPaidMessage(`รับชำระแล้ว — Payment Entry ${data.payment_entry}`);
        router.refresh();
      } catch (e) {
        setError(String(e));
      } finally {
        setSaving(false);
      }
    }

    return (
      <div className="space-y-4">
        <div
          className={`rounded-md border px-4 py-2 text-sm ${
            paid
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-blue-300 bg-blue-50 text-blue-800"
          }`}
        >
          ใบแจ้งหนี้ <span className="font-mono text-xs">{invoice.name}</span> ·{" "}
          {invoice.posting_date} · สถานะ {invoice.status}
          {paid ? " · ชำระครบแล้ว" : ""}
        </div>

        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">รายการ</th>
                <th className="px-4 py-2 text-right font-medium">จำนวน</th>
                <th className="px-4 py-2 text-right font-medium">ราคา/หน่วย</th>
                <th className="px-4 py-2 text-right font-medium">รวม</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((it, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2">
                    {it.item_name}
                    <span className="ml-2 font-mono text-xs text-slate-400">{it.item_code}</span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{it.qty}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtMoney(it.rate)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtMoney(it.amount)}</td>
                </tr>
              ))}
              <tr className="border-t bg-slate-50 font-semibold">
                <td className="px-4 py-2" colSpan={3}>
                  ยอดรวม
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {fmtMoney(invoice.grand_total)}
                </td>
              </tr>
              {!paid && (
                <tr className="border-t font-semibold text-blue-800">
                  <td className="px-4 py-2" colSpan={3}>
                    ยอดคงค้าง
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {fmtMoney(invoice.outstanding_amount)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {paidMessage && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
            {paidMessage}
          </div>
        )}
        {error && (
          <div className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            รับชำระไม่สำเร็จ: <span className="break-all">{error}</span>
          </div>
        )}

        {!paid && !paidMessage && (
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
              <label className="block w-64">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  ช่องทางชำระ (Mode of Payment)
                </span>
                <SearchSelect
                  linkKey="mode_of_payment"
                  placeholder="เงินสด / โอน / บัตร…"
                  value={modeOfPayment}
                  onSelect={(o) => setModeOfPayment(o.value)}
                />
              </label>
              <button
                type="button"
                onClick={pay}
                disabled={saving}
                className="rounded-md bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก…" : `รับชำระ ${fmtMoney(invoice.outstanding_amount)} บาท`}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- ยังไม่มีใบแจ้งหนี้: สร้างบิลจากรายการค่าใช้จ่าย ----------
  function setRow(i: number, patch: Partial<ChargeRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const included = rows.filter((r) => r.include && r.item_code);
  const estimate = included.reduce(
    (sum, r) => sum + (r.rate_hint ?? 0) * (parseFloat(r.qty) || 0),
    0,
  );

  async function createInvoice() {
    if (!window.confirm(`ออกใบแจ้งหนี้ ${included.length} รายการ?`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounter: context.encounter.name,
          items: included.map((r) => ({
            item_code: r.item_code,
            qty: parseFloat(r.qty) || 1,
            rate: r.rate_hint ?? undefined,
          })),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      router.refresh(); // โหลด context ใหม่ → เข้าสู่โหมดรับชำระ
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {!context.patient.customer_ok && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          ผู้ป่วยรายนี้ยังไม่มี Customer — เปิด Healthcare Settings → “Link Customer to Patient”
          แล้วบันทึก Patient ใหม่ก่อน จึงจะออกใบแจ้งหนี้ได้
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-center text-slate-500">
          ไม่พบรายการค่าใช้จ่ายจาก encounter นี้ — ตรวจสอบว่าตั้งค่า Item ของค่าตรวจแพทย์ / ยา /
          แล็บ แล้ว
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium"></th>
                <th className="px-4 py-2 font-medium">หมวด</th>
                <th className="px-4 py-2 font-medium">รายการ</th>
                <th className="px-4 py-2 text-right font-medium">จำนวน</th>
                <th className="px-4 py-2 text-right font-medium">ราคาโดยประมาณ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={`border-t ${r.include ? "" : "opacity-40"}`}>
                  <td className="w-10 px-4 py-2">
                    <input
                      type="checkbox"
                      checked={r.include}
                      onChange={(e) => setRow(i, { include: e.target.checked })}
                      className="h-4 w-4 accent-teal-600"
                    />
                  </td>
                  <td className="px-4 py-2 text-xs text-slate-500">{r.source}</td>
                  <td className="px-4 py-2">
                    {r.item_name ?? r.item_code}
                    <span className="ml-2 font-mono text-xs text-slate-400">{r.item_code}</span>
                  </td>
                  <td className="w-28 px-4 py-2 text-right">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      inputMode="decimal"
                      value={r.qty}
                      disabled={!r.include}
                      onChange={(e) => setRow(i, { qty: e.target.value })}
                      className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {r.rate_hint != null ? (
                      fmtMoney(r.rate_hint * (parseFloat(r.qty) || 0))
                    ) : (
                      <span className="text-xs text-amber-600">ไม่มีราคาใน price list</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="border-t bg-slate-50 font-semibold">
                <td className="px-4 py-2" colSpan={4}>
                  ประมาณการรวม (ราคาจริงคิดตอนออกบิล)
                </td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtMoney(estimate)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          ออกบิลไม่สำเร็จ: <span className="break-all">{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={createInvoice}
        disabled={saving || included.length === 0 || !context.patient.customer_ok}
        className="rounded-md bg-teal-600 px-5 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {saving ? "กำลังออกบิล…" : `ออกใบแจ้งหนี้ (${included.length} รายการ)`}
      </button>
    </div>
  );
}
