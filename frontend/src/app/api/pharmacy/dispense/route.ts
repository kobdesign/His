import { NextResponse } from "next/server";
import { callMethod, callMethodPost, FrappeError } from "@/lib/frappe";

export const dynamic = "force-dynamic";

/** GET /api/pharmacy/dispense?encounter=... — ข้อมูลหน้าจ่ายยา */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const encounter = searchParams.get("encounter");
  if (!encounter) {
    return NextResponse.json({ error: "encounter is required" }, { status: 400 });
  }

  try {
    const data = await callMethod("his_custom.api.get_dispense_context", { encounter });
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof FrappeError ? e.status : 500;
    return NextResponse.json({ error: String(e) }, { status });
  }
}

/** POST /api/pharmacy/dispense — ยืนยันจ่ายยา (สร้าง Pharmacy Dispense + ตัดสต็อก) */
export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.encounter) {
    return NextResponse.json({ error: "encounter is required" }, { status: 400 });
  }

  try {
    const data = await callMethodPost("his_custom.api.submit_dispense", body);
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof FrappeError ? e.status : 500;
    return NextResponse.json({ error: String(e) }, { status });
  }
}
