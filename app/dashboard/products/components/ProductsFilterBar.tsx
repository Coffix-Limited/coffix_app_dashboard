"use client";

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type NumberRange = { min: string; max: string };

interface ProductsFilterBarProps {
  search: string; setSearch: (v: string) => void;
  filterCategoryId: string; setFilterCategoryId: (v: string) => void;
  categoryNames: string[];
  filterPrice: NumberRange; setFilterPrice: (v: NumberRange | ((p: NumberRange) => NumberRange)) => void;
  filterCost: NumberRange; setFilterCost: (v: NumberRange | ((p: NumberRange) => NumberRange)) => void;
  filterAvailableInStore: string; setFilterAvailableInStore: (v: string) => void;
  filterDisabledInStore: string; setFilterDisabledInStore: (v: string) => void;
  stores: { docId: string; name?: string }[];
  anyFilterActive: boolean;
  clearAllFilters: () => void;
}

export function ProductsFilterBar({
  search, setSearch,
  filterCategoryId, setFilterCategoryId,
  categoryNames,
  filterPrice, setFilterPrice,
  filterCost, setFilterCost,
  filterAvailableInStore, setFilterAvailableInStore,
  filterDisabledInStore, setFilterDisabledInStore,
  stores,
  anyFilterActive,
  clearAllFilters,
}: ProductsFilterBarProps) {
  return (
    <div className="overflow-x-auto lg:overflow-x-visible">
      <div className="flex items-end gap-2 pb-1 min-w-max lg:min-w-0 lg:flex-wrap">

        {/* Search */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[160px] ${search ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Search
            {search && <button onClick={() => setSearch("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="text"
            placeholder="Product name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey"
          />
        </div>

        {/* Category */}
        {categoryNames.length > 0 && (
          <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[160px] ${filterCategoryId !== "All" ? "border-primary" : "border-border"}`}>
            <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
              Category
              {filterCategoryId !== "All" && <button onClick={() => setFilterCategoryId("All")} className="ml-1 text-light-grey hover:text-black">×</button>}
            </span>
            <Select value={filterCategoryId} onValueChange={(v) => setFilterCategoryId(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {categoryNames.map((name) => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Price */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[200px] ${filterPrice.min || filterPrice.max ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Price ($)
            {(filterPrice.min || filterPrice.max) && <button onClick={() => setFilterPrice({ min: "", max: "" })} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <div className="flex items-center gap-1">
            <input type="number" min="0" step="0.01" placeholder="Min" value={filterPrice.min}
              onChange={(e) => setFilterPrice((p) => ({ ...p, min: e.target.value }))}
              className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey" />
            <span className="shrink-0 text-xs text-light-grey">–</span>
            <input type="number" min="0" step="0.01" placeholder="Max" value={filterPrice.max}
              onChange={(e) => setFilterPrice((p) => ({ ...p, max: e.target.value }))}
              className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey" />
          </div>
        </div>

        {/* Cost */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[200px] ${filterCost.min || filterCost.max ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Cost ($)
            {(filterCost.min || filterCost.max) && <button onClick={() => setFilterCost({ min: "", max: "" })} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <div className="flex items-center gap-1">
            <input type="number" min="0" step="0.01" placeholder="Min" value={filterCost.min}
              onChange={(e) => setFilterCost((p) => ({ ...p, min: e.target.value }))}
              className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey" />
            <span className="shrink-0 text-xs text-light-grey">–</span>
            <input type="number" min="0" step="0.01" placeholder="Max" value={filterCost.max}
              onChange={(e) => setFilterCost((p) => ({ ...p, max: e.target.value }))}
              className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey" />
          </div>
        </div>

        {/* Available In Store */}
        {stores.length > 0 && (
          <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[180px] ${filterAvailableInStore !== "All" ? "border-primary" : "border-border"}`}>
            <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
              Available In
              {filterAvailableInStore !== "All" && <button onClick={() => setFilterAvailableInStore("All")} className="ml-1 text-light-grey hover:text-black">×</button>}
            </span>
            <Select value={filterAvailableInStore} onValueChange={(v) => setFilterAvailableInStore(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Stores</SelectItem>
                {stores.map((s) => (
                  <SelectItem key={s.docId} value={s.docId}>{s.name ?? s.docId}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Disabled In Store */}
        {stores.length > 0 && (
          <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[180px] ${filterDisabledInStore !== "All" ? "border-primary" : "border-border"}`}>
            <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
              Disabled In
              {filterDisabledInStore !== "All" && <button onClick={() => setFilterDisabledInStore("All")} className="ml-1 text-light-grey hover:text-black">×</button>}
            </span>
            <Select value={filterDisabledInStore} onValueChange={(v) => setFilterDisabledInStore(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Stores</SelectItem>
                {stores.map((s) => (
                  <SelectItem key={s.docId} value={s.docId}>{s.name ?? s.docId}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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
