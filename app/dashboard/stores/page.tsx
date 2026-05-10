"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { useStoreStore } from "./store/useStoreStore";
import { isStoreOpenAt, DayHours } from "./interface/store";
import { StoreService } from "./service/StoreService";
import {
  STORE_PROTECTED_FIELDS,
  STORE_IMPORTABLE_FIELDS,
} from "./constants/storeFieldConstants";
import { escapeCSV, parseCSVText, triggerCSVDownload } from "@/app/utils/csvUtils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type Day = typeof DAYS[number];

type DayHoursForm = {
  isOpen: boolean;
  open: string;
  close: string;
};

type StoreForm = {
  name: string;
  email: string;
  contactNumber: string;
  location: string;
  address: string;
  imageUrl: string;
  gstNumber: string;
  invoiceText: string;
  printerId: string;
  openingHours: Record<Day, DayHoursForm>;
};

const defaultDayHours: DayHoursForm = { isOpen: false, open: "08:00", close: "22:00" };

const emptyForm: StoreForm = {
  name: "",
  email: "",
  contactNumber: "",
  location: "",
  address: "",
  imageUrl: "",
  gstNumber: "",
  invoiceText: "",
  printerId: "",
  openingHours: Object.fromEntries(DAYS.map((d) => [d, { ...defaultDayHours }])) as Record<Day, DayHoursForm>,
};

const REQUIRED: (keyof Omit<StoreForm, "openingHours">)[] = [
  "name", "email", "contactNumber", "location", "address",
];

export default function StoresPage() {
  const stores = useStoreStore((s) => s.stores);
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Open" | "Closed" | "Disabled">("All");
  type StoreSortKey = "name" | "status";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<StoreSortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: StoreSortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = stores.filter((s) => {
      if (statusFilter !== "All") {
        const disabled = s.disable ?? false;
        const open = !disabled && isStoreOpenAt(s);
        const storeStatus = disabled ? "Disabled" : open ? "Open" : "Closed";
        if (storeStatus !== statusFilter) return false;
      }
      if (q) {
        return (
          (s.name ?? "").toLowerCase().includes(q) ||
          (s.email ?? "").toLowerCase().includes(q) ||
          (s.contactNumber ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = (a.name ?? "").localeCompare(b.name ?? "");
      } else {
        const getStatus = (s: typeof a) => {
          if (s.disable) return "Disabled";
          return isStoreOpenAt(s) ? "Open" : "Closed";
        };
        cmp = getStatus(a).localeCompare(getStatus(b));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [stores, search, statusFilter, sortKey, sortDir]);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<StoreForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof StoreForm, boolean>>>({});
  const [loading, setLoading] = useState(false);

  type ImportError = { row: number; field: string; reason: string };
  type ImportPreview = { validRows: Record<string, string>[]; errors: ImportError[] } | null;
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview>(null);
  const [showImportInfo, setShowImportInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setField<K extends keyof Omit<StoreForm, "openingHours">>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: false }));
  }

  function setDayHours(day: Day, patch: Partial<DayHoursForm>) {
    setForm((f) => ({
      ...f,
      openingHours: {
        ...f.openingHours,
        [day]: { ...f.openingHours[day], ...patch },
      },
    }));
  }

  function closeDialog() {
    setShowCreate(false);
    setForm(emptyForm);
    setErrors({});
  }

  function exportToCSV() {
    const headers = ["docId", "name", "address", "email", "contactNumber", "location", "imageUrl", "gstNumber", "invoiceText", "storeCode", "printerId", "disable"];
    const rows = displayed.map((s) =>
      [
        escapeCSV(s.docId ?? ""),
        escapeCSV(s.name ?? ""),
        escapeCSV(s.address ?? ""),
        escapeCSV(s.email ?? ""),
        escapeCSV(s.contactNumber ?? ""),
        escapeCSV(s.location ?? ""),
        escapeCSV(s.imageUrl ?? ""),
        escapeCSV(s.gstNumber ?? ""),
        escapeCSV(s.invoiceText ?? ""),
        escapeCSV(s.storeCode ?? ""),
        escapeCSV(s.printerId ?? ""),
        String(s.disable ?? false),
      ].join(",")
    );
    triggerCSVDownload([headers.join(","), ...rows].join("\n"), `stores-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const { headers, rows } = parseCSVText(text);

        const protectedInFile = headers.filter((h) =>
          (STORE_PROTECTED_FIELDS as readonly string[]).includes(h)
        );
        if (protectedInFile.length > 0) {
          toast.error(`CSV contains protected columns: ${protectedInFile.join(", ")}. Remove them and re-upload.`);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        const existingStoreIds = useStoreStore.getState().stores.map((s) => s.docId);
        const validImportCols = new Set([...(STORE_IMPORTABLE_FIELDS as readonly string[]), "docId"]);

        const validRows: Record<string, string>[] = [];
        const errors: ImportError[] = [];

        rows.forEach((cols, idx) => {
          const rowNum = idx + 2;
          const row: Record<string, string> = {};
          headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });

          headers.filter((h) => !validImportCols.has(h)).forEach((col) =>
            errors.push({ row: rowNum, field: col, reason: `Unknown column "${col}" will be ignored` })
          );

          let hasError = false;

          if (!row.docId) {
            errors.push({ row: rowNum, field: "docId", reason: "docId is required to identify the store" });
            hasError = true;
          } else if (!existingStoreIds.includes(row.docId)) {
            errors.push({ row: rowNum, field: "docId", reason: "Store not found — cannot update" });
            hasError = true;
          }

          if (row.disable !== undefined && row.disable !== "" &&
            !["true", "false"].includes(row.disable.toLowerCase())) {
            errors.push({ row: rowNum, field: "disable", reason: 'Must be "true" or "false"' });
            hasError = true;
          }

          if (!hasError) validRows.push(row);
        });

        setImportPreview({ validRows, errors });
      } catch {
        toast.error("Failed to read CSV file.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  }

  async function handleConfirmImport() {
    if (!importPreview || importPreview.validRows.length === 0) return;
    setImportLoading(true);
    try {
      let count = 0;
      for (const row of importPreview.validRows) {
        const update: Record<string, unknown> = {};
        if (row.name !== undefined && row.name !== "") update.name = row.name;
        if (row.address !== undefined && row.address !== "") update.address = row.address;
        if (row.email !== undefined && row.email !== "") update.email = row.email;
        if (row.contactNumber !== undefined && row.contactNumber !== "") update.contactNumber = row.contactNumber;
        if (row.location !== undefined && row.location !== "") update.location = row.location;
        if (row.imageUrl !== undefined) update.imageUrl = row.imageUrl || null;
        if (row.gstNumber !== undefined) update.gstNumber = row.gstNumber || null;
        if (row.invoiceText !== undefined) update.invoiceText = row.invoiceText || null;
        if (row.storeCode !== undefined) update.storeCode = row.storeCode;
        if (row.printerId !== undefined) update.printerId = row.printerId;
        if (row.disable !== undefined && row.disable !== "") update.disable = row.disable.toLowerCase() === "true";
        await StoreService.updateStore(row.docId, update);
        count++;
      }
      toast.success(`Updated ${count} store${count !== 1 ? "s" : ""}.`);
      setImportPreview(null);
    } catch {
      toast.error("Failed to import stores.");
    } finally {
      setImportLoading(false);
    }
  }

  async function handleCreate() {
    const newErrors = Object.fromEntries(
      REQUIRED.map((k) => [k, !(form[k] as string).trim()]),
    ) as Partial<Record<keyof StoreForm, boolean>>;

    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors);
      toast.error("Please fill in all required fields.");
      return;
    }

    const openingHours: Record<string, DayHours> = Object.fromEntries(
      DAYS.map((day) => {
        const { isOpen, open, close } = form.openingHours[day];
        return [day, { isOpen, open, close }];
      }),
    );

    setErrors({});
    setLoading(true);
    try {
      await StoreService.createStore({
        name: form.name.trim(),
        email: form.email.trim(),
        contactNumber: form.contactNumber.trim(),
        location: form.location.trim(),
        address: form.address.trim(),
        imageUrl: form.imageUrl.trim() || null,
        gstNumber: form.gstNumber.trim() || null,
        invoiceText: form.invoiceText.trim() || null,
        printerId: form.printerId.trim() || undefined,
        openingHours,
        disable: false,
      });
      toast.success("Store created successfully.");
      closeDialog();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create store. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black">Stores</h1>
          <p className="mt-1 text-sm text-light-grey">
            {stores.length} store{stores.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
<Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportInfo(true)}
            disabled={importLoading}
          >
            {importLoading ? "Importing…" : "Import CSV"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={displayed.length === 0}
          >
            Export CSV
          </Button>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80"
          >
            + New Store
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search stores…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-lg border border-border bg-white px-3 text-sm text-black outline-none placeholder:text-light-grey focus:border-primary sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          {(["All", "Open", "Closed", "Disabled"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${statusFilter === v ? "border-primary bg-primary text-white" : "border-border text-black "}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-(--shadow)">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              <th
                onClick={() => toggleSort("name")}
                className="cursor-pointer select-none px-5 py-3 text-left font-medium text-light-grey hover:text-black"
              >
                Store {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : <span className="opacity-30">↕</span>}
              </th>
              <th className="px-5 py-3 text-left font-medium text-light-grey">Contact</th>
              <th className="px-5 py-3 text-left font-medium text-light-grey">Printer ID</th>
              <th
                onClick={() => toggleSort("status")}
                className="cursor-pointer select-none px-5 py-3 text-left font-medium text-light-grey hover:text-black"
              >
                Status {sortKey === "status" ? (sortDir === "asc" ? "↑" : "↓") : <span className="opacity-30">↕</span>}
              </th>
              <th className="px-5 py-3 text-left font-medium text-light-grey">Disabled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-light-grey">
                  No stores found.
                </td>
              </tr>
            ) : (
              displayed.map((store) => {
                const isOpen = isStoreOpenAt(store);
                const isDisabled = store.disable ?? false;

                return (
                  <tr
                    key={store.docId}
                    onClick={() => router.push(`/dashboard/stores/${store.docId}`)}
                    className="cursor-pointer transition-colors hover:bg-background"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {store.imageUrl ? (
                          <Image
                            src={store.imageUrl}
                            alt={store.name ?? "Store"}
                            width={36}
                            height={36}
                            className="rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-soft-grey text-xs font-bold text-light-grey">
                            {(store.name ?? "?")[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-black">{store.name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="space-y-0.5">
                        <p className="text-black">{store.email ?? "—"}</p>
                        <p className="text-xs text-light-grey">{store.contactNumber ?? "—"}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-black">{store.printerId ?? "—"}</td>
                    <td className="px-5 py-3">
                      <Button
                        size="xs"
                        variant={isDisabled ? "secondary" : isOpen ? "solid-success" : "destructive"}
                        className="rounded-full pointer-events-none"
                      >
                        {isDisabled ? "Disabled" : isOpen ? "Open" : "Closed"}
                      </Button>
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="xs"
                        variant={isDisabled ? "solid-error" : "solid-success"}
                        onClick={() => StoreService.updateStore(store.docId, { disable: !isDisabled })}
                        className="rounded-full"
                      >
                        {isDisabled ? "Disabled" : "Enabled"}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Store Dialog */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeDialog}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border px-6 py-4">
              <h3 className="text-lg font-semibold text-black">New Store</h3>
            </div>

            <div className="max-h-[72vh] overflow-y-auto px-6 py-4 space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs text-light-grey">Name *</label>
                  <input
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-black outline-none focus:border-primary ${errors.name ? "border-error" : "border-border"}`}
                    placeholder="e.g. Main Branch"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                  />
                  {errors.name && <p className="mt-1 text-xs text-error">Name is required.</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-light-grey">Image URL</label>
                  <input
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-black outline-none focus:border-primary"
                    placeholder="https://..."
                    value={form.imageUrl}
                    onChange={(e) => setField("imageUrl", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-light-grey">Email *</label>
                  <input
                    type="email"
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-black outline-none focus:border-primary ${errors.email ? "border-error" : "border-border"}`}
                    placeholder="store@coffix.com"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                  {errors.email && <p className="mt-1 text-xs text-error">Required.</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-light-grey">Contact Number *</label>
                  <input
                    type="tel"
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-black outline-none focus:border-primary ${errors.contactNumber ? "border-error" : "border-border"}`}
                    placeholder="+63 9XX XXX XXXX"
                    value={form.contactNumber}
                    onChange={(e) => setField("contactNumber", e.target.value)}
                  />
                  {errors.contactNumber && <p className="mt-1 text-xs text-error">Required.</p>}
                </div>

                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs text-light-grey">Location *</label>
                  <input
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-black outline-none focus:border-primary ${errors.location ? "border-error" : "border-border"}`}
                    placeholder="e.g. Makati City"
                    value={form.location}
                    onChange={(e) => setField("location", e.target.value)}
                  />
                  {errors.location && <p className="mt-1 text-xs text-error">Required.</p>}
                </div>

                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs text-light-grey">Address *</label>
                  <input
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-black outline-none focus:border-primary ${errors.address ? "border-error" : "border-border"}`}
                    placeholder="e.g. 123 Ayala Ave, Makati"
                    value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                  />
                  {errors.address && <p className="mt-1 text-xs text-error">Required.</p>}
                </div>

                <div className="col-span-2">
                  <label className="mb-1.5 block text-xs text-light-grey">Address *</label>
                  <input
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-black outline-none focus:border-primary ${errors.address ? "border-error" : "border-border"}`}
                    placeholder="e.g. TUR, AUK"
                    value={form.address}
                    onChange={(e) => setField("address", e.target.value)}
                  />
                  {errors.address && <p className="mt-1 text-xs text-error">Required.</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-light-grey">GST Number</label>
                  <input
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-black outline-none focus:border-primary"
                    placeholder="Optional"
                    value={form.gstNumber}
                    onChange={(e) => setField("gstNumber", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-light-grey">Invoice Text</label>
                  <input
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-black outline-none focus:border-primary"
                    placeholder="Optional"
                    value={form.invoiceText}
                    onChange={(e) => setField("invoiceText", e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-light-grey">Printer ID</label>
                  <input
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm text-black outline-none focus:border-primary"
                    placeholder="Optional"
                    value={form.printerId}
                    onChange={(e) => setField("printerId", e.target.value)}
                  />
                </div>
              </div>

              {/* Opening Hours */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-light-grey">Opening Hours</p>
                <div className="overflow-hidden rounded-lg border border-border">
                  {DAYS.map((day, i) => {
                    const hours = form.openingHours[day];
                    return (
                      <div
                        key={day}
                        className={`flex items-center gap-3 px-3 py-2.5 ${i !== DAYS.length - 1 ? "border-b border-border" : ""} ${!hours.isOpen ? "opacity-50" : ""}`}
                      >
                        <label className="flex w-28 shrink-0 cursor-pointer items-center gap-2 text-sm font-medium text-black capitalize">
                          <input
                            type="checkbox"
                            checked={hours.isOpen}
                            onChange={(e) => setDayHours(day, { isOpen: e.target.checked })}
                            className="accent-primary"
                          />
                          {day}
                        </label>
                        <input
                          type="time"
                          disabled={!hours.isOpen}
                          value={hours.open}
                          onChange={(e) => setDayHours(day, { open: e.target.value })}
                          className="rounded-md border border-border px-2 py-1 text-xs text-black outline-none focus:border-primary disabled:cursor-not-allowed"
                        />
                        <span className="text-xs text-light-grey">to</span>
                        <input
                          type="time"
                          disabled={!hours.isOpen}
                          value={hours.close}
                          onChange={(e) => setDayHours(day, { close: e.target.value })}
                          className="rounded-md border border-border px-2 py-1 text-xs text-black outline-none focus:border-primary disabled:cursor-not-allowed"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <button
                onClick={closeDialog}
                className="rounded-lg border border-border px-4 py-2 text-sm text-black hover:bg-soft-grey"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
              >
                {loading ? "Creating…" : "Create Store"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Field Guide Dialog */}
      <Dialog open={showImportInfo} onOpenChange={setShowImportInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>CSV Import Guide — Stores</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <p className="font-medium text-black">Editable fields</p>
              <div className="flex flex-wrap gap-1.5">
                {(["name", "address", "email", "contactNumber", "location", "imageUrl", "gstNumber", "invoiceText", "storeCode", "printerId", "disable"] as const).map((f) => (
                  <span key={f} className="rounded-md bg-background border border-border px-2 py-0.5 text-xs text-black font-mono">{f}</span>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="font-medium text-black">Required fields <span className="text-xs font-normal text-light-grey">(for new rows)</span></p>
              <p className="text-xs text-light-grey">None — every row must include an existing <span className="font-mono text-black">docId</span>.</p>
            </div>
            <p className="text-xs text-light-grey leading-relaxed">
              This entity is <span className="font-medium text-black">update-only</span>. Every row must include a valid <span className="font-mono text-black">docId</span>. The <span className="font-mono text-black">disable</span> field accepts <span className="font-mono text-black">true</span> or <span className="font-mono text-black">false</span>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportInfo(false)}>Cancel</Button>
            <Button onClick={() => { setShowImportInfo(false); fileInputRef.current?.click(); }}>
              Choose File →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={importPreview !== null} onOpenChange={() => setImportPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {importPreview && importPreview.errors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-black">Errors</p>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-background p-3 space-y-1">
                  {importPreview.errors.map((e, i) => (
                    <p key={i} className="text-xs text-black">
                      <span className="font-medium">Row {e.row}</span> — {e.field}: {e.reason}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm text-black">
              <span className="font-medium">{importPreview?.validRows.length ?? 0}</span> row(s) will be updated.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportPreview(null)} disabled={importLoading}>
              Cancel
            </Button>
            {(importPreview?.validRows.length ?? 0) > 0 && (
              <Button onClick={handleConfirmImport} disabled={importLoading}>
                {importLoading ? "Updating…" : `Update ${importPreview?.validRows.length} row(s)`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
