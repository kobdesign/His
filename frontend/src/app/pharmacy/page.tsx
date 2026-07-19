import { callMethod, FrappeError } from "@/lib/frappe";
import type { PharmacyQueueData } from "@/lib/types";
import PharmacyWorklist from "@/components/PharmacyWorklist";

export const dynamic = "force-dynamic";

export default async function PharmacyPage() {
  let initial: PharmacyQueueData | null = null;
  let error: string | null = null;

  try {
    initial = await callMethod<PharmacyQueueData>("his_custom.api.get_pharmacy_queue");
  } catch (e) {
    error = e instanceof FrappeError ? e.message : String(e);
  }

  if (error || !initial) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">ห้องยา</h1>
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">เชื่อมต่อ Frappe ไม่สำเร็จ</p>
          <p className="mt-1 break-all">{error}</p>
          <p className="mt-2">
            ถ้าเพิ่งเพิ่ม DocType Pharmacy Dispense อย่าลืมรัน{" "}
            <code>bench --site his.localhost migrate</code>
          </p>
        </div>
      </div>
    );
  }

  return <PharmacyWorklist initial={initial} />;
}
