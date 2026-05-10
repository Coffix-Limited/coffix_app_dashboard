# Ecommerce Admin Data Operations Plan

## Goal

Build controlled bulk import, export, and validation directly into the existing dashboard pages — no new routes, no third-party libraries, no separate admin panel.

Every entity page gains:

1. A constants file defining which fields are protected, importable, exportable, and required.
2. An Export CSV button that exports the currently filtered/displayed records.
3. An Import CSV button (where applicable) that validates every row before writing anything to Firestore.
4. A shared CSV utility used by all pages — no duplication.

This keeps the client in control while protecting Firestore data integrity.

---

## Why No Third-Party Tools or Libraries

Third-party admin tools do not know which fields are protected, which IDs are valid references, or which operations require a server-side API call. Using one creates two admin systems that diverge over time.

Third-party CSV parsing libraries (xlsx, papaparse, etc.) add dependencies that must be audited, updated, and maintained. The existing coupons page already demonstrates a complete, working native CSV implementation using `FileReader` and a single regex. The same pattern scales to all entities.

---

## Existing Infrastructure to Reuse

| What | Where |
|---|---|
| Master import/export pattern | `app/dashboard/coupons/page.tsx` |
| Export-only pattern | `app/dashboard/transactions/page.tsx` |
| Existing export function | `app/dashboard/referrals/page.tsx` |
| Date and currency formatting | `app/utils/formatting.ts` |
| Global constants shape | `app/utils/constant.ts` |
| Constants file shape | `app/dashboard/emailTemplates/constants/emailVariables.ts` |

The coupons page is the reference for all other pages. It already implements: `fileInputRef`, hidden `<input type="file" accept=".csv">`, `FileReader.readAsText`, manual regex CSV parsing, `escapeCSV`, and download via `URL.createObjectURL`.

---

## New Shared CSV Utility

**File:** `app/utils/csvUtils.ts`

Extracts the duplicated CSV logic from coupons and transactions into one place.

```
escapeCSV(v: string): string
  — wraps in double quotes, escapes internal " as ""

parseCSVLine(line: string): string[]
  — regex: line.match(/("(?:[^"]|"")*"|[^,]*)/g)
  — strips surrounding quotes, unescapes "" → "

parseCSVText(text: string): { headers: string[]; rows: string[][] }
  — splits by \n, extracts header row, returns structured result

buildCSVString(headers: string[], rows: string[][]): string
  — joins headers with commas, joins rows, joins all lines with \n

triggerCSVDownload(csvString: string, filename: string): void
  — creates Blob, URL.createObjectURL, anchor click, URL.revokeObjectURL
```

No third-party imports. All logic already exists in the codebase — this file consolidates it.

---

## Constants Files Per Entity

**Path pattern:** `app/dashboard/<entity>/constants/<entity>FieldConstants.ts`

Each file exports four `string[]` arrays whose values exactly match the TypeScript interface field names:

```ts
PROTECTED_FIELDS   // reject entire import file if any CSV header matches
IMPORTABLE_FIELDS  // only these column names are accepted on import
EXPORTABLE_FIELDS  // columns written to CSV on export
REQUIRED_FIELDS    // must have a non-empty value for a row to be accepted
```

---

## Field Classification Per Entity

### AppUser — collection: `customers`

Interface: `app/dashboard/users/interface/user.ts`  
Constants: `app/dashboard/users/constants/userFieldConstants.ts`

| Field | Protected | Importable | Exportable | Required |
|---|---|---|---|---|
| docId | yes | — | yes | — |
| email | yes | — | yes | — |
| creditAvailable | yes | — | yes | — |
| emailVerified | yes | — | yes | — |
| lastLogin | yes | — | yes | — |
| qrId | yes | — | — | — |
| fcmToken | yes | — | — | — |
| appVersion | yes | — | — | — |
| creditExpiry | yes | — | yes | — |
| createdAt | yes | — | yes | — |
| firstName | — | yes | yes | — |
| lastName | — | yes | yes | — |
| nickName | — | yes | yes | — |
| mobile | — | yes | yes | — |
| birthday | — | yes | yes | — |
| suburb | — | yes | yes | — |
| city | — | yes | yes | — |
| preferredStoreId | — | yes | yes | — |
| getPurchaseInfoByMail | — | yes | yes | — |
| getPromotions | — | yes | yes | — |
| allowWinACoffee | — | yes | yes | — |
| disabled | — | yes | yes | — |

**Import mode:** update-only — `docId` is required per row as the lookup key. `docId` is exported so admins can use it, but it cannot be changed.

---

### Product — collection: `products`

Interface: `app/dashboard/products/interface/product.ts`  
Constants: `app/dashboard/products/constants/productFieldConstants.ts`

| Field | Protected | Importable | Exportable | Required |
|---|---|---|---|---|
| docId | yes | — | yes | — |
| name | — | yes | yes | yes (create) |
| price | — | yes | yes | — |
| cost | — | yes | yes | — |
| categoryId | — | yes | yes | — |
| modifierGroupIds | — | yes | yes | — |
| availableToStores | — | yes | yes | — |
| disabledStores | — | yes | yes | — |
| imageUrl | — | yes | yes | — |
| order | — | yes | yes | — |

**Import mode:** create + update — `docId` present means update; absent means create.

Array fields (`modifierGroupIds`, `availableToStores`, `disabledStores`) are serialized as pipe-delimited strings: `id1|id2|id3`.

---

### Store — collection: `stores`

Interface: `app/dashboard/stores/interface/store.ts`  
Constants: `app/dashboard/stores/constants/storeFieldConstants.ts`

| Field | Protected | Importable | Exportable | Required |
|---|---|---|---|---|
| docId | yes | — | yes | — |
| name | — | yes | yes | yes |
| address | — | yes | yes | — |
| email | — | yes | yes | — |
| contactNumber | — | yes | yes | — |
| location | — | yes | yes | — |
| imageUrl | — | yes | yes | — |
| gstNumber | — | yes | yes | — |
| invoiceText | — | yes | yes | — |
| storeCode | — | yes | yes | — |
| printerId | — | yes | yes | — |
| disable | — | yes | yes | — |
| openingHours | — | — | — | — |
| holidayHours | — | — | — | — |

**Import mode:** update-only — `docId` required per row.

`openingHours` and `holidayHours` are excluded from both import and export. They are nested objects that cannot safely round-trip through flat CSV. These fields are managed through the store detail page only.

---

### Coupon — collection: `coupons`

Interface: `app/dashboard/coupons/interface/coupon.ts`  
Constants: `app/dashboard/coupons/constants/couponFieldConstants.ts`

| Field | Protected | Importable | Exportable | Required |
|---|---|---|---|---|
| docId | yes | — | yes | — |
| createdAt | yes | — | yes | — |
| usageCount | yes | — | yes | — |
| userIds | yes | — | yes | — |
| source | yes | — | yes | — |
| referralId | yes | — | yes | — |
| code | — | yes | yes | yes (create) |
| type | — | yes | yes | — |
| amount | — | yes | yes | — |
| expiryDate | — | yes | yes | — |
| storeId | — | yes | yes | — |
| notes | — | yes | yes | — |
| usageLimit | — | yes | yes | — |
| isUsed | — | yes | yes | — |

**Import mode:** create + update — partial implementation already exists in the page and must be retrofitted with protected field enforcement and the preview dialog.

The existing export already includes protected fields for reference visibility — this is intentional. Protected fields are exported but blocked on import.

---

### Staff — collection: `staffs`

Interface: `app/dashboard/staffs/interface/staff.ts`  
Constants: `app/dashboard/staffs/constants/staffFieldConstants.ts`

| Field | Protected | Importable | Exportable | Required |
|---|---|---|---|---|
| docId | yes | — | yes | — |
| email | yes | — | yes | — |
| createdAt | yes | — | yes | — |
| role | — | yes | yes | — |
| storeIds | — | yes | yes | — |
| disabled | — | yes | yes | — |
| firstName | — | yes | yes | — |
| lastName | — | yes | yes | — |

**Import mode:** update-only — `docId` required per row. Creating staff must go through the `/api/staffs` server route which provisions Firebase Auth. CSV import cannot bypass this.

`storeIds` is pipe-delimited. `role` must be `"admin"` or `"store_manager"`.

---

### Transaction — collection: `transactions`

Interface: `app/dashboard/transactions/interface/transaction.ts`  
Constants: `app/dashboard/transactions/constants/transactionFieldConstants.ts`

| Field | Exportable |
|---|---|
| transactionNumber | yes |
| createdAt | yes |
| paymentMethod | yes |
| type | yes |
| customerId | yes |
| amount | yes |
| status | yes |
| orderId | yes |
| gst | yes |
| gstAmount | yes |
| totalAmount | yes |
| recipientEmail | yes |

**Import mode:** export only — all fields are protected. The existing export already exists on the transactions page and should export the currently filtered (`displayed`) set.

---

### Referral — collection: `referrals`

Interface: `app/dashboard/referrals/interface/referral.ts`  
Constants: `app/dashboard/referrals/constants/referralFieldConstants.ts`

| Field | Protected | Importable | Exportable | Required |
|---|---|---|---|---|
| docId | yes | — | yes | — |
| referralTime | yes | — | yes | — |
| referrer | yes | — | yes | — |
| referee | yes | — | yes | — |
| disabled | — | yes | yes | — |

**Import mode:** update-only — `docId` required per row. Only `disabled` can be changed via import.

An export function already exists on the referrals page and must be updated to include `docId` in the exported columns so admins can use it as the lookup key on import.

---

### Category — collection: `productCategories`

Interface: `app/dashboard/products/interface/category.ts`  
Constants: `app/dashboard/categories/constants/categoryFieldConstants.ts`

| Field | Protected | Importable | Exportable | Required |
|---|---|---|---|---|
| docId | yes | — | yes | — |
| name | — | yes | yes | yes (create) |
| order | — | yes | yes | — |

**Import mode:** create + update — `docId` absent means new category; docId is derived via `formatDocId(name)` from `app/utils/formatting.ts`. `docId` present means update existing.

---

### NotificationCampaign — collection: `campaigns`

Interface: `app/dashboard/notifications/interface/notification.ts`  
Constants: `app/dashboard/notifications/constants/notificationFieldConstants.ts`

| Field | Protected | Importable | Exportable | Required |
|---|---|---|---|---|
| docId | yes | — | yes | — |
| createdBy | yes | — | yes | — |
| createdAt | yes | — | yes | — |
| sentAt | yes | — | yes | — |
| name | — | — | yes | — |
| status | — | — | yes | — |
| channels | — | — | yes | — |

**Import mode:** export only — campaigns have complex nested objects (`audience`, `template`, `schedule`) that cannot safely flatten to CSV. Export is a summary of top-level fields only.

---

### EmailTemplate — collection: `emails`

Interface: `app/dashboard/emailTemplates/interface/emailTemplate.ts`  
Constants: `app/dashboard/emailTemplates/constants/emailTemplateFieldConstants.ts`

| Field | Protected | Importable | Exportable | Required |
|---|---|---|---|---|
| docId | yes | — | yes | — |
| updatedAt | yes | — | yes | — |
| updatedBy | yes | — | yes | — |
| name | — | — | yes | — |
| subject | — | — | yes | — |
| notes | — | — | yes | — |

**Import mode:** export only — `content` is HTML and must not be included in CSV as it would corrupt the file and escape handling is unreliable. Template content is edited through the template editor only.

---

### Log — collection: `logs`

Interface: `app/dashboard/logs/interface/log.ts`  
Constants: `app/dashboard/logs/constants/logFieldConstants.ts`

| Field | Exportable |
|---|---|
| docId | yes |
| time | yes |
| page | yes |
| category | yes |
| severityLevel | yes |
| action | yes |
| notes | yes |
| customerId | yes |
| userId | yes |

**Import mode:** export only — all fields are protected. Logs are written by server-side processes and must never be modified through the dashboard.

---

### GlobalSettings — single document

No import or export. Settings are managed exclusively through the global settings form. The document structure is not suited to CSV representation.

---

## Import / Export Summary

| Entity | Import Mode | Export |
|---|---|---|
| Users | update-only | yes |
| Products | create + update | yes |
| Stores | update-only | yes |
| Coupons | create + update | yes |
| Staffs | update-only | yes |
| Transactions | none | yes |
| Referrals | update-only | yes |
| Categories | create + update | yes |
| Notifications | none | summary export |
| Email Templates | none | metadata export |
| Logs | none | yes |
| Global Settings | none | none |

---

## Standard Import Flow

This flow applies to all pages with import support. The coupons page is the reference implementation.

```
1. Hidden <input type="file" accept=".csv"> controlled by fileInputRef
2. "Import CSV" button calls fileInputRef.current?.click()
3. onChange fires handleImportCSV(e)
4. FileReader.readAsText(file)
5. reader.onload:
   a. parseCSVText(text) → { headers, rows }
   b. Filter out empty lines
   c. Check headers against PROTECTED_FIELDS
      → If any match: reject entire file immediately
      → Error: "CSV contains protected columns: [list]. Remove these columns and re-upload."
   d. Check headers against IMPORTABLE_FIELDS
      → Columns not in IMPORTABLE_FIELDS and not docId: warn "Unknown column ignored: [name]"
   e. Check that REQUIRED_FIELDS appear as headers → reject file if missing
   f. For each data row: validate (see Validation Rules section)
   g. Collect errors by row number: { row, field, reason }
6. Show import preview Dialog:
   - Errors section: list of { row, field, reason }
   - Valid rows section: preview of first 10 valid rows
   - "Import N valid rows" button — shown only if valid rows > 0
   - "Cancel" button
7. On confirm: write valid rows to Firestore via existing Service methods
8. fileInputRef.current.value = "" — reset so same file can be re-uploaded after correction
```

If the file has zero valid rows, only the error list is shown. The import button is not rendered.

---

## Standard Export Flow

This flow applies to all pages with export support. The transactions page is the reference for the "export what is currently displayed" pattern.

```
1. "Export CSV" button in the existing page header
2. exportToCSV() — synchronous, no async needed
3. Take the current filtered/displayed array (already computed by useMemo filters on each page)
4. Map each record to EXPORTABLE_FIELDS values in order
5. Serialize values:
   - Array fields → pipe-delimited string: id1|id2|id3
   - Firestore Timestamp → .toDate().toISOString()
   - Boolean → "true" or "false"
   - null / undefined → empty string ""
6. triggerCSVDownload(csvString, `entity-YYYY-MM-DD.csv`)
```

---

## Validation Rules

### Shared Rules (all entities with import)

- **Protected field in headers** → reject entire file before processing any rows
- **Unknown column in headers** → warn and ignore that column; do not reject file
- **Empty required field in a row** → reject that row; include it in the error report

### Users

- `docId` must be present in every row — missing means reject row: "docId required for user update"
- `docId` must match an existing customer in `useUserStore.getState().users`
- `preferredStoreId` if present must match an existing store `docId` in `useStoreStore.getState().stores`
- `birthday` if present must be a valid date: `!isNaN(new Date(value).getTime())`
- `disabled` if present must be `"true"` or `"false"` (case-insensitive)

### Products

- `price` and `cost` if present must be valid non-negative numbers
- `order` if present must be a valid integer
- `categoryId` if present must match an existing category `docId` in `useDashboardStore.getState().categories`
- `availableToStores` and `disabledStores` — each pipe-split ID must match an existing store `docId`
- `modifierGroupIds` — each pipe-split ID must match an existing modifier group `docId` in `useDashboardStore.getState().modifierGroups`
- `docId` present → must match existing product in `useDashboardStore.getState().products`
- `docId` absent → create row; `name` is required

### Stores

- `docId` required per row — reject row if missing or not found in `useStoreStore.getState().stores`

### Coupons

- `amount` if present must be a valid non-negative number
- `expiryDate` if present must be a valid date
- `usageLimit` if present must be a valid non-negative integer
- `storeId` if present must match an existing store `docId`
- `isUsed` if present must be `"true"` or `"false"`
- `type` if present must be a valid coupon type value from the `Coupon` interface
- `docId` present → update existing; absent → create new coupon with `code` required

### Staffs

- `docId` required per row — reject row if missing or not found in `useStaffStore.getState().staffs`
- `role` if present must be `"admin"` or `"store_manager"` (matches `StaffRole` union)
- `storeIds` — each pipe-split ID must match an existing store `docId`
- `disabled` if present must be `"true"` or `"false"`

### Referrals

- `docId` required per row — reject row if missing or not found in `useReferralStore.getState().referrals`
- `disabled` if present must be `"true"` or `"false"`

### Categories

- `order` if present must be a valid number
- `docId` absent → create row; `name` required; docId derived via `formatDocId(name)` from `app/utils/formatting.ts`
- `docId` present → update existing category

---

## Reference Validation — Zustand Stores

All reference checks use `.getState()` on the Zustand stores that are already loaded by `DataInitializer` when the dashboard mounts. No additional Firestore reads are needed.

| Reference Field | Store Access |
|---|---|
| `preferredStoreId`, `storeId`, `storeIds`, `availableToStores`, `disabledStores` | `useStoreStore.getState().stores.map(s => s.docId)` |
| `categoryId` | `useDashboardStore.getState().categories.map(c => c.docId)` |
| `modifierGroupIds` | `useDashboardStore.getState().modifierGroups.map(g => g.docId)` |
| User `docId` lookup | `useUserStore.getState().users.map(u => u.docId)` |
| Product `docId` lookup | `useDashboardStore.getState().products.map(p => p.docId)` |
| Staff `docId` lookup | `useStaffStore.getState().staffs.map(s => s.docId)` |
| Referral `docId` lookup | `useReferralStore.getState().referrals.map(r => r.docId)` |

---

## Files to Create

**Shared utility (required first — all pages depend on it):**
- `app/utils/csvUtils.ts`

**Constants files (one per entity):**
- `app/dashboard/users/constants/userFieldConstants.ts`
- `app/dashboard/products/constants/productFieldConstants.ts`
- `app/dashboard/stores/constants/storeFieldConstants.ts`
- `app/dashboard/coupons/constants/couponFieldConstants.ts`
- `app/dashboard/staffs/constants/staffFieldConstants.ts`
- `app/dashboard/transactions/constants/transactionFieldConstants.ts`
- `app/dashboard/referrals/constants/referralFieldConstants.ts`
- `app/dashboard/categories/constants/categoryFieldConstants.ts`
- `app/dashboard/notifications/constants/notificationFieldConstants.ts`
- `app/dashboard/emailTemplates/constants/emailTemplateFieldConstants.ts`
- `app/dashboard/logs/constants/logFieldConstants.ts`

---

## Files to Modify

| Page File | Change |
|---|---|
| `app/dashboard/users/page.tsx` | Add Export CSV button + Import CSV with full validation |
| `app/dashboard/products/page.tsx` | Add Export CSV button + Import CSV with array field and reference validation |
| `app/dashboard/stores/page.tsx` | Add Export CSV button + Import CSV (update-only, openingHours excluded) |
| `app/dashboard/coupons/page.tsx` | Retrofit existing import: add protected field check + preview dialog; uncomment import button |
| `app/dashboard/staffs/page.tsx` | Add Export CSV button + Import CSV (update-only, role enum validation) |
| `app/dashboard/transactions/page.tsx` | Verify export uses `displayed` (filtered) array — one-line fix if needed |
| `app/dashboard/referrals/page.tsx` | Add `docId` to existing export; add update-only import for `disabled` field |
| `app/dashboard/categories/page.tsx` | Add Export CSV button + Import CSV in existing header area |
| `app/dashboard/notifications/page.tsx` | Add summary Export CSV button |
| `app/dashboard/emailTemplates/page.tsx` | Add metadata Export CSV button |
| `app/dashboard/logs/page.tsx` | Add Export CSV button |

---

## Implementation Sequence

1. `app/utils/csvUtils.ts` — shared utility; everything else imports from here
2. All 11 constants files — pure data, no logic, no dependencies
3. `app/dashboard/coupons/page.tsx` — retrofit master pattern; validates the full flow end-to-end
4. `app/dashboard/logs/page.tsx`, `notifications/page.tsx`, `emailTemplates/page.tsx` — export-only, lowest risk
5. `app/dashboard/referrals/page.tsx` — minimal import (one importable field)
6. `app/dashboard/categories/page.tsx` — small collection, simple validation
7. `app/dashboard/staffs/page.tsx` — update-only import, enum validation
8. `app/dashboard/users/page.tsx` — update-only import, reference validation on preferredStoreId
9. `app/dashboard/products/page.tsx` — most complex: array fields, multi-reference validation
10. `app/dashboard/stores/page.tsx` — update-only import, nested field exclusions
11. `app/dashboard/transactions/page.tsx` — verify filtered export; no import changes

---

## What This Plan Excludes

- No job tracking system — operations are synchronous client-side writes through existing Service methods
- No background workers — all writes go through the existing Firebase SDK service files
- No new routes or pages
- No rollback support — correctness is enforced by pre-import validation before any write occurs
- No audit log writes from import — the `logs` collection is written by server-side Firebase Functions
- No Excel format support — CSV only via native `FileReader`
- No third-party parsing libraries
- No separate admin panel

---

## Adding a New Field in the Future

If a new field needs to be added to an entity:

```
1. Add the field to the TypeScript interface
2. Update the constants file:
   - Decide: protected, importable, exportable, required
   - Add to the appropriate arrays
3. Update validation rules in the page's handleImportCSV if the field needs type or reference checks
4. Update the exportToCSV mapping in the page to include the new field
5. Add a Firestore index if the field will be used for filtering
6. Deploy
```

New fields must never be added arbitrarily through an uploaded CSV. The field must be defined in the interface and constants file first. This prevents inconsistent field names (e.g. `loyaltyTier` vs `loyalty_tier` vs `Loyalty Tier`) from entering Firestore.

---

## Verification

After implementing each entity, test by:

1. Export existing records — verify CSV downloads with correct columns and no missing values
2. Modify an importable field in the CSV — verify the change is applied correctly
3. Add a protected field column — verify the entire file is rejected with a clear error listing the protected column name
4. Leave a required field empty on one row — verify that row is rejected but all other valid rows proceed
5. Enter an invalid reference ID (e.g. a storeId that does not exist) — verify the row is rejected with a descriptive error
6. Confirm import — verify Firestore records are updated only for valid rows
7. Re-export after import — verify the exported data matches what was imported
