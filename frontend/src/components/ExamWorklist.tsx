"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { QueueData } from "@/lib/types";
import { fmtTime } from "@/lib/format";
import { examReadiness, sortExamWorklist } from "@/lib/worklist";

const REFRESH_INTERVAL_MS = 20_000;

/** worklist ห้องตรวจแพทย์ — เรียงให้คนที่คัดกรองแล้วและยังไม่ตรวจขึ้นก่อน */
export default function ExamWorklist({ initial }: { initial: QueueData }) {
  const [data, setData] = useState<QueueData>(initial);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/queue", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as QueueData);
      setError(null);
    } catch (e) {
      setError(`โหลดคิวไม่สำเร็จ: ${String(e)}`);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const ordered = sortExamWorklist(data.appointments);
  const readyCount = data.appointments.filter((a) => examReadiness(a) === "ready").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">ห้องตรวจแพทย์ — คิววันนี้</h1>
          <p className="text-sm text-slate-500">
            {data.date} · พร้อมตรวจ (คัดกรองแล้ว) {readyCount} ราย · รีเฟรชอัตโนมัติทุก{" "}
            {REFRESH_INTERVAL_MS / 1000} วินาที
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
          ยังไม่มีนัดหมายของวันนี้
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">เวลา</th>
                <th className="px-4 py-2 font-medium">HN</th>
                <th className="px-4 py-2 font-medium">ชื่อ-นามสกุล</th>
                <th className="px-4 py-2 font-medium">แผนก</th>
                <th className="px-4 py-2 font-medium">แพทย์</th>
                <th className="px-4 py-2 font-medium">ความพร้อม</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((a) => (
                <tr key={a.name} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs">{fmtTime(a.appointment_time)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{a.patient}</td>
                  <td className="px-4 py-2 font-medium">{a.patient_name}</td>
                  <td className="px-4 py-2">{a.department ?? "-"}</td>
                  <td className="px-4 py-2">{a.practitioner_name ?? "-"}</td>
                  <td className="px-4 py-2">
                    {examReadiness(a) === "finished" ? (
                      <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        เสร็จสิ้น
                      </span>
                    ) : examReadiness(a) === "ready" ? (
                      <span className="inline-block rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
                        พร้อมตรวจ
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        รอคัดกรอง
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link href={`/exam/${encodeURIComponent(a.name)}`}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                        examReadiness(a) === "finished"
                          ? "border border-slate-300 text-slate-600 hover:bg-slate-50"
                          : "bg-teal-600 text-white hover:bg-teal-700"
                      }`}>
                      {examReadiness(a) === "finished" ? "ดูผลตรวจ" : "เปิดตรวจ"}
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
