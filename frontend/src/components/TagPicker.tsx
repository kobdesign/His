"use client";

import SearchSelect from "@/components/SearchSelect";

type Props = {
  linkKey: string;
  placeholder?: string;
  allowCreate?: boolean;
  values: string[];
  disabled?: boolean;
  onChange: (values: string[]) => void;
};

/** เลือกได้หลายค่าเป็น tag — ใช้กับอาการสำคัญ / วินิจฉัย / รายการแล็บ */
export default function TagPicker({
  linkKey,
  placeholder,
  allowCreate = false,
  values,
  disabled = false,
  onChange,
}: Props) {
  function add(value: string) {
    if (!values.includes(value)) onChange([...values, value]);
  }

  function remove(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-800 ring-1 ring-teal-200"
            >
              {v}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(v)}
                  className="text-teal-500 hover:text-rose-600"
                  aria-label={`ลบ ${v}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {!disabled && (
        <SearchSelect
          linkKey={linkKey}
          placeholder={placeholder}
          allowCreate={allowCreate}
          clearOnSelect
          onSelect={(o) => add(o.value)}
        />
      )}
    </div>
  );
}
