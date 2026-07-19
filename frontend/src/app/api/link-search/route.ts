import { NextResponse } from "next/server";
import { callMethod, FrappeError } from "@/lib/frappe";

export const dynamic = "force-dynamic";

/** GET /api/link-search?key=drug&q=para — typeahead จาก master data ฝั่ง Frappe */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  const q = searchParams.get("q") ?? "";
  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  try {
    const data = await callMethod("his_custom.api.search_link", { key, query: q });
    return NextResponse.json(data);
  } catch (e) {
    const status = e instanceof FrappeError ? e.status : 500;
    return NextResponse.json({ error: String(e) }, { status });
  }
}
