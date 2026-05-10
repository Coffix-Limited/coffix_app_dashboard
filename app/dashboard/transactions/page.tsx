"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTransactionStore } from "./store/useTransactionStore";
import { useUserStore } from "@/app/dashboard/users/store/useUserStore";
import { Transaction, PaymentMethod } from "./interface/transaction";
import { formatDateTime } from "@/app/utils/formatting";
import { escapeCSV, triggerCSVDownload } from "@/app/utils/csvUtils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/lib/AuthContext";
import { toast } from "sonner";
import { TransactionService } from "./service/TransactionService";

function PaymentMethodBadge({ method }: { method: PaymentMethod | null | undefined }) {
  if (!method) return <span className="text-black">—</span>;
  const styles: Record<PaymentMethod, string> = {
    coffixCredit: "bg-primary text-white",
    card: "bg-black text-white",
    wallet: "border border-border text-black",
  };
  const labels: Record<PaymentMethod, string> = {
    coffixCredit: "Coffix Credit",
    card: "Credit Card",
    wallet: "Wallet",
  };
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

  useEffect(() => {
    setSelected(new Set());
  }, [search, typeFilter, methodFilter]);

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
  }, [transactions, users, search, typeFilter, methodFilter, sortKey, sortDir]);

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
          <Button size="sm" onClick={exportToCSV}>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by number or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full rounded-lg border border-border bg-white px-3 text-sm text-black outline-none placeholder:text-light-grey focus:border-primary sm:max-w-xs"
        />

        {uniqueTypes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(["All", ...uniqueTypes] as string[]).map((v) => (
              <button
                key={v}
                onClick={() => setTypeFilter(v)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${typeFilter === v ? "border-primary bg-primary text-white" : "border-border text-black "}`}
              >
                {v === "All" ? "All Types" : v}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {(["All", "coffixCredit", "card", "wallet"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setMethodFilter(v)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${methodFilter === v ? "border-primary bg-primary text-white" : "border-border text-black "}`}
            >
              {v === "All" ? "All Methods" : v === "coffixCredit" ? "Coffix Credit" : v === "card" ? "Credit Card" : "Wallet"}
            </button>
          ))}
        </div>
      </div>

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
              <th className="px-5 py-3 text-left font-medium text-light-grey">Customer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-light-grey">
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
