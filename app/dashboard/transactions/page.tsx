"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTransactionStore } from "./store/useTransactionStore";
import { useUserStore } from "@/app/dashboard/users/store/useUserStore";
import { Transaction, PaymentMethod } from "./interface/transaction";
import { formatDateTime } from "@/app/utils/formatting";
import { escapeCSV, tsToISO, triggerCSVDownload } from "@/app/utils/csvUtils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/lib/AuthContext";
import { toast } from "sonner";
import { TransactionService } from "./service/TransactionService";
import { TransactionsFilterBar } from "./components/TransactionsFilterBar";

type DateRange = { from: string; to: string };
type NumberRange = { min: string; max: string };

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

function PaymentMethodBadge({ method }: { method: PaymentMethod | null | undefined }) {
  if (!method) return <span className="text-black">—</span>;
  const styles: Partial<Record<PaymentMethod, string>> = {
    coffixCredit: "bg-primary text-white",
    card: "bg-black text-white",
  };
  const labels: Partial<Record<PaymentMethod, string>> = {
    coffixCredit: "Coffix Credit",
    card: "Credit Card",
  };
  if (!styles[method] || !labels[method]) return <span className="text-black">—</span>;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[method]}`}>
      {labels[method]}
    </span>
  );
}

type SortKey = "createdAt" | "transactionNumber";
type SortDir = "asc" | "desc";

export default function TransactionsPage() {
  const transactions = useTransactionStore((s) => s.transactions);
  const users = useUserStore((s) => s.users);
  const router = useRouter();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState<"All" | PaymentMethod>("All");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [invoicing, setInvoicing] = useState(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCreatedAt, setFilterCreatedAt] = useState<DateRange>({ from: "", to: "" });
  const [filterAmount, setFilterAmount] = useState<NumberRange>({ min: "", max: "" });
  const [filterTotalAmount, setFilterTotalAmount] = useState<NumberRange>({ min: "", max: "" });
  const [filterRecipientEmail, setFilterRecipientEmail] = useState("");
  const [filterRecipientFullName, setFilterRecipientFullName] = useState("");

  useEffect(() => {
    setSelected(new Set());
  }, [search, typeFilter, methodFilter, filterStatus, filterCreatedAt,
      filterAmount, filterTotalAmount, filterRecipientEmail, filterRecipientFullName]);

  const anyFilterActive = useMemo(() => {
    return (
      search.trim() !== "" ||
      typeFilter !== "All" ||
      methodFilter !== "All" ||
      filterStatus !== "All" ||
      filterCreatedAt.from !== "" || filterCreatedAt.to !== "" ||
      filterAmount.min !== "" || filterAmount.max !== "" ||
      filterTotalAmount.min !== "" || filterTotalAmount.max !== "" ||
      filterRecipientEmail.trim() !== "" ||
      filterRecipientFullName.trim() !== ""
    );
  }, [search, typeFilter, methodFilter, filterStatus, filterCreatedAt, filterAmount,
      filterTotalAmount, filterRecipientEmail, filterRecipientFullName]);

  function clearAllFilters() {
    setSearch("");
    setTypeFilter("All");
    setMethodFilter("All");
    setFilterStatus("All");
    setFilterCreatedAt({ from: "", to: "" });
    setFilterAmount({ min: "", max: "" });
    setFilterTotalAmount({ min: "", max: "" });
    setFilterRecipientEmail("");
    setFilterRecipientFullName("");
    setSelected(new Set());
  }

  function toggleSelectAll() {
    const allIds = displayed.map((tx) => tx.docId).filter((id): id is string => !!id);
    const allSelected = allIds.every((id) => selected.has(id));
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  }

  function toggleRow(docId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }

  async function sendInvoices() {
    if (!user) return;
    setInvoicing(true);
    try {
      const token = await user.getIdToken();
      const ids = Array.from(selected);
      const results = await Promise.allSettled(
        ids.map((id) => TransactionService.sendInvoice(id, token))
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      if (succeeded > 0 && failed === 0) {
        toast.success(`Invoice${succeeded > 1 ? "s" : ""} sent successfully.`);
      } else if (failed > 0 && succeeded === 0) {
        toast.error(`Failed to send invoice${failed > 1 ? "s" : ""}.`);
      } else {
        toast.warning(`${succeeded} sent, ${failed} failed.`);
      }
      setSelected(new Set());
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setInvoicing(false);
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function getCustomerEmail(tx: Transaction): string {
    if (tx.customerId) {
      const user = users.find((u) => u.docId === tx.customerId);
      if (user?.email) return user.email;
    }
    return tx.recipientEmail ?? "—";
  }

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    transactions.forEach((tx) => { if (tx.type) types.add(tx.type); });
    return Array.from(types).sort();
  }, [transactions]);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = transactions.filter((tx) => {
      if (typeFilter !== "All" && tx.type !== typeFilter) return false;
      if (methodFilter !== "All" && tx.paymentMethod !== methodFilter) return false;
      if (q) {
        const email = getCustomerEmail(tx).toLowerCase();
        const num = (tx.transactionNumber ?? "").toLowerCase();
        if (!email.includes(q) && !num.includes(q)) return false;
      }
      if (filterStatus !== "All" && tx.status !== filterStatus) return false;
      if (!dateInRange(tx.createdAt ?? undefined, filterCreatedAt.from, filterCreatedAt.to)) return false;
      if (filterAmount.min !== "") {
        const min = parseFloat(filterAmount.min);
        if (!isNaN(min) && (tx.amount ?? 0) < min) return false;
      }
      if (filterAmount.max !== "") {
        const max = parseFloat(filterAmount.max);
        if (!isNaN(max) && (tx.amount ?? 0) > max) return false;
      }
      if (filterTotalAmount.min !== "") {
        const min = parseFloat(filterTotalAmount.min);
        if (!isNaN(min) && (tx.totalAmount ?? 0) < min) return false;
      }
      if (filterTotalAmount.max !== "") {
        const max = parseFloat(filterTotalAmount.max);
        if (!isNaN(max) && (tx.totalAmount ?? 0) > max) return false;
      }
      if (filterRecipientEmail.trim() && !(tx.recipientEmail ?? "").toLowerCase().includes(filterRecipientEmail.trim().toLowerCase())) return false;
      if (filterRecipientFullName.trim() && !(tx.recipientFullName ?? "").toLowerCase().includes(filterRecipientFullName.trim().toLowerCase())) return false;
      return true;
    });
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "createdAt") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toMs = (v: unknown) => { if (!v) return 0; if (typeof (v as any).toMillis === "function") return (v as any).toMillis(); return new Date(v as any).getTime(); };
        cmp = toMs(a.createdAt) - toMs(b.createdAt);
      } else if (sortKey === "transactionNumber") {
        cmp = (a.transactionNumber ?? "").localeCompare(b.transactionNumber ?? "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, users, search, typeFilter, methodFilter, sortKey, sortDir,
      filterStatus, filterCreatedAt, filterAmount, filterTotalAmount,
      filterRecipientEmail, filterRecipientFullName]);

  useEffect(() => {
    if (!selectAllRef.current) return;
    const checkedCount = displayed.filter((tx) => tx.docId && selected.has(tx.docId)).length;
    selectAllRef.current.indeterminate = checkedCount > 0 && checkedCount < displayed.length;
  });

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : <span className="opacity-30">↕</span>;

  function exportToCSV() {
    const paymentLabels: Record<PaymentMethod, string> = {
      coffixCredit: "Coffix Credit",
      card: "Credit Card",
      wallet: "Wallet",
    };
    const headers = ["transactionNumber", "createdAt", "paymentMethod", "type", "customerId", "amount", "status", "orderId", "gst", "gstAmount", "totalAmount", "recipientEmail"];
    const rows = displayed.map((tx) =>
      [
        escapeCSV(tx.transactionNumber ?? ""),
        escapeCSV(formatDateTime(tx.createdAt)),
        escapeCSV(tx.paymentMethod ? paymentLabels[tx.paymentMethod] : ""),
        escapeCSV(tx.type ?? ""),
        escapeCSV(getCustomerEmail(tx)),
        String(tx.amount ?? ""),
        escapeCSV(tx.status ?? ""),
        escapeCSV(tx.orderId ?? ""),
        String(tx.gst ?? ""),
        String(tx.gstAmount ?? ""),
        String(tx.totalAmount ?? ""),
        escapeCSV(tx.recipientEmail ?? ""),
      ].join(",")
    );
    triggerCSVDownload([headers.join(","), ...rows].join("\n"), `transactions-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-black">Transactions</h1>
          <p className="mt-1 text-sm text-light-grey">
            {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button size="sm" variant="outline" onClick={sendInvoices} disabled={invoicing}>
              {invoicing ? "Sending…" : `Send Invoice (${selected.size})`}
            </Button>
          )}
          <Button variant="outline" onClick={exportToCSV} disabled={displayed.length === 0}>
            Export CSV
          </Button>
        </div>
      </div>

      <TransactionsFilterBar
        search={search} setSearch={setSearch}
        typeFilter={typeFilter} setTypeFilter={setTypeFilter}
        uniqueTypes={uniqueTypes}
        methodFilter={methodFilter} setMethodFilter={(v) => setMethodFilter(v as "All" | PaymentMethod)}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        filterCreatedAt={filterCreatedAt} setFilterCreatedAt={setFilterCreatedAt}
        filterAmount={filterAmount} setFilterAmount={setFilterAmount}
        filterTotalAmount={filterTotalAmount} setFilterTotalAmount={setFilterTotalAmount}
        filterRecipientEmail={filterRecipientEmail} setFilterRecipientEmail={setFilterRecipientEmail}
        filterRecipientFullName={filterRecipientFullName} setFilterRecipientFullName={setFilterRecipientFullName}
        anyFilterActive={anyFilterActive}
        clearAllFilters={clearAllFilters}
      />

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-(--shadow)">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              <th className="w-10 px-4 py-3">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={displayed.length > 0 && displayed.every((tx) => !tx.docId || selected.has(tx.docId))}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                />
              </th>
              <th
                onClick={() => toggleSort("transactionNumber")}
                className="cursor-pointer select-none px-5 py-3 text-left font-medium text-light-grey hover:text-black"
              >
                Transaction # {sortIndicator("transactionNumber")}
              </th>
              <th
                onClick={() => toggleSort("createdAt")}
                className="cursor-pointer select-none px-5 py-3 text-left font-medium text-light-grey hover:text-black"
              >
                Created At {sortIndicator("createdAt")}
              </th>
              <th className="px-5 py-3 text-left font-medium text-light-grey">
                Payment Method
              </th>
              <th className="px-5 py-3 text-left font-medium text-light-grey">Type</th>
              <th className="px-5 py-3 text-left font-medium text-light-grey">Amount</th>
              <th className="px-5 py-3 text-left font-medium text-light-grey">Customer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-light-grey">
                  No transactions found.
                </td>
              </tr>
            ) : (
              displayed.map((tx) => (
                <tr
                  key={tx.docId}
                  onClick={() => router.push(`/dashboard/transactions/${tx.docId}`)}
                  className="cursor-pointer transition-colors hover:bg-background"
                >
                  <td className="w-10 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={!!tx.docId && selected.has(tx.docId)}
                      onChange={() => tx.docId && toggleRow(tx.docId)}
                      className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                    />
                  </td>
                  <td className="px-5 py-3 font-mono text-black">
                    {tx.transactionNumber ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-black">{formatDateTime(tx.createdAt)}</td>
                  <td className="px-5 py-3">
                    <PaymentMethodBadge method={tx.paymentMethod} />
                  </td>
                  <td className="px-5 py-3 text-black">{tx.type ?? "—"}</td>
                  <td className="px-5 py-3 text-black">
                    {tx.amount != null ? `$${tx.amount.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-black">{getCustomerEmail(tx)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
