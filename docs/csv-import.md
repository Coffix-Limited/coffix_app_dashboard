# CSV Bulk Import

Admins can bulk-create and bulk-update Firestore records by uploading a CSV file from `/dashboard/import`. This document covers the file format, create vs. update logic, per-collection field rules, and error handling.

---

## Create vs. Update: the `docId` column

Every CSV must include a `docId` column. Its value determines what happens to each row:

| `docId` value | Action |
|---|---|
| **blank / empty** | **Create** — system generates a new ID and sets `createdAt` automatically |
| **matches an existing document** | **Update** — system calls `updateDoc` and sets `updatedAt` automatically |
| **does not match any document** | **Error** — row is rejected with a "document not found" message |

All five collections now use auto-generated UUIDs. Always leave `docId` blank when creating new records.

> **Never supply `docId` for new records.** Leave the column blank — the system always generates a random UUID.

---

## Collections in Scope (Phase 1)

| Collection | Firestore name | ID strategy |
|---|---|---|
| Products | `products` | Auto-generated UUID |
| Categories | `productCategories` | Auto-generated UUID |
| Modifiers | `modifiers` | Auto-generated UUID |
| Modifier Groups | `modifierGroups` | Auto-generated UUID |
| Coupons | `coupons` | Auto-generated UUID |

---

## Field Rules per Collection

### Products (`products`)

| Column | Type | Required for create | Notes |
|---|---|---|---|
| `docId` | string | No — leave blank | Leave blank for new records |
| `name` | string | **Yes** | |
| `price` | number | **Yes** | Decimal, e.g. `4.50` |
| `cost` | number | No | Decimal |
| `categoryId` | string | No | Must match an existing category `docId` |
| `modifierGroupIds` | pipe-separated string | No | e.g. `MILK_OPTIONS\|SIZE` |
| `availableToStores` | pipe-separated string | No | Store docIds |
| `disabledStores` | pipe-separated string | No | Store docIds |
| `order` | number | No | Integer sort order |
| `imageUrl` | string | No | Full HTTPS URL |

Do **not** include: `createdAt`, `updatedAt`.

---

### Categories (`productCategories`)

| Column | Type | Required for create | Notes |
|---|---|---|---|
| `docId` | string | No — leave blank | Auto-generated UUID |
| `name` | string | **Yes** | |
| `order` | string | No | Sort order |

---

### Modifiers (`modifiers`)

| Column | Type | Required for create | Notes |
|---|---|---|---|
| `docId` | string | No — leave blank | Auto-generated UUID |
| `label` | string | **Yes** | |
| `groupId` | string | No | Must match an existing modifierGroup `docId` |
| `isDefault` | boolean | No | `true` or `false` |
| `priceDelta` | number | No | Positive or negative decimal |
| `cost` | number | No | Decimal |

---

### Modifier Groups (`modifierGroups`)

| Column | Type | Required for create | Notes |
|---|---|---|---|
| `docId` | string | No — leave blank | Auto-generated UUID |
| `name` | string | **Yes** | |
| `required` | boolean | No | `true` or `false` |
| `modifierIds` | pipe-separated string | No | e.g. `EXTRA_SHOT\|NO_SUGAR` |

---

### Coupons (`coupons`)

| Column | Type | Required for create | Notes |
|---|---|---|---|
| `docId` | string | No — leave blank | Leave blank for new records |
| `code` | string | **Yes** | Must be unique |
| `type` | string | No | e.g. `percentage`, `flat` |
| `amount` | number | No | Decimal |
| `expiryDate` | date | No | ISO 8601: `2026-12-31` |
| `storeId` | string | No | Store docId; blank = all stores |
| `usageLimit` | number | No | Integer |
| `notes` | string | No | Free text |
| `source` | string | No | |

Do **not** include: `usageCount`, `isUsed`, `userIds`, `createdAt` — these are system-managed.

---

## Data Type Formats

| Interface type | Expected CSV format |
|---|---|
| `string` | Plain text |
| `number` | Numeric with `.` as decimal separator, e.g. `4.50` |
| `boolean` | `true` or `false` (case-insensitive) |
| `Date` / `Timestamp` | ISO 8601: `2026-12-31` or `2026-12-31T10:00:00Z` |
| `string[]` (array) | Pipe-separated values in one cell: `ID1\|ID2\|ID3` |

---

## Fields That Must Never Appear in a CSV

These are always managed by the system. Include them in a CSV and the importer will reject the file:

| Field | Why it is off-limits |
|---|---|
| `createdAt` | Auto-set on first write |
| `updatedAt` | Auto-set on every update |
| `usageCount` | Incremented by the app on coupon redemption |
| `isUsed` | Set by the app on coupon redemption |
| `userIds` | Managed by the redemption flow |
| `fcmToken` | Device-managed; set by the mobile app |
| `appVersion` | Device-managed; set by the mobile app |

---

## Import Workflow

### Bulk Create

1. Download the template CSV for your collection from `/dashboard/import`.
2. Fill in all **required** columns. Leave `docId` blank (or omit it for derived-ID collections).
3. Upload. The importer will:
   - Validate all required fields are present and non-empty.
   - Validate data types.
   - Derive formatted IDs where applicable (`formatDocId(name/label)`).
   - Write each row with a new `docId` and `createdAt: Timestamp.now()`.
4. A summary shows how many rows were created and lists any failures with per-row messages.

### Bulk Update

1. Export the current collection from `/dashboard/import` (or note the `docId` values from the list page).
2. Edit only the columns you want to change. **Do not alter `docId`.**
3. Upload. The importer will:
   - Match each row to its Firestore document by `docId`.
   - Call a partial `updateDoc` — only the columns present in the CSV are touched.
   - Set `updatedAt: Timestamp.now()` automatically.
   - Reject rows where `docId` is not found.
4. A summary shows rows updated / rows failed.

### Mixed CSV (create and update in one file)

Rows with a blank `docId` are created; rows with a populated `docId` are updated. Both operations run in the same upload. Firestore `writeBatch` is used internally (max 500 ops per batch; the importer chunks automatically).

---

## Error Handling

| Error | Behaviour |
|---|---|
| Missing required field | Row rejected; rest of batch continues |
| Wrong data type | Row rejected with column name + expected type |
| Unknown `docId` on update | Row rejected with "document not found" |
| Duplicate coupon `code` | Row rejected with "code already exists" |
| Batch exceeds 500 rows | Auto-chunked into multiple batches |
| Firebase write failure | Entire chunk is rolled back; error surfaced to UI |

---

## Out of Scope (future phases)

| Collection | Reason deferred |
|---|---|
| Users / Customers | Update-only (no CSV creation — auth creates the account); PII policy to be confirmed |
| Stores | Nested `openingHours` / `holidayHours` structure needs a dedicated sub-template |
| Staff | Requires Firebase Auth user creation; CSV import is not suitable |
| Transactions / Orders | System-generated; should never be manually imported |
| Export to CSV | Planned as a companion feature to the import flow |
