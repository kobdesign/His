import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "HIS — Hospital Information System",
  description: "Custom frontend on Frappe Health / ERPNext",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
            <Link href="/" className="text-lg font-semibold text-teal-700">
              HIS
            </Link>
            <Link href="/queue" className="text-sm text-slate-600 hover:text-teal-700">
              คิว OPD
            </Link>
            <Link href="/exam" className="text-sm text-slate-600 hover:text-teal-700">
              ห้องตรวจ
            </Link>
            <Link href="/pharmacy" className="text-sm text-slate-600 hover:text-teal-700">
              ห้องยา
            </Link>
            <Link href="/patients" className="text-sm text-slate-600 hover:text-teal-700">
              ผู้ป่วย
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
