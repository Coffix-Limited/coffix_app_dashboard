"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLogStore } from "./store/useLogStore";
import { Log } from "./interface/log";
import { formatDateTime } from "@/app/utils/formatting";
import { useUserStore } from "@/app/dashboard/users/store/useUserStore";
import { escapeCSV, tsToISO, triggerCSVDownload } from "@/app/utils/csvUtils";
import { Button } from "@/components/ui/button";
import { LogsFilterBar } from "./components/LogsFilterBar";
import { LogService } from "./service/LogService";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DateRange = { from: string; to: string };

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

function uniqueValues(logs: Log[], selector: (log: Log) => string | undefined): string[] {
  return Array.from(
    new Set(logs.map(selector).filter((v): v is string => !!v && v.trim() !== ""))
  ).sort();
}

const SEVERITY_STYLES: Record<number, string> = {
  1: "bg-blue-100 text-blue-700",
  3: "bg-yellow-100 text-yellow-700",
  5: "bg-orange-100 text-orange-700",
  9: "bg-red-100 text-red-700",
};

function SeverityBadge({ level }: { level?: number }) {
  if (level === undefined || level === null) return <span className="text-light-grey">—</span>;
  const style = SEVERITY_STYLES[level] ?? "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
      {level}
    </span>
  );
}

function matches(log: Log, q: string, emailMap: Map<string | undefined, string | undefined>): boolean {
  const email = emailMap.get(log.customerId ?? "");
  return [log.action, log.category, log.page, log.notes, log.userId, log.customerId, email]
    .some((v) => v?.toLowerCase().includes(q));
}

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
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
      className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
    />
  );
}

export default function LogsPage() {
  const logs = useLogStore((s) => s.logs);
  const users = useUserStore((s) => s.users);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterAction, setFilterAction] = useState("All");
  const [filterSeverity, setFilterSeverity] = useState<number | "">("");
  const [filterPage, setFilterPage] = useState("");
  const [filterNotes, setFilterNotes] = useState("");
  const [filterTime, setFilterTime] = useState<DateRange>({ from: "", to: "" });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const userEmailMap = useMemo(
    () => new Map(users.map((u) => [u.docId, u.email])),
    [users]
  );

  const uniqueCategories = useMemo(() => uniqueValues(logs, (l) => l.category), [logs]);
  const uniqueActions = useMemo(() => uniqueValues(logs, (l) => l.action), [logs]);

  const anyFilterActive = useMemo(
    () =>
      search.trim() !== "" ||
      filterCategory !== "All" ||
      filterAction !== "All" ||
      filterSeverity !== "" ||
      filterPage.trim() !== "" ||
      filterNotes.trim() !== "" ||
      filterTime.from !== "" ||
      filterTime.to !== "",
    [search, filterCategory, filterAction, filterSeverity, filterPage, filterNotes, filterTime]
  );

  function clearAllFilters() {
    setSearch("");
    setFilterCategory("All");
    setFilterAction("All");
    setFilterSeverity("");
    setFilterPage("");
    setFilterNotes("");
    setFilterTime({ from: "", to: "" });
  }

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    const page = filterPage.trim().toLowerCase();
    const notes = filterNotes.trim().toLowerCase();
    return logs.filter((log) => {
      if (q && !matches(log, q, userEmailMap)) return false;
      if (filterCategory !== "All" && log.category !== filterCategory) return false;
      if (filterAction !== "All" && log.action !== filterAction) return false;
      if (filterSeverity !== "" && log.severityLevel !== filterSeverity) return false;
      if (page && !(log.page ?? "").toLowerCase().includes(page)) return false;
      if (notes && !(log.notes ?? "").toLowerCase().includes(notes)) return false;
      if (!dateInRange(log.time, filterTime.from, filterTime.to)) return false;
      return true;
    });
  }, [logs, search, filterCategory, filterAction, filterSeverity, filterPage, filterNotes, filterTime, userEmailMap]);

  const allSelected = displayed.length > 0 && displayed.every((l) => selectedIds.has(l.docId!));
  const someSelected = !allSelected && displayed.some((l) => selectedIds.has(l.docId!));

  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayed.map((l) => l.docId!)));
  }

  function toggleLog(docId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }

  async function handleBulkDelete() {
    setBulkLoading(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => LogService.deleteLog(id)));
      toast.success(`Deleted ${selectedIds.size} log(s).`);
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
    } finally {
      setBulkLoading(false);
    }
  }

  function exportToCSV() {
    const headers = ["docId", "time", "page", "category", "severityLevel", "action", "notes", "customerId", "userId"];
    const source = selectedIds.size > 0 ? displayed.filter((l) => selectedIds.has(l.docId!)) : displayed;
    const rows = source.map((log) =>
      [
        escapeCSV(log.docId ?? ""),
        escapeCSV(tsToISO(log.time) || formatDateTime(log.time)),
        escapeCSV(log.page ?? ""),
        escapeCSV(log.category ?? ""),
        escapeCSV(String(log.severityLevel ?? "")),
        escapeCSV(log.action ?? ""),
        escapeCSV(log.notes ?? ""),
        escapeCSV(log.customerId ?? ""),
        escapeCSV(log.userId ?? ""),
      ].join(",")
    );
    triggerCSVDownload([headers.join(","), ...rows].join("\n"), `logs-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black">Logs</h1>
          <p className="mt-1 text-sm text-light-grey">
            {logs.length} log{logs.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button variant="outline" onClick={exportToCSV} disabled={displayed.length === 0}>
          {selectedIds.size > 0 ? `Export ${selectedIds.size} Selected` : "Export CSV"}
        </Button>
      </div>

      <LogsFilterBar
        search={search} setSearch={setSearch}
        filterCategory={filterCategory} setFilterCategory={setFilterCategory}
        categories={uniqueCategories}
        filterAction={filterAction} setFilterAction={setFilterAction}
        actions={uniqueActions}
        filterSeverity={filterSeverity} setFilterSeverity={setFilterSeverity}
        filterPage={filterPage} setFilterPage={setFilterPage}
        filterNotes={filterNotes} setFilterNotes={setFilterNotes}
        filterTime={filterTime} setFilterTime={setFilterTime}
        anyFilterActive={anyFilterActive}
        clearAllFilters={clearAllFilters}
      />

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-2.5 shadow-(--shadow)">
          <span className="text-sm text-light-grey">{selectedIds.size} selected</span>
          <Button size="sm" variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-(--shadow)">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="w-10 px-5 py-3">
                <IndeterminateCheckbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-5 py-3 text-left font-medium text-light-grey">Email</th>
              <th className="px-5 py-3 text-left font-medium text-light-grey">Action</th>
              <th className="px-5 py-3 text-left font-medium text-light-grey">Category</th>
              <th className="px-5 py-3 text-left font-medium text-light-grey">Severity</th>
              <th className="px-5 py-3 text-left font-medium text-light-grey">Page</th>
              <th className="px-5 py-3 text-left font-medium text-light-grey">Notes</th>
              <th className="px-5 py-3 text-left font-medium text-light-grey">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-light-grey">
                  No logs found.
                </td>
              </tr>
            ) : (
              displayed.map((log) => {
                const isSelected = selectedIds.has(log.docId!);
                return (
                  <tr
                    key={log.docId}
                    className={`transition-colors hover:bg-background ${isSelected ? "bg-background" : ""}`}
                  >
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleLog(log.docId!)}
                        className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                      />
                    </td>
                    <td className="px-5 py-3 text-black">{log.customerId ? (userEmailMap.get(log.customerId) ?? "N/A") : "N/A"}</td>
                    <td className="px-5 py-3 text-black">{log.action ?? "—"}</td>
                    <td className="px-5 py-3 text-black">{log.category ?? "—"}</td>
                    <td className="px-5 py-3">
                      <SeverityBadge level={log.severityLevel} />
                    </td>
                    <td className="px-5 py-3 text-black">{log.page ?? "—"}</td>
                    <td className="px-5 py-3 text-black">{log.notes ?? "—"}</td>
                    <td className="px-5 py-3 text-black">{formatDateTime(log.time)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Logs</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-light-grey">
            Delete <span className="font-medium text-black">{selectedIds.size}</span> selected log(s)? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={bulkLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkLoading}>
              {bulkLoading ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
