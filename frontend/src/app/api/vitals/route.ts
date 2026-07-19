import { NextResponse } from "next/server";
import { callMethodPost, FrappeError } from "@/lib/frappe";

export const dynamic = "force-dynamic";

/** POST /api/vitals — บันทึกสัญญาณชีพจากหน้าคัดกรอง */
export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.patient) {
    return NextResponse.json({ error: "patient is required" }, { status: 400 });
  }

  try {
    const data = await callMethodPost("his_custom.api.submit_vital_signs", body);
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof FrappeError ? e.status : 500;
    return NextResponse.json({ error: String(e) }, { status });
  }
}
