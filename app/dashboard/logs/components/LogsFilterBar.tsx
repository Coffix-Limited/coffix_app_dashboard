"use client";

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DateInput } from "@/components/ui/DateInput";

type DateRange = { from: string; to: string };

interface LogsFilterBarProps {
  search: string; setSearch: (v: string) => void;
  filterCategory: string; setFilterCategory: (v: string) => void;
  categories: string[];
  filterAction: string; setFilterAction: (v: string) => void;
  actions: string[];
  filterSeverity: string; setFilterSeverity: (v: string) => void;
  filterPage: string; setFilterPage: (v: string) => void;
  filterNotes: string; setFilterNotes: (v: string) => void;
  filterTime: DateRange; setFilterTime: (v: DateRange | ((p: DateRange) => DateRange)) => void;
  anyFilterActive: boolean;
  clearAllFilters: () => void;
}

export function LogsFilterBar({
  search, setSearch,
  filterCategory, setFilterCategory,
  categories,
  filterAction, setFilterAction,
  actions,
  filterSeverity, setFilterSeverity,
  filterPage, setFilterPage,
  filterNotes, setFilterNotes,
  filterTime, setFilterTime,
  anyFilterActive,
  clearAllFilters,
}: LogsFilterBarProps) {
  return (
    <div className="overflow-x-auto lg:overflow-x-visible">
      <div className="flex items-end gap-2 pb-1 min-w-max lg:min-w-0 lg:flex-wrap">

        {/* Search */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[200px] ${search ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Search
            {search && <button onClick={() => setSearch("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="text"
            placeholder="Action, category, page, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey"
          />
        </div>

        {/* Category */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[150px] ${filterCategory !== "All" ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Category
            {filterCategory !== "All" && <button onClick={() => setFilterCategory("All")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[150px] ${filterAction !== "All" ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Action
            {filterAction !== "All" && <button onClick={() => setFilterAction("All")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <Select value={filterAction} onValueChange={(v) => setFilterAction(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Severity */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[140px] ${filterSeverity ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Severity
            {filterSeverity && <button onClick={() => setFilterSeverity("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="text"
            placeholder="contains…"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey"
          />
        </div>

        {/* Page */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[150px] ${filterPage ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Page
            {filterPage && <button onClick={() => setFilterPage("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="text"
            placeholder="contains…"
            value={filterPage}
            onChange={(e) => setFilterPage(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey"
          />
        </div>

        {/* Notes */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[160px] ${filterNotes ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Notes
            {filterNotes && <button onClick={() => setFilterNotes("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="text"
            placeholder="contains…"
            value={filterNotes}
            onChange={(e) => setFilterNotes(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey"
          />
        </div>

        {/* Time */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[260px] ${filterTime.from || filterTime.to ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Time
            {(filterTime.from || filterTime.to) && (
              <button onClick={() => setFilterTime({ from: "", to: "" })} className="ml-1 text-light-grey hover:text-black">×</button>
            )}
          </span>
          <div className="flex items-center gap-1">
            <DateInput value={filterTime.from} onChange={(v) => setFilterTime((p) => ({ ...p, from: v }))} />
            <span className="shrink-0 text-xs text-light-grey">–</span>
            <DateInput value={filterTime.to} onChange={(v) => setFilterTime((p) => ({ ...p, to: v }))} />
          </div>
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
