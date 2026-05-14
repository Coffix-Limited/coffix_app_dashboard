# Bulk import, bulk update & saved filters

## Goal

Let **Admins** (and where allowed, **Store Managers**) work on Coffix tables — `products`, `stores`, `categories`, `modifierGroups`, `coupons`, etc. — with three power-user features:

1. **Bulk import** — upload a CSV/XLSX file to **add** or **update** many rows in Firestore at once.
2. **Bulk update** — select rows in a table and change a field (price, category, availability…) on all of them in one click.
3. **Filter, sort & saved views** — apply column filters and sorts, then **save them with a name** ("Auckland — out of stock", "Below cost margin", etc.) so the same view can be reopened with one click.

Some fields (notably **user email**, Auth `uid`, `docId`, `createdAt`) **must never** be mutated by an import. The system needs **per-collection field policies** that the importer and the bulk-edit UI both respect.

---

## About Rowy — can we just embed it?

**Rowy** ([rowy.io](https://rowy.io)) is an open-source, Airtable-style UI on top of Firestore. It already covers most of what's being asked: spreadsheet view, CSV import, bulk edits, filters, derivatives, and Cloud Function actions.

**Can it be embedded as a webview / iframe inside Coffix?** Practically, **no**:

- Rowy Cloud sets `X-Frame-Options: DENY` / `frame-ancestors` CSP, so the hosted app refuses to load inside an `<iframe>` from `coffix.app` (or any other origin).
- Rowy authenticates via its **own** Firebase project / Google sign-in. Even if the frame loaded, the user would have to sign in **again** and would not share Coffix's session.
- Rowy ships its own **role/permission** model. Coffix already has Admin / Store Manager (`staffs/{uid}`) — embedding Rowy would mean **two systems of truth** for who can edit what, and Rowy can't enforce Coffix's "email is immutable" rule on its own.
- Self-hosting Rowy on a Coffix subdomain (`rowy.coffix.app`) **does** unblock framing, but the auth + permissions duplication remain.

### Recommendation

| Option | When to use |
|---|---|
| **A. Build the feature natively in Coffix** *(recommended)* | You want one consistent UI, one auth session, and field-level rules (locked email, role-aware bulk edits, store-scoped filters). |
| **B. Self-host Rowy on `rowy.coffix.app` and link to it** | Internal back-office only, dev-team usage, you do **not** need to enforce Coffix-specific field rules. Open it in a new tab — not an iframe. |
| **C. Use Rowy for one-off data ops** | Migrations or seed data; not exposed to the client. |

The rest of this doc assumes **Option A**.

---

## Where the UI lives

Each existing dashboard table page gets three additions in its toolbar:

```
[ + Add ]  [ Import ]  [ Bulk edit (3) ]   [ Filter ▾ ]  [ Sort ▾ ]  [ Views ▾ ]
```

```
app/dashboard/<collection>/
├── page.tsx                  // table view (already exists)
├── components/
│   ├── ImportDialog.tsx      // upload + preview + commit
│   ├── BulkEditDialog.tsx    // change one field on N selected rows
│   ├── FilterBar.tsx         // column filters + sort controls
│   └── SavedViewsMenu.tsx    // load / save / delete views
├── service/
│   ├── import.ts             // parse, validate, write batches
│   ├── bulkEdit.ts           // batched updates for selected ids
│   └── savedViews.ts         // CRUD on user_views/{uid}/views/{viewId}
├── policy/
│   └── <collection>.policy.ts  // per-collection field policy (see below)
└── store/                    // Zustand: selectedIds, activeFilter, activeSort
```

---

## Field policies — the core safety rule

Every importable / bulk-editable collection declares a **policy** that the importer **and** the bulk-edit UI consult. The policy answers, for each field:

- Can it be **set** on import? (create only? update only? never?)
- Can it be **bulk-edited**?
- Required on create?
- Validator (zod) — type, range, enum, regex.

```typescript
// app/dashboard/products/policy/product.policy.ts
import { z } from "zod";

export const productPolicy = {
  collection: "products",
  fields: {
    docId:               { create: false, update: false, bulkEdit: false }, // immutable id
    name:                { create: true,  update: true,  bulkEdit: false, required: true,
                            schema: z.string().min(1).max(120) },
    price:               { create: true,  update: true,  bulkEdit: true,
                            schema: z.number().nonnegative() },
    cost:                { create: true,  update: true,  bulkEdit: true,
                            schema: z.number().nonnegative() },
    categoryId:          { create: true,  update: true,  bulkEdit: true,
                            schema: z.string() },
    availableToStores:   { create: true,  update: true,  bulkEdit: true,
                            schema: z.array(z.string()) },
    imageUrl:            { create: true,  update: true,  bulkEdit: false,
                            schema: z.string().url().optional() },
  },
} as const;
```

```typescript
// app/dashboard/users/policy/user.policy.ts  (the strict one)
export const userPolicy = {
  collection: "staffs",
  fields: {
    uid:        { create: false, update: false, bulkEdit: false }, // Auth uid — never touched
    email:      { create: true,  update: false, bulkEdit: false }, // EMAIL IS LOCKED after create
    role:       { create: true,  update: true,  bulkEdit: true,
                    schema: z.enum(["admin", "store_manager"]) },
    storeIds:   { create: true,  update: true,  bulkEdit: true,
                    schema: z.array(z.string()) },
    disabled:   { create: true,  update: true,  bulkEdit: true,
                    schema: z.boolean() },
    createdAt:  { create: false, update: false, bulkEdit: false }, // server-set
  },
} as const;
```

The importer **silently strips** any column whose `update: false` is hit on an existing doc, and reports it in the preview ("`email` ignored on 12 rows because the user already exists"). New columns not in the policy are rejected.

> **Why centralise this?** The same policy file feeds the importer, the bulk-edit dropdown (only fields with `bulkEdit: true` show up), the inline cell editor, and — eventually — the Firestore security rules. One source of truth, no drift.

---

## 1. Bulk import (CSV / XLSX)

### User flow

1. **Upload** — Admin clicks **Import**, drops a `.csv` or `.xlsx` file.
2. **Map columns** — auto-match by header name; user fixes mismatches.
3. **Pick mode**:
   - **Insert only** — every row becomes a new doc.
   - **Update only** — every row must already exist (matched by `docId` or a chosen unique field, e.g. `email`, `storeCode`).
   - **Upsert** — update if matched, insert otherwise.
4. **Preview** — table shows: ✅ valid, ✏️ will update, ➕ will create, ❌ rejected (with reason). Locked-field changes show as "ignored".
5. **Commit** — write happens in batches, with a progress bar.
6. **Result** — toast + downloadable error report for rejected rows.

### Libraries

| Need | Pick |
|---|---|
| Parse CSV (streaming) | **`papaparse`** |
| Parse XLSX | **`xlsx`** (SheetJS) |
| Schema validation | **`zod`** (already idiomatic for this stack) |
| Table rendering / selection / column filters / sorting | **`@tanstack/react-table`** |
| Toasts | `sonner` (already installed) |

### Firestore write strategy

- Use **`writeBatch`** — **500 ops per batch** is the hard limit. Chunk the rows.
- Run batches **sequentially** (not in parallel) to stay well under the 10 000 writes/sec/collection soft limit and to keep error reporting deterministic.
- For **upsert by external key** (e.g. `storeCode`), do a **`getDocs` lookup first** in pages of 30 (`where(key, "in", [...])`), then write.
- All writes go through a **server route** (`app/api/import/<collection>/route.ts`) that runs under `firebase-admin` so security-rule complexity stays minimal and the client cannot bypass the policy.

### Server route shape

```typescript
// app/api/import/products/route.ts
export async function POST(req: Request) {
  const { rows, mode } = await req.json();          // already-parsed rows
  await assertAdmin(req);                           // staffs/{uid}.role === "admin"
  const result = await runImport({
    policy: productPolicy,
    rows,
    mode,                                            // "insert" | "update" | "upsert"
    matchField: "docId",                             // or "name" / "storeCode" / "email"
  });
  return Response.json(result);                     // { created, updated, skipped, errors }
}
```

### Audit

Every import writes one summary doc to `audit_logs/{autoId}`:

```json
{
  "actorUid": "uid_admin_123",
  "action": "import",
  "collection": "products",
  "mode": "upsert",
  "fileName": "products-2026-05.csv",
  "counts": { "created": 12, "updated": 84, "skipped": 3, "errors": 1 },
  "lockedFieldHits": { "email": 0, "uid": 0 },
  "createdAt": "<server timestamp>"
}
```

---

## 2. Bulk update (selected rows)

1. User filters / selects N rows in the table (checkboxes via TanStack Table row selection).
2. Clicks **Bulk edit** — dialog shows **only fields with `bulkEdit: true`** in the policy.
3. Picks a field, enters / picks the new value (validated by the same `zod` schema).
4. Confirm dialog: *"Update `price` on **42** products to `5.50`?"*
5. Server route writes via `writeBatch` (chunked at 500), returns counts.
6. Audit log entry: `action: "bulk_update"`, with the affected `docIds` and the diff.

This intentionally **shares the same policy file and the same validators** as the importer. No code path can update `email` because no code path is allowed to.

---

## 3. Filter, sort & **saved views**

### Filter & sort UX

- TanStack Table column filters: text contains, number range, select (enum), boolean.
- Multi-column sort with shift-click (TanStack supports this out of the box).
- Filter state is held in the page's Zustand store and reflected in the URL as `?view=<id>` or `?f=<base64>` so views are shareable / bookmarkable.

### Saved views — Firestore shape

Per-user views (private) live under the signed-in user, with an optional `shared: true` flag for team-wide views. Admins can mark a view as shared.

```
user_views/{uid}/views/{viewId}
  {
    "name": "Auckland — out of stock",
    "collection": "products",
    "filters": [
      { "field": "availableToStores", "op": "array-contains", "value": "store_akl_01" },
      { "field": "price",             "op": "<",              "value": 1 }
    ],
    "sort":     [ { "field": "name", "dir": "asc" } ],
    "columns":  ["name", "price", "categoryId", "availableToStores"],
    "shared":   false,
    "createdAt": "<server timestamp>",
    "updatedAt": "<server timestamp>"
  }
```

Shared views (visible to all dashboard users for that collection):

```
shared_views/{viewId}
  { ...same shape, "createdBy": "<uid>", "shared": true }
```

### Operations

| Action | Where |
|---|---|
| **Save current view** | Toolbar **Views ▾ → Save as…** — prompts for a name, writes to `user_views/{uid}/views/{autoId}`. |
| **Update existing** | **Views ▾ → \[view name\] → Save changes** — overwrites in place. |
| **Load** | Click a view in the menu — store rehydrates filters/sort/columns; URL updates to `?view=<id>`. |
| **Share** *(Admin)* | Toggle on the view — copies it into `shared_views/`. |
| **Delete** | Owner or Admin only. |

### "Last used" view

Persist the last opened view per user under `user_views/{uid}` itself:

```json
{ "lastView": { "products": "viewId_xyz", "stores": "viewId_abc" } }
```

So returning to **Products** opens the previous filter automatically.

---

## Permissions matrix

| Action                                | Admin | Store Manager |
|---------------------------------------|:-----:|:-------------:|
| Import `products`, `categories`, `modifierGroups`, `coupons` | ✅ | ❌ |
| Import `stores` (add new branches)    | ✅ | ❌ |
| Import `staffs` (users)               | ✅ | ❌ |
| Bulk-edit `price`, `cost`, `categoryId` | ✅ | ❌ (uses inline edits) |
| Bulk-edit `disabledStores` (their store(s) only) | ✅ | ✅ — scoped |
| Bulk-edit `email`, `uid`, `createdAt` | ❌ — locked by policy | ❌ |
| Save **personal** views               | ✅ | ✅ |
| Save **shared** views                 | ✅ | ❌ |

---

## Build order (suggested)

1. **Policy files** for `products`, `stores`, `categories`, `modifierGroups` (no users yet).
2. **`@tanstack/react-table` + FilterBar** wired into one page (`products`) — column filters + multi-sort + URL sync.
3. **SavedViews** — Firestore CRUD + the **Views ▾** menu. Ship without sharing first.
4. **Bulk edit** dialog (reuses policy & zod). Cap at one field at a time initially.
5. **Import** — start with **CSV → preview → upsert by `docId`** for `products`. Add XLSX, then external-key matching, then `stores`.
6. **Audit log** + error-report download.
7. **Users (`staffs`) importer** — last, because of the strict email-immutability and Auth-side coupling (creating a new user requires `firebase-admin` `createUser`).

---

## Notes & gotchas

- **Email immutability for users** is enforced in **two** places: the policy (UI / importer rejects it) **and** the Firestore rules (server-side). Never rely on the UI alone.
- **Excel "scientific notation"** silently corrupts long numeric IDs (`storeCode`, barcodes). Always parse those columns as **strings**; show a warning if Excel auto-converted them.
- **Duplicate detection** during import uses the chosen match field — flag rows that match more than one existing doc and reject them rather than guessing.
- **`Timestamp` columns** in CSV: accept ISO 8601 only; convert to `Timestamp.fromDate(new Date(value))` server-side. Reject everything else with a clear error.
- **Image fields** (`imageUrl`) — the importer accepts URLs only. Uploading binary images in bulk is a separate feature (drop-folder + Storage), not part of this doc.
- **Undo** — `writeBatch` has no rollback. Mitigation: the audit log stores the previous values for bulk updates so a "revert this run" action can be added later.
