import Link from "next/link";
import { callMethod, FrappeError } from "@/lib/frappe";
import type { AppointmentDetail } from "@/lib/types";
import ExamForm from "@/components/ExamForm";

export const dynamic = "force-dynamic";

export default async function ExamEncounterPage({
  params,
}: {
  params: Promise<{ appointment: string }>;
}) {
  const { appointment } = await params;
  const appointmentName = decodeURIComponent(appointment);

  let detail: AppointmentDetail | null = null;
  let error: string | null = null;

  try {
    detail = await callMethod<AppointmentDetail>(
      "his_custom.api.get_encounter_context",
      { appointment: appointmentName },
    );
  } catch (e) {
    error = e instanceof FrappeError ? e.message : String(e);
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">ห้องตรวจแพทย์</h1>
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">โหลดข้อมูลไม่สำเร็จ</p>
          <p className="mt-1 break-all">{error}</p>
        </div>
        <Link href="/exam" className="text-sm text-teal-700 hover:underline">
          ← กลับไป worklist
        </Link>
      </div>
    );
  }

  const { patient, appointment: appt, latest_vitals, encounter } = detail;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/exam" className="text-sm text-teal-700 hover:underline">
          ← กลับไป worklist
        </Link>
        <h1 className="mt-1 text-xl font-bold">ตรวจผู้ป่วย</h1>
      </div>

      {/* บัตรผู้ป่วย + vitals ล่าสุดจากหน้าคัดกรอง */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="text-lg font-semibold">{patient.patient_name}</span>
          <span className="font-mono text-xs text-slate-500">{patient.name}</span>
          <span className="text-sm text-slate-500">
            {patient.sex ?? "-"} · {patient.age ?? "-"} · กรุ๊ปเลือด {patient.blood_group ?? "-"}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          แผนก {appt.department ?? "-"} · แพทย์ {appt.practitioner_name ?? "-"} · เวลานัด{" "}
          {appt.appointment_time?.slice(0, 5) ?? "-"}
        </p>
        {latest_vitals ? (
          <p className="mt-2 rounded-md bg-slate-100/70 px-3 py-2 text-sm text-slate-600">
            <span className="font-medium">คัดกรองล่าสุด:</span> T {latest_vitals.temperature ?? "-"}
            °C · P {latest_vitals.pulse ?? "-"}/min · RR {latest_vitals.respiratory_rate ?? "-"}/min
            · BP {latest_vitals.bp_systolic ?? "-"}/{latest_vitals.bp_diastolic ?? "-"} mmHg · นน.{" "}
            {latest_vitals.weight ?? "-"} กก. · BMI {latest_vitals.bmi ?? "-"}
          </p>
        ) : (
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
            ยังไม่มีข้อมูลคัดกรอง —{" "}
            <Link
              href={`/queue/${encodeURIComponent(appt.name)}/vitals`}
              className="underline hover:text-amber-900"
            >
              บันทึกสัญญาณชีพก่อน
            </Link>
          </p>
        )}
      </div>

      <ExamForm appointment={appt.name} initial={encounter ?? null} />
    </div>
  );
}
