import Link from "next/link";
import { callMethod, FrappeError } from "@/lib/frappe";
import type { AppointmentDetail } from "@/lib/types";
import VitalSignsForm from "@/components/VitalSignsForm";

export const dynamic = "force-dynamic";

export default async function VitalsPage({
  params,
}: {
  params: Promise<{ appointment: string }>;
}) {
  const { appointment } = await params;

  let detail: AppointmentDetail | null = null;
  let error: string | null = null;

  try {
    detail = await callMethod<AppointmentDetail>(
      "his_custom.api.get_appointment_detail",
      { appointment: decodeURIComponent(appointment) },
    );
  } catch (e) {
    error = e instanceof FrappeError ? e.message : String(e);
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">คัดกรอง / สัญญาณชีพ</h1>
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">โหลดข้อมูลนัดหมายไม่สำเร็จ</p>
          <p className="mt-1 break-all">{error}</p>
        </div>
        <Link href="/queue" className="text-sm text-teal-700 hover:underline">
          ← กลับไปหน้าคิว
        </Link>
      </div>
    );
  }

  const { patient, appointment: appt, latest_vitals } = detail;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/queue" className="text-sm text-teal-700 hover:underline">
          ← กลับไปหน้าคิว
        </Link>
        <h1 className="mt-1 text-xl font-bold">คัดกรอง / สัญญาณชีพ</h1>
      </div>

      {/* บัตรข้อมูลผู้ป่วย */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="text-lg font-semibold">{patient.patient_name}</span>
          <span className="font-mono text-xs text-slate-500">{patient.name}</span>
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
          <Item label="เพศ" value={patient.sex} />
          <Item label="อายุ" value={patient.age ?? patient.dob} />
          <Item label="กรุ๊ปเลือด" value={patient.blood_group} />
          <Item label="โทรศัพท์" value={patient.mobile} />
          <Item label="แผนก" value={appt.department} />
          <Item label="แพทย์" value={appt.practitioner_name} />
          <Item label="เวลานัด" value={appt.appointment_time?.slice(0, 5)} />
          <Item label="สถานะนัด" value={appt.status} />
        </dl>
      </div>

      {/* vital ครั้งล่าสุด (ถ้ามี) เพื่อให้พยาบาลเทียบค่าได้ */}
      {latest_vitals && (
        <div className="rounded-lg border border-slate-200 bg-slate-100/60 p-4 text-sm">
          <p className="font-medium text-slate-600">
            ครั้งล่าสุด — {latest_vitals.signs_date} {latest_vitals.signs_time?.slice(0, 5)}
          </p>
          <p className="mt-1 text-slate-500">
            T {latest_vitals.temperature ?? "-"}°C · P {latest_vitals.pulse ?? "-"}/min · RR{" "}
            {latest_vitals.respiratory_rate ?? "-"}/min · BP {latest_vitals.bp_systolic ?? "-"}/
            {latest_vitals.bp_diastolic ?? "-"} mmHg · นน. {latest_vitals.weight ?? "-"} กก. · BMI{" "}
            {latest_vitals.bmi ?? "-"}
          </p>
        </div>
      )}

      <VitalSignsForm
        patient={patient.name}
        appointment={appt.name}
        defaultHeightM={latest_vitals?.height ?? null}
      />
    </div>
  );
}

function Item({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd>{value || "-"}</dd>
    </div>
  );
}
