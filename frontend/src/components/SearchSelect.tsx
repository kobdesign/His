"use client";

import { useEffect, useRef, useState } from "react";
import type { LinkOption } from "@/lib/types";

type Props = {
  /** logical key ที่ map ไป doctype ฝั่ง backend (his_custom.api.LINK_SOURCES) */
  linkKey: string;
  placeholder?: string;
  /** ให้พิมพ์ค่าใหม่ที่ไม่มีใน master ได้ (เช่น อาการ/วินิจฉัย) */
  allowCreate?: boolean;
  /** เคลียร์ช่องหลังเลือก (ใช้ใน TagPicker) */
  clearOnSelect?: boolean;
  value?: string;
  disabled?: boolean;
  onSelect: (option: LinkOption) => void;
};

export default function SearchSelect({
  linkKey,
  placeholder,
  allowCreate = false,
  clearOnSelect = false,
  value = "",
  disabled = false,
  onSelect,
}: Props) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<LinkOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setQuery(value), [value]);

  // ปิด dropdown เมื่อคลิกนอกกล่อง
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function search(q: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/link-search?key=${encodeURIComponent(linkKey)}&q=${encodeURIComponent(q)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as { results?: LinkOption[] };
        setOptions(data.results ?? []);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
  }

  function pick(option: LinkOption) {
    onSelect(option);
    setQuery(clearOnSelect ? "" : option.value);
    setOpen(false);
  }

  const trimmed = query.trim();
  const hasExact = options.some(
    (o) => o.value.toLowerCase() === trimmed.toLowerCase(),
  );

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          search(e.target.value);
        }}
        onFocus={() => {
          setOpen(true);
          search(query);
        }}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-100"
      />
      {open && !disabled && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-white py-1 text-sm shadow-lg">
          {loading && <li className="px-3 py-1.5 text-slate-400">กำลังค้นหา…</li>}
          {!loading && options.length === 0 && !allowCreate && (
            <li className="px-3 py-1.5 text-slate-400">ไม่พบข้อมูล</li>
          )}
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => pick(o)}
                className="block w-full px-3 py-1.5 text-left hover:bg-teal-50"
              >
                <span className="font-medium">{o.label}</span>
                {o.label !== o.value && (
                  <span className="ml-2 text-xs text-slate-400">{o.value}</span>
                )}
              </button>
            </li>
          ))}
          {allowCreate && trimmed && !hasExact && !loading && (
            <li>
              <button
                type="button"
                onClick={() => pick({ value: trimmed, label: trimmed })}
                className="block w-full px-3 py-1.5 text-left text-teal-700 hover:bg-teal-50"
              >
                + เพิ่ม “{trimmed}”
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
