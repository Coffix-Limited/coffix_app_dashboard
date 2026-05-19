"use client";

interface CouponsFilterBarProps {
  search: string; setSearch: (v: string) => void;
  typeFilter: string; setTypeFilter: (v: string) => void;
  storeFilter: string; setStoreFilter: (v: string) => void;
  emailFilter: string; setEmailFilter: (v: string) => void;
  expiryFrom: string; setExpiryFrom: (v: string) => void;
  expiryTo: string; setExpiryTo: (v: string) => void;
  amountMin: string; setAmountMin: (v: string) => void;
  amountMax: string; setAmountMax: (v: string) => void;
  stores: { docId?: string; name?: string }[];
  anyFilterActive: boolean;
  clearAllFilters: () => void;
}

export function CouponsFilterBar({
  search, setSearch,
  typeFilter, setTypeFilter,
  storeFilter, setStoreFilter,
  emailFilter, setEmailFilter,
  expiryFrom, setExpiryFrom,
  expiryTo, setExpiryTo,
  amountMin, setAmountMin,
  amountMax, setAmountMax,
  stores,
  anyFilterActive,
  clearAllFilters,
}: CouponsFilterBarProps) {
  return (
    <div className="overflow-x-auto lg:overflow-x-visible">
      <div className="flex items-end gap-2 pb-1 min-w-max lg:min-w-0 lg:flex-wrap">

        {/* Search (notes) */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[200px] ${search ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Search
            {search && <button onClick={() => setSearch("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="text"
            placeholder="Search by notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey"
          />
        </div>

        {/* Type */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[130px] ${typeFilter !== "All" ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Type
            {typeFilter !== "All" && <button onClick={() => setTypeFilter("All")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none"
          >
            <option value="All">All</option>
            <option value="referral">Referral</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Store */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[160px] ${storeFilter ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Store
            {storeFilter && <button onClick={() => setStoreFilter("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none"
          >
            <option value="">All stores</option>
            {stores.map((s) => (
              <option key={s.docId} value={s.docId ?? ""}>{s.name ?? s.docId}</option>
            ))}
          </select>
        </div>

        {/* Customer Email */}
        {/* <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[200px] ${emailFilter ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Customer Email
            {emailFilter && <button onClick={() => setEmailFilter("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="text"
            placeholder="Filter by email…"
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey"
          />
        </div> */}

        {/* Expiry From */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[160px] ${expiryFrom ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Expiry From
            {expiryFrom && <button onClick={() => setExpiryFrom("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="date"
            value={expiryFrom}
            onChange={(e) => setExpiryFrom(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none"
          />
        </div>

        {/* Expiry To */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[160px] ${expiryTo ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Expiry To
            {expiryTo && <button onClick={() => setExpiryTo("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="date"
            value={expiryTo}
            onChange={(e) => setExpiryTo(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none"
          />
        </div>

        {/* Amount Min */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[120px] ${amountMin ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Min Amount
            {amountMin && <button onClick={() => setAmountMin("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amountMin}
            onChange={(e) => setAmountMin(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey"
          />
        </div>

        {/* Amount Max */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[120px] ${amountMax ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Max Amount
            {amountMax && <button onClick={() => setAmountMax("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amountMax}
            onChange={(e) => setAmountMax(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey"
          />
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
