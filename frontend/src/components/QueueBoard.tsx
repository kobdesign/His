"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { QueueData } from "@/lib/types";
import { fmtTime } from "@/lib/format";

const REFRESH_INTERVAL_MS = 20_000;

// สีป้ายสถานะ — สถานะที่ไม่รู้จักตกไปที่ default
const STATUS_STYLE: Record<string, string> = {
  Scheduled: "bg-slate-100 text-slate-700",
  Open: "bg-blue-100 text-blue-800",
  "Checked In": "bg-teal-100 text-teal-800",
  "Checked Out": "bg-slate-200 text-slate-600",
  Closed: "bg-emerald-100 text-emerald-800",
  Expired: "bg-slate-200 text-slate-500",
  "No Show": "bg-rose-100 text-rose-700",
};

const STATUS_LABEL: Record<string, string> = {
  Scheduled: "นัดไว้",
  Open: "มาถึงแล้ว",
  "Checked In": "เช็คอินแล้ว",
  "Checked Out": "เช็คเอาท์",
  Closed: "เสร็จสิ้น",
  Expired: "หมดอายุ",
  "No Show": "ไม่มาตามนัด",
  Cancelled: "ยกเลิก",
};

export default function QueueBoard({ initial }: { initial: QueueData }) {
  const [data, setData] = useState<QueueData>(initial);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/queue", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as QueueData);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) {
      setError(`โหลดคิวไม่สำเร็จ: ${String(e)}`);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // เช็คอิน: ใช้ "Checked In" ถ้า Frappe Health รุ่นนี้มี ไม่งั้นถอยไป "Open"
  const checkinStatus = data.status_options.includes("Checked In")
    ? "Checked In"
    : "Open";

  async function checkin(appointment: string) {
    setBusy(appointment);
    setError(null);
    try {
      const res = await fetch("/api/appointments/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointment, status: checkinStatus }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      await refresh();
    } catch (e) {
      setError(`เช็คอินไม่สำเร็จ: ${String(e)}`);
    } finally {
      setBusy(null);
    }
  }

  const appts = data.appointments;
  const waitingTriage = appts.filter((a) => !a.has_vitals && a.status !== "Closed");
  const triaged = appts.filter((a) => a.has_vitals);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">คิว OPD วันนี้</h1>
          <p className="text-sm text-slate-500">
            {data.date}
            {updatedAt && (
              <> · อัปเดตล่าสุด {updatedAt.toLocaleTimeString("th-TH")}</>
            )}{" "}
            · รีเฟรชอัตโนมัติทุก {REFRESH_INTERVAL_MS / 1000} วินาที
          </p>
        </div>
        <button
          onClick={refresh}
          className="rounded-md border bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm hover:border-teal-500"
        >
          รีเฟรช
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="นัดทั้งหมด" value={appts.length} />
        <StatTile label="รอคัดกรอง" value={waitingTriage.length} accent="text-amber-600" />
        <StatTile label="คัดกรองแล้ว" value={triaged.length} accent="text-teal-600" />
      </div>

      {error && (
        <div className="rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      {appts.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-center text-slate-500">
          ยังไม่มีนัดหมายของวันนี้ — สร้าง Patient Appointment ได้จาก Frappe Desk
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
                <th className="px-4 py-2 font-medium">สถานะ</th>
                <th className="px-4 py-2 font-medium">คัดกรอง</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {appts.map((a) => (
                <tr key={a.name} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs">{fmtTime(a.appointment_time)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{a.patient}</td>
                  <td className="px-4 py-2 font-medium">{a.patient_name}</td>
                  <td className="px-4 py-2">{a.department ?? "-"}</td>
                  <td className="px-4 py-2">{a.practitioner_name ?? "-"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLE[a.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {a.has_vitals ? (
                      <span className="inline-block rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
                        ✓ แล้ว
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">ยังไม่คัดกรอง</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      {a.status === "Scheduled" && (
                        <button
                          onClick={() => checkin(a.name)}
                          disabled={busy === a.name}
                          className="rounded-md border border-teal-600 px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"
                        >
                          {busy === a.name ? "กำลังเช็คอิน…" : "เช็คอิน"}
                        </button>
                      )}
                      <Link
                        href={`/queue/${encodeURIComponent(a.name)}/vitals`}
                        className="rounded-md bg-teal-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-teal-700"
                      >
                        {a.has_vitals ? "คัดกรองซ้ำ" : "คัดกรอง"}
                      </Link>
                    </div>
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

function StatTile({
  label,
  value,
  accent = "text-slate-900",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}
