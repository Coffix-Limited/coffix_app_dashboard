"use client";

import { Calendar } from "lucide-react";

export function isoToDdMmYyyy(iso: string): string {
  if (!iso) return "";
  const [yyyy, mm, dd] = iso.split("-");
  if (!yyyy || !mm || !dd) return "";
  return `${dd}/${mm}/${yyyy}`;
}

export function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative h-7 w-full">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ opacity: 0 }}
        className="absolute inset-0 w-full h-full bg-transparent text-sm outline-none cursor-pointer"
      />
      <span className="pointer-events-none absolute inset-0 flex items-center text-sm select-none pr-6">
        {value
          ? <span className="text-black">{isoToDdMmYyyy(value)}</span>
          : <span className="text-light-grey text-xs">dd/mm/yyyy</span>
        }
      </span>
      <Calendar className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-light-grey" />
    </div>
  );
}
