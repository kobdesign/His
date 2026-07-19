import { NextResponse } from "next/server";
import { callMethod, callMethodPost, FrappeError } from "@/lib/frappe";

export const dynamic = "force-dynamic";

/** GET /api/encounter?appointment=... — ข้อมูลหน้าห้องตรวจทั้งหมด */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const appointment = searchParams.get("appointment");
  if (!appointment) {
    return NextResponse.json({ error: "appointment is required" }, { status: 400 });
  }

  try {
    const data = await callMethod("his_custom.api.get_encounter_context", { appointment });
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof FrappeError ? e.status : 500;
    return NextResponse.json({ error: String(e) }, { status });
  }
}

/** POST /api/encounter — บันทึกร่าง / submit จบการตรวจ */
export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.appointment) {
    return NextResponse.json({ error: "appointment is required" }, { status: 400 });
  }

  try {
    const data = await callMethodPost("his_custom.api.save_encounter", body);
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof FrappeError ? e.status : 500;
    return NextResponse.json({ error: String(e) }, { status });
  }
}
