"use client";

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type BoolFilter = "Any" | "Yes" | "No";
type DateRange = { from: string; to: string };
type NumberRange = { min: string; max: string };

interface UsersFilterBarProps {
  search: string; setSearch: (v: string) => void;
  filterEmail: string; setFilterEmail: (v: string) => void;
  filterDocId: string; setFilterDocId: (v: string) => void;
  filterMobile: string; setFilterMobile: (v: string) => void;
  filterSuburb: string; setFilterSuburb: (v: string) => void;
  filterCity: string; setFilterCity: (v: string) => void;
  filterQrId: string; setFilterQrId: (v: string) => void;
  filterAppVersion: string; setFilterAppVersion: (v: string) => void;
  storeFilter: string; setStoreFilter: (v: string) => void;
  stores: { docId: string; name?: string }[];
  filterBirthday: DateRange; setFilterBirthday: (v: DateRange | ((p: DateRange) => DateRange)) => void;
  filterCreatedAt: DateRange; setFilterCreatedAt: (v: DateRange | ((p: DateRange) => DateRange)) => void;
  filterLastLogin: DateRange; setFilterLastLogin: (v: DateRange | ((p: DateRange) => DateRange)) => void;
  filterCreditExpiry: DateRange; setFilterCreditExpiry: (v: DateRange | ((p: DateRange) => DateRange)) => void;
  filterEmailVerified: BoolFilter; setFilterEmailVerified: (v: BoolFilter) => void;
  filterDisabled: BoolFilter; setFilterDisabled: (v: BoolFilter) => void;
  filterGetPurchaseInfoByMail: BoolFilter; setFilterGetPurchaseInfoByMail: (v: BoolFilter) => void;
  filterGetPromotions: BoolFilter; setFilterGetPromotions: (v: BoolFilter) => void;
  filterAllowWinACoffee: BoolFilter; setFilterAllowWinACoffee: (v: BoolFilter) => void;
  filterCreditAvailable: NumberRange; setFilterCreditAvailable: (v: NumberRange | ((p: NumberRange) => NumberRange)) => void;
  anyFilterActive: boolean;
  clearAllFilters: () => void;
}

function isoToDdMmYyyy(iso: string): string {
  if (!iso) return "";
  const [yyyy, mm, dd] = iso.split("-");
  if (!yyyy || !mm || !dd) return "";
  return `${dd}/${mm}/${yyyy}`;
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative h-7 w-full">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ colorScheme: "light", color: "transparent" }}
        className="absolute inset-0 w-full h-full bg-transparent text-sm outline-none cursor-pointer"
      />
      <span className="pointer-events-none absolute inset-0 flex items-center text-sm select-none pr-6">
        {value
          ? <span className="text-black">{isoToDdMmYyyy(value)}</span>
          : <span className="text-light-grey text-xs">dd/mm/yyyy</span>
        }
      </span>
    </div>
  );
}

export function UsersFilterBar({
  search, setSearch,
  filterEmail, setFilterEmail,
  filterDocId, setFilterDocId,
  filterMobile, setFilterMobile,
  filterSuburb, setFilterSuburb,
  filterCity, setFilterCity,
  filterQrId, setFilterQrId,
  filterAppVersion, setFilterAppVersion,
  storeFilter, setStoreFilter,
  stores,
  filterBirthday, setFilterBirthday,
  filterCreatedAt, setFilterCreatedAt,
  filterLastLogin, setFilterLastLogin,
  filterCreditExpiry, setFilterCreditExpiry,
  filterEmailVerified, setFilterEmailVerified,
  filterDisabled, setFilterDisabled,
  filterGetPurchaseInfoByMail, setFilterGetPurchaseInfoByMail,
  filterGetPromotions, setFilterGetPromotions,
  filterAllowWinACoffee, setFilterAllowWinACoffee,
  filterCreditAvailable, setFilterCreditAvailable,
  anyFilterActive,
  clearAllFilters,
}: UsersFilterBarProps) {
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
            placeholder="Name, email, mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey"
          />
        </div>

        {/* Email */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[160px] ${filterEmail ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Email
            {filterEmail && <button onClick={() => setFilterEmail("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="text"
            placeholder="contains…"
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey"
          />
        </div>

        {/* Doc ID */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[140px] ${filterDocId ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Doc ID
            {filterDocId && <button onClick={() => setFilterDocId("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="text"
            placeholder="contains…"
            value={filterDocId}
            onChange={(e) => setFilterDocId(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey"
          />
        </div>

        {/* Mobile */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[140px] ${filterMobile ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Mobile
            {filterMobile && <button onClick={() => setFilterMobile("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="text"
            placeholder="contains…"
            value={filterMobile}
            onChange={(e) => setFilterMobile(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey"
          />
        </div>

        {/* Store */}
        {stores.length > 0 && (
          <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[160px] ${storeFilter !== "All" ? "border-primary" : "border-border"}`}>
            <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
              Store
              {storeFilter !== "All" && <button onClick={() => setStoreFilter("All")} className="ml-1 text-light-grey hover:text-black">×</button>}
            </span>
            <Select value={storeFilter} onValueChange={(v) => setStoreFilter(v)}>
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

        {/* Suburb */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[130px] ${filterSuburb ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Suburb
            {filterSuburb && <button onClick={() => setFilterSuburb("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="text"
            placeholder="contains…"
            value={filterSuburb}
            onChange={(e) => setFilterSuburb(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey"
          />
        </div>

        {/* City */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[130px] ${filterCity ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            City
            {filterCity && <button onClick={() => setFilterCity("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="text"
            placeholder="contains…"
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey"
          />
        </div>

        {/* Birthday */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[260px] ${filterBirthday.from || filterBirthday.to ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Birthday
            {(filterBirthday.from || filterBirthday.to) && (
              <button onClick={() => setFilterBirthday({ from: "", to: "" })} className="ml-1 text-light-grey hover:text-black">×</button>
            )}
          </span>
          <div className="flex items-center gap-1">
            <DateInput value={filterBirthday.from} onChange={(v) => setFilterBirthday((p) => ({ ...p, from: v }))} />
            <span className="shrink-0 text-xs text-light-grey">–</span>
            <DateInput value={filterBirthday.to} onChange={(v) => setFilterBirthday((p) => ({ ...p, to: v }))} />
          </div>
        </div>

        {/* Created At */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[260px] ${filterCreatedAt.from || filterCreatedAt.to ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Created At
            {(filterCreatedAt.from || filterCreatedAt.to) && (
              <button onClick={() => setFilterCreatedAt({ from: "", to: "" })} className="ml-1 text-light-grey hover:text-black">×</button>
            )}
          </span>
          <div className="flex items-center gap-1">
            <DateInput value={filterCreatedAt.from} onChange={(v) => setFilterCreatedAt((p) => ({ ...p, from: v }))} />
            <span className="shrink-0 text-xs text-light-grey">–</span>
            <DateInput value={filterCreatedAt.to} onChange={(v) => setFilterCreatedAt((p) => ({ ...p, to: v }))} />
          </div>
        </div>

        {/* Last Login */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[260px] ${filterLastLogin.from || filterLastLogin.to ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Last Login
            {(filterLastLogin.from || filterLastLogin.to) && (
              <button onClick={() => setFilterLastLogin({ from: "", to: "" })} className="ml-1 text-light-grey hover:text-black">×</button>
            )}
          </span>
          <div className="flex items-center gap-1">
            <DateInput value={filterLastLogin.from} onChange={(v) => setFilterLastLogin((p) => ({ ...p, from: v }))} />
            <span className="shrink-0 text-xs text-light-grey">–</span>
            <DateInput value={filterLastLogin.to} onChange={(v) => setFilterLastLogin((p) => ({ ...p, to: v }))} />
          </div>
        </div>

        {/* Credit Expiry */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[260px] ${filterCreditExpiry.from || filterCreditExpiry.to ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Credit Expiry
            {(filterCreditExpiry.from || filterCreditExpiry.to) && (
              <button onClick={() => setFilterCreditExpiry({ from: "", to: "" })} className="ml-1 text-light-grey hover:text-black">×</button>
            )}
          </span>
          <div className="flex items-center gap-1">
            <DateInput value={filterCreditExpiry.from} onChange={(v) => setFilterCreditExpiry((p) => ({ ...p, from: v }))} />
            <span className="shrink-0 text-xs text-light-grey">–</span>
            <DateInput value={filterCreditExpiry.to} onChange={(v) => setFilterCreditExpiry((p) => ({ ...p, to: v }))} />
          </div>
        </div>

        {/* Email Verified */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[140px] ${filterEmailVerified !== "Any" ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Email Verified
            {filterEmailVerified !== "Any" && <button onClick={() => setFilterEmailVerified("Any")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <Select value={filterEmailVerified} onValueChange={(v) => setFilterEmailVerified(v as BoolFilter)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Any">Any</SelectItem>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Disabled */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[120px] ${filterDisabled !== "Any" ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Disabled
            {filterDisabled !== "Any" && <button onClick={() => setFilterDisabled("Any")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <Select value={filterDisabled} onValueChange={(v) => setFilterDisabled(v as BoolFilter)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Any">Any</SelectItem>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Purchase Emails */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[150px] ${filterGetPurchaseInfoByMail !== "Any" ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Purchase Emails
            {filterGetPurchaseInfoByMail !== "Any" && <button onClick={() => setFilterGetPurchaseInfoByMail("Any")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <Select value={filterGetPurchaseInfoByMail} onValueChange={(v) => setFilterGetPurchaseInfoByMail(v as BoolFilter)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Any">Any</SelectItem>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Promotions */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[130px] ${filterGetPromotions !== "Any" ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Promotions
            {filterGetPromotions !== "Any" && <button onClick={() => setFilterGetPromotions("Any")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <Select value={filterGetPromotions} onValueChange={(v) => setFilterGetPromotions(v as BoolFilter)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Any">Any</SelectItem>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Win a Coffee */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[140px] ${filterAllowWinACoffee !== "Any" ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Win a Coffee
            {filterAllowWinACoffee !== "Any" && <button onClick={() => setFilterAllowWinACoffee("Any")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <Select value={filterAllowWinACoffee} onValueChange={(v) => setFilterAllowWinACoffee(v as BoolFilter)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Any">Any</SelectItem>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Credit Available */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[200px] ${filterCreditAvailable.min || filterCreditAvailable.max ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            Credit ($)
            {(filterCreditAvailable.min || filterCreditAvailable.max) && <button onClick={() => setFilterCreditAvailable({ min: "", max: "" })} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <div className="flex items-center gap-1">
            <input type="number" min="0" step="0.01" placeholder="Min" value={filterCreditAvailable.min} onChange={(e) => setFilterCreditAvailable((p) => ({ ...p, min: e.target.value }))} className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey" />
            <span className="shrink-0 text-xs text-light-grey">–</span>
            <input type="number" min="0" step="0.01" placeholder="Max" value={filterCreditAvailable.max} onChange={(e) => setFilterCreditAvailable((p) => ({ ...p, max: e.target.value }))} className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey" />
          </div>
        </div>

        {/* QR ID */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[130px] ${filterQrId ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            QR ID
            {filterQrId && <button onClick={() => setFilterQrId("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="text"
            placeholder="contains…"
            value={filterQrId}
            onChange={(e) => setFilterQrId(e.target.value)}
            className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey"
          />
        </div>

        {/* App Version */}
        <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[130px] ${filterAppVersion ? "border-primary" : "border-border"}`}>
          <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
            App Version
            {filterAppVersion && <button onClick={() => setFilterAppVersion("")} className="ml-1 text-light-grey hover:text-black">×</button>}
          </span>
          <input
            type="text"
            placeholder="e.g. 2.0.1"
            value={filterAppVersion}
            onChange={(e) => setFilterAppVersion(e.target.value)}
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
