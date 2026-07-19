"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { PharmacyQueueData } from "@/lib/types";

const REFRESH_INTERVAL_MS = 20_000;

function fmtTime(t: string | null): string {
  if (!t) return "-";
  return t.split(".")[0].slice(0, 5);
}

/** คิวห้องยา — เรียง "รอจ่ายยา" ขึ้นก่อน "จ่ายแล้ว" */
export default function PharmacyWorklist({ initial }: { initial: PharmacyQueueData }) {
  const [data, setData] = useState<PharmacyQueueData>(initial);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/pharmacy/queue", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as PharmacyQueueData);
      setError(null);
    } catch (e) {
      setError(`โหลดคิวไม่สำเร็จ: ${String(e)}`);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const pending = data.encounters.filter((e) => !e.dispensed);
  const done = data.encounters.filter((e) => e.dispensed);
  const ordered = [...pending, ...done];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">ห้องยา — คิวจ่ายยาวันนี้</h1>
          <p className="text-sm text-slate-500">
            {data.date} · รอจ่ายยา {pending.length} ราย · จ่ายแล้ว {done.length} ราย ·
            รีเฟรชอัตโนมัติทุก {REFRESH_INTERVAL_MS / 1000} วินาที
          </p>
        </div>
        <button onClick={refresh}
          className="rounded-md border bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:border-teal-500">
          รีเฟรช
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {ordered.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-center text-slate-500">
          ยังไม่มีใบสั่งยาของวันนี้ — ใบสั่งยาจะเข้าคิวเมื่อแพทย์กด “จบการตรวจ”
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
                <th className="px-4 py-2 font-medium">รายการยา</th>
                <th className="px-4 py-2 font-medium">สถานะ</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((e) => (
                <tr key={e.name} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs">{fmtTime(e.encounter_time)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{e.patient}</td>
                  <td className="px-4 py-2 font-medium">{e.patient_name}</td>
                  <td className="px-4 py-2">{e.practitioner_name ?? "-"}</td>
                  <td className="px-4 py-2 tabular-nums">{e.drug_count} รายการ</td>
                  <td className="px-4 py-2">
                    {e.dispensed ? (
                      <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        จ่ายแล้ว
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        รอจ่ายยา
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/pharmacy/${encodeURIComponent(e.name)}`}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                        e.dispensed
                          ? "border border-slate-300 text-slate-600 hover:bg-slate-50"
                          : "bg-teal-600 text-white hover:bg-teal-700"
                      }`}>
                      {e.dispensed ? "ดูรายการ" : "จ่ายยา"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
