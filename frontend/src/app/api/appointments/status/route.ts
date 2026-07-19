import { NextResponse } from "next/server";
import { callMethodPost, FrappeError } from "@/lib/frappe";

export const dynamic = "force-dynamic";

/** POST /api/appointments/status  body: { appointment, status } — เช็คอิน/เปลี่ยนสถานะนัด */
export async function POST(req: Request) {
  const body = (await req.json()) as { appointment?: string; status?: string };
  if (!body.appointment || !body.status) {
    return NextResponse.json(
      { error: "appointment and status are required" },
      { status: 400 },
    );
  }

  try {
    const data = await callMethodPost("his_custom.api.update_appointment_status", {
      appointment: body.appointment,
      status: body.status,
    });
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof FrappeError ? e.status : 500;
    return NextResponse.json({ error: String(e) }, { status });
  }
}
