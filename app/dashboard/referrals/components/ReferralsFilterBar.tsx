"use client";

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface ReferralsFilterBarProps {
  search: string; setSearch: (v: string) => void;
  statusFilter: "All" | "Active" | "Disabled"; setStatusFilter: (v: "All" | "Active" | "Disabled") => void;
  anyFilterActive: boolean;
  clearAllFilters: () => void;
}

export function ReferralsFilterBar({
  search, setSearch,
  statusFilter, setStatusFilter,
  anyFilterActive,
  clearAllFilters,
}: ReferralsFilterBarProps) {
  return (
    <div className="overflow-x-auto lg:overflow-x-visible">
      <div className="flex items-end gap-2 pb-1 min-w-max lg:min-w-0 lg:flex-wrap">

        {/* Search */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[220px] ${search ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Search
            {search && <button onClick={() => setSearch("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="text"
            placeholder="Referrer or referee…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey"
          />
        </div>

        {/* Status */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[150px] ${statusFilter !== "All" ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Status
            {statusFilter !== "All" && <button onClick={() => setStatusFilter("All")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "All" | "Active" | "Disabled")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {anyFilterActive && (
          <button
            onClick={clearAllFilters}
            className="self-end mb-2 shrink-0 text-xs text-light-grey underline underline-offset-2 hover:text-black transition-colors whitespace-nowrap"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
