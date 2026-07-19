import { callMethod, FrappeError } from "@/lib/frappe";
import type { QueueData } from "@/lib/types";
import ExamWorklist from "@/components/ExamWorklist";

export const dynamic = "force-dynamic";

export default async function ExamPage() {
  let initial: QueueData | null = null;
  let error: string | null = null;

  try {
    initial = await callMethod<QueueData>("his_custom.api.get_opd_queue");
  } catch (e) {
    error = e instanceof FrappeError ? e.message : String(e);
  }

  if (error || !initial) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">ห้องตรวจแพทย์</h1>
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">เชื่อมต่อ Frappe ไม่สำเร็จ</p>
          <p className="mt-1 break-all">{error}</p>
        </div>
      </div>
    );
  }

  return <ExamWorklist initial={initial} />;
}
