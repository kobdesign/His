import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hospital Information System</h1>
      <p className="text-slate-600">
        Custom frontend บน Frappe Health / ERPNext — โครงเริ่มต้นสำหรับพัฒนา OPD flow
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/patients"
          className="rounded-lg border bg-white p-5 shadow-sm transition hover:border-teal-500 hover:shadow"
        >
          <h2 className="font-semibold text-teal-700">เวชระเบียน</h2>
          <p className="mt-1 text-sm text-slate-500">ค้นหาและดูรายชื่อผู้ป่วย (Patient)</p>
        </Link>
        <Link
          href="/queue"
          className="rounded-lg border bg-white p-5 shadow-sm transition hover:border-teal-500 hover:shadow"
        >
          <h2 className="font-semibold text-teal-700">คิว OPD / คัดกรอง</h2>
          <p className="mt-1 text-sm text-slate-500">
            คิววันนี้, เช็คอิน, บันทึกสัญญาณชีพ (Vital Signs)
          </p>
        </Link>
        <Link
          href="/exam"
          className="rounded-lg border bg-white p-5 shadow-sm transition hover:border-teal-500 hover:shadow"
        >
          <h2 className="font-semibold text-teal-700">ห้องตรวจแพทย์</h2>
          <p className="mt-1 text-sm text-slate-500">
            บันทึกอาการ วินิจฉัย สั่งยา สั่งแล็บ (Patient Encounter)
          </p>
        </Link>
        <Link
          href="/pharmacy"
          className="rounded-lg border bg-white p-5 shadow-sm transition hover:border-teal-500 hover:shadow"
        >
          <h2 className="font-semibold text-teal-700">ห้องยา</h2>
          <p className="mt-1 text-sm text-slate-500">
            คิวจ่ายยาจากใบสั่งแพทย์ พร้อมตัดสต็อกคลังยา
          </p>
        </Link>
      </div>
    </div>
  );
}
