import { NextResponse } from "next/server";
import { callMethodPost, FrappeError } from "@/lib/frappe";

export const dynamic = "force-dynamic";

/** POST /api/billing/invoice — ออกใบแจ้งหนี้ (Sales Invoice) จาก encounter */
export async function POST(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.encounter) {
    return NextResponse.json({ error: "encounter is required" }, { status: 400 });
  }

  try {
    const data = await callMethodPost("his_custom.api.create_invoice", body);
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof FrappeError ? e.status : 500;
    return NextResponse.json({ error: String(e) }, { status });
  }
}
