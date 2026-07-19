import { getList, FrappeError } from "@/lib/frappe";

// ข้อมูลผู้ป่วยต้อง fetch ใหม่ทุก request — ห้าม prerender ตอน build
export const dynamic = "force-dynamic";

type Patient = {
  name: string;
  patient_name: string;
  sex: string | null;
  dob: string | null;
  mobile: string | null;
  status: string | null;
};

export default async function PatientsPage() {
  let patients: Patient[] = [];
  let error: string | null = null;

  try {
    patients = await getList<Patient>("Patient", {
      fields: ["name", "patient_name", "sex", "dob", "mobile", "status"],
      limit: 50,
      orderBy: "modified desc",
    });
  } catch (e) {
    error = e instanceof FrappeError ? e.message : String(e);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">รายชื่อผู้ป่วย</h1>

      {error ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">เชื่อมต่อ Frappe ไม่สำเร็จ</p>
          <p className="mt-1 break-all">{error}</p>
          <p className="mt-2">
            ตรวจสอบว่า backend รันอยู่ที่ FRAPPE_URL และตั้งค่า FRAPPE_API_KEY /
            FRAPPE_API_SECRET ใน <code>.env.local</code> แล้ว
          </p>
        </div>
      ) : patients.length === 0 ? (
        <p className="text-slate-500">ยังไม่มีข้อมูลผู้ป่วยในระบบ</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">HN</th>
                <th className="px-4 py-2 font-medium">ชื่อ-นามสกุล</th>
                <th className="px-4 py-2 font-medium">เพศ</th>
                <th className="px-4 py-2 font-medium">วันเกิด</th>
                <th className="px-4 py-2 font-medium">โทรศัพท์</th>
                <th className="px-4 py-2 font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.name} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs">{p.name}</td>
                  <td className="px-4 py-2">{p.patient_name}</td>
                  <td className="px-4 py-2">{p.sex ?? "-"}</td>
                  <td className="px-4 py-2">{p.dob ?? "-"}</td>
                  <td className="px-4 py-2">{p.mobile ?? "-"}</td>
                  <td className="px-4 py-2">{p.status ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
