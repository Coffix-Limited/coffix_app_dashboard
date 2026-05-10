"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUserStore } from "./store/useUserStore";
import { useStoreStore } from "@/app/dashboard/stores/store/useStoreStore";
import { UserService } from "./service/UserService";
import {
  USER_PROTECTED_FIELDS,
  USER_IMPORTABLE_FIELDS,
} from "./constants/userFieldConstants";
import { escapeCSV, tsToISO, parseCSVText, triggerCSVDownload } from "@/app/utils/csvUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";


function getDisplayName(user: { firstName?: string; lastName?: string; nickName?: string }): string {
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return full || user.nickName || "—";
}

function getStoreName(preferredStoreId: string | undefined, stores: { docId: string; name?: string }[]): string {
  if (!preferredStoreId) return "—";
  return stores.find((s) => s.docId === preferredStoreId)?.name ?? "—";
}

function getInitials(name: string): string {
  if (name === "—") return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
  onClick,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={onClick}
      className="h-4 w-4 cursor-pointer accent-primary"
    />
  );
}

export default function UsersPage() {
  const users = useUserStore((s) => s.users);
  const stores = useStoreStore((s) => s.stores);
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Disabled">("All");
  const [storeFilter, setStoreFilter] = useState<string>("All");
  type SortDir = "asc" | "desc";
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddCredits, setShowAddCredits] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditLoading, setCreditLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<{ validRows: Record<string, string>[]; errors: { row: number; field: string; reason: string }[] } | null>(null);
  const [showImportInfo, setShowImportInfo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleSort() {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function setStatusFilterAndClear(v: "All" | "Active" | "Disabled") {
    setStatusFilter(v);
    clearSelection();
  }

  function setStoreFilterAndClear(v: string) {
    setStoreFilter(v);
    clearSelection();
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = users.filter((u) => {
      if (statusFilter === "Active" && u.disabled) return false;
      if (statusFilter === "Disabled" && !u.disabled) return false;
      if (storeFilter !== "All" && u.preferredStoreId !== storeFilter) return false;
      if (query) {
        const name = `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.nickName ?? ""}`.toLowerCase();
        return (
          name.includes(query) ||
          (u.email ?? "").toLowerCase().includes(query) ||
          (u.mobile ?? "").toLowerCase().includes(query)
        );
      }
      return true;
    });
    result = [...result].sort((a, b) => {
      const cmp = getDisplayName(a).localeCompare(getDisplayName(b));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [users, search, statusFilter, storeFilter, sortDir]);

  const allSelected = filtered.length > 0 && filtered.every((u) => selectedIds.has(u.docId!));
  const someSelected = !allSelected && filtered.some((u) => selectedIds.has(u.docId!));

  function toggleSelectAll() {
    if (allSelected) {
      clearSelection();
    } else {
      setSelectedIds(new Set(filtered.map((u) => u.docId!)));
    }
  }

  function toggleUser(docId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }

  function exportToCSV() {
    const headers = ["docId", "email", "creditAvailable", "emailVerified", "lastLogin", "creditExpiry", "createdAt",
      "firstName", "lastName", "nickName", "mobile", "birthday", "suburb", "city",
      "preferredStoreId", "getPurchaseInfoByMail", "getPromotions", "allowWinACoffee", "disabled"];
    const rows = filtered.map((u) =>
      [
        escapeCSV(u.docId ?? ""),
        escapeCSV(u.email ?? ""),
        String(u.creditAvailable ?? ""),
        String(u.emailVerified ?? ""),
        escapeCSV(tsToISO(u.lastLogin)),
        escapeCSV(tsToISO(u.creditExpiry)),
        escapeCSV(tsToISO(u.createdAt)),
        escapeCSV(u.firstName ?? ""),
        escapeCSV(u.lastName ?? ""),
        escapeCSV(u.nickName ?? ""),
        escapeCSV(u.mobile ?? ""),
        escapeCSV(tsToISO(u.birthday)),
        escapeCSV(u.suburb ?? ""),
        escapeCSV(u.city ?? ""),
        escapeCSV(u.preferredStoreId ?? ""),
        String(u.getPurchaseInfoByMail ?? ""),
        String(u.getPromotions ?? ""),
        String(u.allowWinACoffee ?? ""),
        String(u.disabled ?? ""),
      ].join(",")
    );
    triggerCSVDownload([headers.join(","), ...rows].join("\n"), `users-${new Date().toISOString().slice(0, 10)}.csv`);
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
          (USER_PROTECTED_FIELDS as readonly string[]).includes(h)
        );
        if (protectedInFile.length > 0) {
          toast.error(`CSV contains protected columns: ${protectedInFile.join(", ")}. Remove them and re-upload.`);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        const existingUserIds = useUserStore.getState().users.map((u) => u.docId!);
        const storeIds = useStoreStore.getState().stores.map((s) => s.docId!);
        const validImportCols = new Set([...(USER_IMPORTABLE_FIELDS as readonly string[]), "docId"]);

        const validRows: Record<string, string>[] = [];
        const errors: { row: number; field: string; reason: string }[] = [];

        rows.forEach((cols, idx) => {
          const rowNum = idx + 2;
          const row: Record<string, string> = {};
          headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });

          headers.filter((h) => !validImportCols.has(h)).forEach((col) =>
            errors.push({ row: rowNum, field: col, reason: `Unknown column "${col}" will be ignored` })
          );

          let hasError = false;

          if (!row.docId) {
            errors.push({ row: rowNum, field: "docId", reason: "docId is required to identify the user" });
            hasError = true;
          } else if (!existingUserIds.includes(row.docId)) {
            errors.push({ row: rowNum, field: "docId", reason: "User not found — cannot update" });
            hasError = true;
          }

          if (row.preferredStoreId && !storeIds.includes(row.preferredStoreId)) {
            errors.push({ row: rowNum, field: "preferredStoreId", reason: `Store "${row.preferredStoreId}" does not exist` });
            hasError = true;
          }

          if (row.birthday && isNaN(new Date(row.birthday).getTime())) {
            errors.push({ row: rowNum, field: "birthday", reason: "Invalid date format" });
            hasError = true;
          }

          for (const boolField of ["disabled", "getPurchaseInfoByMail", "getPromotions", "allowWinACoffee"] as const) {
            if (row[boolField] !== undefined && row[boolField] !== "" &&
              !["true", "false"].includes(row[boolField].toLowerCase())) {
              errors.push({ row: rowNum, field: boolField, reason: 'Must be "true" or "false"' });
              hasError = true;
            }
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
        const strFields = ["firstName", "lastName", "nickName", "mobile", "suburb", "city", "preferredStoreId"] as const;
        strFields.forEach((f) => { if (row[f] !== undefined) update[f] = row[f]; });
        if (row.birthday) update.birthday = new Date(row.birthday);
        for (const f of ["disabled", "getPurchaseInfoByMail", "getPromotions", "allowWinACoffee"] as const) {
          if (row[f] !== undefined && row[f] !== "") update[f] = row[f].toLowerCase() === "true";
        }
        await UserService.updateUser(row.docId, update);
        count++;
      }
      toast.success(`Updated ${count} user(s).`);
      setImportPreview(null);
    } catch {
      toast.error("Failed to import users.");
    } finally {
      setImportLoading(false);
    }
  }

  async function handleAddCredits() {
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid credit amount greater than 0.");
      return;
    }
    setCreditLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((docId) => {
          const user = users.find((u) => u.docId === docId);
          const newCredit = (user?.creditAvailable ?? 0) + amount;
          return UserService.updateUser(docId, { creditAvailable: newCredit });
        })
      );
      toast.success(`Added $${amount.toFixed(2)} credits to ${selectedIds.size} user(s).`);
      setShowAddCredits(false);
      setCreditAmount("");
      clearSelection();
    } catch {
      toast.error("Failed to add credits. Please try again.");
    } finally {
      setCreditLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black">Users</h1>
          <p className="mt-1 text-sm text-light-grey">
            {users.length} user{users.length !== 1 ? "s" : ""} total
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
            size="sm"
            onClick={exportToCSV}
            disabled={filtered.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by name, email or mobile…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-lg border border-border bg-white px-3 text-sm text-black outline-none placeholder:text-light-grey focus:border-primary sm:max-w-xs"
        />
        {stores.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStoreFilterAndClear("All")}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${storeFilter === "All" ? "border-primary bg-primary text-white" : "border-border text-black"}`}
            >
              All Stores
            </button>
            {stores.map((store) => (
              <button
                key={store.docId}
                onClick={() => setStoreFilterAndClear(store.docId)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${storeFilter === store.docId ? "border-primary bg-primary text-white" : "border-border text-black"}`}
              >
                {store.name ?? store.docId}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-5 py-3 shadow-(--shadow)">
          <span className="text-sm text-light-grey">{selectedIds.size} selected</span>
          <Button
            size="sm"
            onClick={() => setShowAddCredits(true)}
          >
            Add Credits
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearSelection}
          >
            Clear
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-(--shadow)">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="w-10 px-5 py-3">
                <IndeterminateCheckbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={toggleSelectAll}
                />
              </th>
              <th
                onClick={() => toggleSort()}
                className="w-64 cursor-pointer select-none px-5 py-3 text-left font-medium text-light-grey"
              >
                Name {sortDir === "asc" ? "↑" : "↓"}
              </th>
              <th className="px-5 py-3 text-left font-medium text-light-grey">Email</th>
              <th className="px-5 py-3 text-left font-medium text-light-grey">Preferred Store</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-light-grey">
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((user) => {
                const displayName = getDisplayName(user);
                const initials = getInitials(displayName);
                const isSelected = selectedIds.has(user.docId!);
                return (
                  <tr
                    key={user.docId}
                    onClick={() => router.push(`/dashboard/users/${user.docId}`)}
                    className={`transition-colors hover:bg-background cursor-pointer ${isSelected ? "bg-background" : ""}`}
                  >
                    <td
                      className="px-5 py-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleUser(user.docId!);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleUser(user.docId!)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
                          {initials}
                        </div>
                        <span className="truncate font-medium text-black">{displayName}</span>
                      </div>
                    </td>
                    <td className="truncate px-5 py-3 text-black">{user.email ?? "—"}</td>
                    <td className="truncate px-5 py-3 text-black">{getStoreName(user.preferredStoreId, stores)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showAddCredits} onOpenChange={(open) => { if (!open) { setShowAddCredits(false); setCreditAmount(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Credits</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-light-grey">
              Adding credits to <span className="font-medium text-black">{selectedIds.size}</span> user{selectedIds.size !== 1 ? "s" : ""}.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-black">Amount ($)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="0.00"
                className="h-9 w-full rounded-lg border border-border bg-white px-3 text-sm text-black outline-none placeholder:text-light-grey focus:border-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddCredits(false); setCreditAmount(""); }} disabled={creditLoading}>
              Cancel
            </Button>
            <Button onClick={handleAddCredits} disabled={creditLoading}>
              {creditLoading ? "Applying…" : "Apply Credits"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Field Guide Dialog */}
      <Dialog open={showImportInfo} onOpenChange={setShowImportInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>CSV Import Guide — Users</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm">
            <div className="space-y-1.5">
              <p className="font-medium text-black">Editable fields</p>
              <div className="flex flex-wrap gap-1.5">
                {(["firstName", "lastName", "nickName", "mobile", "birthday", "suburb", "city", "preferredStoreId", "getPurchaseInfoByMail", "getPromotions", "allowWinACoffee", "disabled"] as const).map((f) => (
                  <span key={f} className="rounded-md bg-background border border-border px-2 py-0.5 text-xs text-black font-mono">{f}</span>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="font-medium text-black">Required fields <span className="text-xs font-normal text-light-grey">(for new rows)</span></p>
              <p className="text-xs text-light-grey">None — every row must include an existing <span className="font-mono text-black">docId</span>.</p>
            </div>
            <p className="text-xs text-light-grey leading-relaxed">
              This entity is <span className="font-medium text-black">update-only</span>. Every row must include a valid <span className="font-mono text-black">docId</span>. Boolean fields accept <span className="font-mono text-black">true</span> or <span className="font-mono text-black">false</span>. The <span className="font-mono text-black">birthday</span> field accepts any valid date string.
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
