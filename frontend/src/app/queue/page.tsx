import { callMethod, FrappeError } from "@/lib/frappe";
import type { QueueData } from "@/lib/types";
import QueueBoard from "@/components/QueueBoard";

// คิวต้องสดเสมอ — ห้าม prerender/cache
export const dynamic = "force-dynamic";

export default async function QueuePage() {
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
        <h1 className="text-xl font-bold">คิว OPD วันนี้</h1>
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">เชื่อมต่อ Frappe ไม่สำเร็จ</p>
          <p className="mt-1 break-all">{error}</p>
          <p className="mt-2">
            ตรวจสอบว่า backend รันอยู่ และติดตั้ง app <code>his_custom</code> ใน site แล้ว
            (endpoint: <code>his_custom.api.get_opd_queue</code>)
          </p>
        </div>
      </div>
    );
  }

  return <QueueBoard initial={initial} />;
}
