import Link from "next/link";
import { callMethod, FrappeError } from "@/lib/frappe";
import type { DispenseContext } from "@/lib/types";
import DispenseForm from "@/components/DispenseForm";

export const dynamic = "force-dynamic";

export default async function DispensePage({
  params,
}: {
  params: Promise<{ encounter: string }>;
}) {
  const { encounter } = await params;
  const encounterName = decodeURIComponent(encounter);

  let context: DispenseContext | null = null;
  let error: string | null = null;

  try {
    context = await callMethod<DispenseContext>(
      "his_custom.api.get_dispense_context",
      { encounter: encounterName },
    );
  } catch (e) {
    error = e instanceof FrappeError ? e.message : String(e);
  }

  if (error || !context) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">จ่ายยา</h1>
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
          <p className="font-semibold">โหลดข้อมูลไม่สำเร็จ</p>
          <p className="mt-1 break-all">{error}</p>
        </div>
        <Link href="/pharmacy" className="text-sm text-teal-700 hover:underline">
          ← กลับไปคิวห้องยา
        </Link>
      </div>
    );
  }

  const { patient, encounter: enc } = context;

  return (
    <div className="space-y-5">
      <div>
        <Link href="/pharmacy" className="text-sm text-teal-700 hover:underline">
          ← กลับไปคิวห้องยา
        </Link>
        <h1 className="mt-1 text-xl font-bold">จ่ายยา</h1>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="text-lg font-semibold">{patient.patient_name}</span>
          <span className="font-mono text-xs text-slate-500">{patient.name}</span>
          <span className="text-sm text-slate-500">
            {patient.sex ?? "-"} · {patient.age ?? "-"} · โทร {patient.mobile ?? "-"}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          ตรวจโดย {enc.practitioner_name ?? "-"} · {enc.encounter_date ?? "-"}{" "}
          {enc.encounter_time?.slice(0, 5) ?? ""} ·{" "}
          <span className="font-mono text-xs">{enc.name}</span>
        </p>
      </div>

      <DispenseForm context={context} />
    </div>
  );
}
