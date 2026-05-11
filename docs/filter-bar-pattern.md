# Filter Bar Pattern — How to Apply to Any Collection

This guide documents the exact pattern used on the **Users page** so it can be replicated on other dashboard collections: `coupons`, `products`, `stores`, `transactions`, `staffs`, `referrals`, `categories`, `modifierGroups`, `logs`, etc.

---

## What Gets Built

A horizontally scrollable filter bar (on mobile/tablet) that wraps to multiple rows on desktop. Each field from the collection's interface becomes a labelled chip with:
- A small UPPERCASE label
- The right input type for the field's data type
- A `×` clear button when active
- A highlighted border (`border-primary`) when a value is set
- A "Clear all" link at the end when any filter is active

Filtering is applied live via `useMemo`. The existing CSV export reads from `filtered` automatically.

---

## Convention

Each collection's filter bar lives in its own component file:

```
app/dashboard/<collection>/components/<Collection>FilterBar.tsx
```

- The **page file** owns all filter state and the `filtered` useMemo
- The **filter component** is purely presentational — no `useState`, no Firebase, no `useMemo`
- State flows down via props; setters flow down as callbacks

Reference: `app/dashboard/users/components/UsersFilterBar.tsx`

---

## Prerequisites

`components/ui/select.tsx` already exists (created for the Users page). Import from it for all dropdown chips.

---

## Step-by-Step for Any Page

### Step 1 — Identify field types from the interface

Open the collection's interface file (e.g. `app/dashboard/coupons/interface/coupon.ts`) and categorise each field:

| Field type | Input to use |
|---|---|
| `string` (free text) | Text chip — `<input type="text">` |
| `string` (fixed set of values) | Dropdown chip — `<Select>` with known options |
| `string` (foreign key, e.g. storeId) | Dropdown chip — `<Select>` populated from store list |
| `Date` / `Timestamp` | Date range chip — two `<input type="date">` |
| `boolean` | Bool chip — `<Select>` with Any / Yes / No |
| `number` | Number range chip — two `<input type="number">` |

---

### Step 2 — Add type aliases inside the component function

```ts
type BoolFilter = "Any" | "Yes" | "No";
type DateRange = { from: string; to: string };
type NumberRange = { min: string; max: string };
```

Place these at the top of the component body, before any `useState` calls.

---

### Step 3 — Add a `dateInRange` helper above the component

Only needed if the interface has `Date` fields. Copy this once per file — it handles Firestore `Timestamp` → `Date` coercion:

```ts
function dateInRange(value: Date | undefined, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (value === undefined || value === null) return false;
  const d: Date =
    typeof (value as unknown as { toDate?: () => Date }).toDate === "function"
      ? (value as unknown as { toDate: () => Date }).toDate()
      : (value as Date);
  if (from && d < new Date(from)) return false;
  if (to) {
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    if (d > toEnd) return false;
  }
  return true;
}
```

---

### Step 4 — Declare one `useState` per filter

Name each state `filter<FieldName>`. Use the type matching the field category:

```ts
// Text fields
const [filterEmail, setFilterEmail] = useState("");
const [filterNotes, setFilterNotes] = useState("");

// Date range fields
const [filterExpiryDate, setFilterExpiryDate] = useState<DateRange>({ from: "", to: "" });
const [filterCreatedAt, setFilterCreatedAt] = useState<DateRange>({ from: "", to: "" });

// Boolean fields
const [filterDisabled, setFilterDisabled] = useState<BoolFilter>("Any");

// Number range fields
const [filterAmount, setFilterAmount] = useState<NumberRange>({ min: "", max: "" });

// Foreign key dropdown — reuse existing state if already present
const [filterStoreId, setFilterStoreId] = useState<string>("All");
```

---

### Step 5 — Add `anyFilterActive` useMemo

This drives the "Clear all" button visibility. Include every filter state:

```ts
const anyFilterActive = useMemo(() => {
  return (
    filterEmail.trim() !== "" ||
    filterNotes.trim() !== "" ||
    filterExpiryDate.from !== "" || filterExpiryDate.to !== "" ||
    filterDisabled !== "Any" ||
    filterAmount.min !== "" || filterAmount.max !== ""
    // add one line per filter
  );
}, [filterEmail, filterNotes, filterExpiryDate, filterDisabled, filterAmount]);
```

---

### Step 6 — Extend the `filtered` useMemo

Inside the existing `.filter()` callback, append one predicate per filter after all existing predicates. Return `false` to exclude a row:

```ts
// Text — partial match
if (filterEmail.trim() && !(u.email ?? "").toLowerCase().includes(filterEmail.trim().toLowerCase())) return false;

// Date range
if (!dateInRange(u.expiryDate, filterExpiryDate.from, filterExpiryDate.to)) return false;

// Boolean
if (filterDisabled !== "Any" && !!u.disabled !== (filterDisabled === "Yes")) return false;

// Number range
if (filterAmount.min !== "") {
  const min = parseFloat(filterAmount.min);
  if (!isNaN(min) && (u.amount ?? 0) < min) return false;
}
if (filterAmount.max !== "") {
  const max = parseFloat(filterAmount.max);
  if (!isNaN(max) && (u.amount ?? 0) > max) return false;
}

// Foreign key exact match
if (filterStoreId !== "All" && u.storeId !== filterStoreId) return false;
```

Add all new filter states to the `useMemo` dependency array.

---

### Step 7 — Add `clearAllFilters` helper

Reset every filter state back to its default. Call `clearSelection()` at the end if the page has bulk selection:

```ts
function clearAllFilters() {
  setFilterEmail("");
  setFilterNotes("");
  setFilterExpiryDate({ from: "", to: "" });
  setFilterCreatedAt({ from: "", to: "" });
  setFilterDisabled("Any");
  setFilterAmount({ min: "", max: "" });
  setFilterStoreId("All");
  clearSelection(); // if page has bulk selection
}
```

---

### Step 8 — Replace the search/filter UI with the filter bar container

Replace whatever existing search input / pill buttons exist with this wrapper:

```tsx
<div className="overflow-x-auto lg:overflow-x-visible">
  <div className="flex items-end gap-2 pb-1 min-w-max lg:min-w-0 lg:flex-wrap">

    {/* chips go here */}

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
```

- **`< lg`**: single row, horizontal scroll
- **`lg+`**: chips wrap to multiple rows

---

### Step 9 — Build each chip

Every chip uses the same outer wrapper. Pick the inner input that matches the field type:

#### Text chip

```tsx
<div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[140px] ${filterEmail ? "border-primary" : "border-border"}`}>
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
```

#### Date range chip

```tsx
<div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[260px] ${filterExpiryDate.from || filterExpiryDate.to ? "border-primary" : "border-border"}`}>
  <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
    Expiry Date
    {(filterExpiryDate.from || filterExpiryDate.to) && (
      <button onClick={() => setFilterExpiryDate({ from: "", to: "" })} className="ml-1 text-light-grey hover:text-black">×</button>
    )}
  </span>
  <div className="flex items-center gap-1">
    <input type="date" value={filterExpiryDate.from}
      onChange={(e) => setFilterExpiryDate((p) => ({ ...p, from: e.target.value }))}
      className="h-7 w-full bg-transparent text-sm text-black outline-none" />
    <span className="shrink-0 text-xs text-light-grey">–</span>
    <input type="date" value={filterExpiryDate.to}
      onChange={(e) => setFilterExpiryDate((p) => ({ ...p, to: e.target.value }))}
      className="h-7 w-full bg-transparent text-sm text-black outline-none" />
  </div>
</div>
```

#### Boolean dropdown chip

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

<div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[120px] ${filterDisabled !== "Any" ? "border-primary" : "border-border"}`}>
  <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
    Disabled
    {filterDisabled !== "Any" && (
      <button onClick={() => setFilterDisabled("Any")} className="ml-1 text-light-grey hover:text-black">×</button>
    )}
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
```

#### Foreign key dropdown chip (e.g. Store)

```tsx
{stores.length > 0 && (
  <div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[160px] ${filterStoreId !== "All" ? "border-primary" : "border-border"}`}>
    <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
      Store
      {filterStoreId !== "All" && (
        <button onClick={() => setFilterStoreId("All")} className="ml-1 text-light-grey hover:text-black">×</button>
      )}
    </span>
    <Select value={filterStoreId} onValueChange={(v) => setFilterStoreId(v)}>
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
```

#### Fixed enum dropdown chip (e.g. Type with known values)

```tsx
<div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[130px] ${filterType !== "All" ? "border-primary" : "border-border"}`}>
  <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
    Type
    {filterType !== "All" && (
      <button onClick={() => setFilterType("All")} className="ml-1 text-light-grey hover:text-black">×</button>
    )}
  </span>
  <Select value={filterType} onValueChange={(v) => setFilterType(v)}>
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="All">All</SelectItem>
      <SelectItem value="referral">Referral</SelectItem>
      <SelectItem value="admin">Admin</SelectItem>
    </SelectContent>
  </Select>
</div>
```

#### Number range chip

```tsx
<div className={`flex flex-col gap-1 rounded-lg border bg-white px-3 py-1.5 min-w-[200px] ${filterAmount.min || filterAmount.max ? "border-primary" : "border-border"}`}>
  <span className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-light-grey">
    Amount ($)
    {(filterAmount.min || filterAmount.max) && (
      <button onClick={() => setFilterAmount({ min: "", max: "" })} className="ml-1 text-light-grey hover:text-black">×</button>
    )}
  </span>
  <div className="flex items-center gap-1">
    <input type="number" min="0" step="0.01" placeholder="Min"
      value={filterAmount.min}
      onChange={(e) => setFilterAmount((p) => ({ ...p, min: e.target.value }))}
      className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey" />
    <span className="shrink-0 text-xs text-light-grey">–</span>
    <input type="number" min="0" step="0.01" placeholder="Max"
      value={filterAmount.max}
      onChange={(e) => setFilterAmount((p) => ({ ...p, max: e.target.value }))}
      className="h-7 w-full bg-transparent text-sm text-black outline-none placeholder:text-light-grey" />
  </div>
</div>
```

---

## Chip Width Reference

| Content | `min-w-` |
|---|---|
| Short text / bool / enum | `min-w-[120px]` – `min-w-[160px]` |
| Longer label text | `min-w-[160px]` – `min-w-[200px]` |
| Date range (two inputs) | `min-w-[260px]` |
| Number range (two inputs) | `min-w-[200px]` |

---

## CSV Export — No Extra Work Needed

`exportToCSV()` already reads from `filtered`. As long as filters update `filtered`, the export reflects them automatically.

---

## Checklist for Each New Page

- [ ] Read the interface file and categorise each field by type
- [ ] Add `dateInRange` helper above the component (only if any `Date` fields exist)
- [ ] Add `BoolFilter`, `DateRange`, `NumberRange` type aliases inside the component
- [ ] Add one `useState` per filter field
- [ ] Add `anyFilterActive` useMemo
- [ ] Extend the existing `filtered` useMemo — new predicates + updated dependency array
- [ ] Add `clearAllFilters` function
- [ ] Replace old search/pill row with the `overflow-x-auto` filter bar container
- [ ] Add one chip per field using the correct template above
- [ ] Add import: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` from `@/components/ui/select`
- [ ] Run `npm run lint` — no new errors

---

## Reference Implementation

Full working example: `app/dashboard/users/page.tsx`  
Select component: `components/ui/select.tsx`
