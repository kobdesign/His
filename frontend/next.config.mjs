/** @type {import('next').NextConfig} */

// Proxy ทุก request ที่ขึ้นต้นด้วย /frappe-api ไปที่ Frappe backend
// เพื่อให้ browser เรียก API ได้โดยไม่ติด CORS (same-origin ผ่าน Next.js)
const FRAPPE_URL = process.env.FRAPPE_URL ?? "http://localhost:8000";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/frappe-api/:path*",
        destination: `${FRAPPE_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
