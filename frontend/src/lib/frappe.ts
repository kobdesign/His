/**
 * Frappe API client (server-side)
 *
 * ใช้ token auth (API key/secret จาก .env.local) สำหรับ fetch ใน Server Component
 * ส่วนฝั่ง browser ให้เรียกผ่าน /frappe-api/* (rewrite ใน next.config.mjs)
 * ด้วย session cookie ของ Frappe แทน — อย่าเอา API secret ไปไว้ฝั่ง client
 */

const FRAPPE_URL = process.env.FRAPPE_URL ?? "http://localhost:8000";

export class FrappeError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "FrappeError";
  }
}

function authHeaders(): Record<string, string> {
  const key = process.env.FRAPPE_API_KEY;
  const secret = process.env.FRAPPE_API_SECRET;
  if (!key || !secret) {
    throw new FrappeError(
      "FRAPPE_API_KEY / FRAPPE_API_SECRET is not set — copy .env.local.example to .env.local",
      401,
    );
  }
  return { Authorization: `token ${key}:${secret}` };
}

async function frappeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${FRAPPE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeaders(),
      ...init?.headers,
    },
    // ข้อมูลคนไข้ต้องสดเสมอ — ปิด cache ของ Next.js
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new FrappeError(`Frappe API ${res.status}: ${body.slice(0, 500)}`, res.status);
  }
  return res.json() as Promise<T>;
}

/** ดึงรายการเอกสาร: GET /api/resource/<doctype> */
export async function getList<T = Record<string, unknown>>(
  doctype: string,
  opts: {
    fields?: string[];
    filters?: unknown[];
    limit?: number;
    orderBy?: string;
  } = {},
): Promise<T[]> {
  const params = new URLSearchParams();
  if (opts.fields) params.set("fields", JSON.stringify(opts.fields));
  if (opts.filters) params.set("filters", JSON.stringify(opts.filters));
  params.set("limit_page_length", String(opts.limit ?? 20));
  if (opts.orderBy) params.set("order_by", opts.orderBy);

  const data = await frappeFetch<{ data: T[] }>(
    `/api/resource/${encodeURIComponent(doctype)}?${params.toString()}`,
  );
  return data.data;
}

/** เรียก whitelisted method: GET /api/method/<dotted.path> */
export async function callMethod<T = unknown>(
  method: string,
  args: Record<string, string | number> = {},
): Promise<T> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(args)) params.set(k, String(v));
  const data = await frappeFetch<{ message: T }>(
    `/api/method/${method}?${params.toString()}`,
  );
  return data.message;
}
