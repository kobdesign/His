import { NextResponse } from "next/server";
import { callMethod, FrappeError } from "@/lib/frappe";

export const dynamic = "force-dynamic";

/** GET /api/pharmacy/queue?date=YYYY-MM-DD — คิวห้องยาของวัน (default: วันนี้) */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  try {
    const data = await callMethod(
      "his_custom.api.get_pharmacy_queue",
      date ? { date } : {},
    );
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof FrappeError ? e.status : 500;
    return NextResponse.json({ error: String(e) }, { status });
  }
}
