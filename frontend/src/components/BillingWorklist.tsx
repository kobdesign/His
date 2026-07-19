"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { BillingQueueData, BillingQueueRow } from "@/lib/types";

const REFRESH_INTERVAL_MS = 20_000;

function fmtTime(t: string | null): string {
  if (!t) return "-";
  return t.split(".")[0].slice(0, 5);
}

const fmtMoney = (n: number) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type BillState = "unbilled" | "unpaid" | "paid";

function billState(row: BillingQueueRow): BillState {
  if (!row.invoice) return "unbilled";
  return row.invoice.outstanding_amount > 0 ? "unpaid" : "paid";
}

/** คิวการเงิน — เรียง รอออกบิล → ค้างชำระ → ชำระแล้ว */
export default function BillingWorklist({ initial }: { initial: BillingQueueData }) {
  const [data, setData] = useState<BillingQueueData>(initial);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/queue", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as BillingQueueData);
      setError(null);
    } catch (e) {
      setError(`โหลดคิวไม่สำเร็จ: ${String(e)}`);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const order: Record<BillState, number> = { unbilled: 0, unpaid: 1, paid: 2 };
  const rows = [...data.encounters].sort((a, b) => order[billState(a)] - order[billState(b)]);
  const unbilled = rows.filter((r) => billState(r) === "unbilled").length;
  const unpaid = rows.filter((r) => billState(r) === "unpaid").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">การเงิน — คิวชำระเงินวันนี้</h1>
          <p className="text-sm text-slate-500">
            {data.date} · รอออกบิล {unbilled} ราย · ค้างชำระ {unpaid} ราย · รีเฟรชอัตโนมัติทุก{" "}
            {REFRESH_INTERVAL_MS / 1000} วินาที
          </p>
        </div>
        <button onClick={refresh}
          className="rounded-md border bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:border-teal-500">
          รีเฟรช
        </button>
      </div>

      {!data.billing_ready && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          ยังไม่มี custom field <code>his_encounter</code> บน Sales Invoice — รัน{" "}
          <code>bench --site his.localhost migrate</code> ก่อน สถานะใบแจ้งหนี้จึงจะแสดง
        </div>
      )}

      {error && (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-center text-slate-500">
          ยังไม่มีรายการของวันนี้ — encounter จะเข้าคิวเมื่อแพทย์กด “จบการตรวจ”
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">เวลาตรวจ</th>
                <th className="px-4 py-2 font-medium">HN</th>
                <th className="px-4 py-2 font-medium">ชื่อ-นามสกุล</th>
                <th className="px-4 py-2 font-medium">แพทย์</th>
                <th className="px-4 py-2 font-medium">ยอดรวม</th>
                <th className="px-4 py-2 font-medium">คงค้าง</th>
                <th className="px-4 py-2 font-medium">สถานะ</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const state = billState(r);
                return (
                  <tr key={r.name} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-xs">{fmtTime(r.encounter_time)}</td>
                    <td className="px-4 py-2 font-mono text-xs">{r.patient}</td>
                    <td className="px-4 py-2 font-medium">{r.patient_name}</td>
                    <td className="px-4 py-2">{r.practitioner_name ?? "-"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.invoice ? fmtMoney(r.invoice.grand_total) : "-"}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {r.invoice ? fmtMoney(r.invoice.outstanding_amount) : "-"}
                    </td>
                    <td className="px-4 py-2">
                      {state === "unbilled" && (
                        <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          รอออกบิล
                        </span>
                      )}
                      {state === "unpaid" && (
                        <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                          ค้างชำระ
                        </span>
                      )}
                      {state === "paid" && (
                        <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          ชำระแล้ว
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link href={`/billing/${encodeURIComponent(r.name)}`}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                          state === "paid"
                            ? "border border-slate-300 text-slate-600 hover:bg-slate-50"
                            : "bg-teal-600 text-white hover:bg-teal-700"
                        }`}>
                        {state === "unbilled" ? "ออกบิล" : state === "unpaid" ? "รับชำระ" : "ดูบิล"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
