"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { WindcaveSession } from "../interface/windcave";
import { TransactionStatus } from "../interface/transaction";
import { formatDateTime } from "@/app/utils/formatting";
import { InfoCard } from "./InfoCard";
import { Button } from "@/components/ui/button";

type WindcaveState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; data: WindcaveSession };

export function WindcaveSessionView({
  sessionId,
  transactionStatus,
}: {
  sessionId: string;
  transactionStatus?: TransactionStatus | null;
}) {
  const [state, setState] = useState<WindcaveState>({ status: "loading" });
  const [triggering, setTriggering] = useState(false);

  const canTrigger = transactionStatus === "created";


  async function handleTriggerWebhook() {
    if (!canTrigger) return;
    setTriggering(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/webhook/?sessionId=${encodeURIComponent(sessionId)}`,
        { method: "GET"}
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message ?? `Error ${res.status}`);
      }
      toast.success("Webhook triggered", {
        description: `Webhook re-sent for session ${sessionId}.`,
      });
    } catch (err) {
      toast.error("Failed to trigger webhook", {
        description: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setTriggering(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/windcave/session/${encodeURIComponent(sessionId)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `Error ${res.status}`);
        }
        return res.json();
      })
      .then((json: WindcaveSession) => {
        if (!cancelled) setState({ status: "loaded", data: json });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Something went wrong.";
        setState({ status: "error", message });
        toast.error("Failed to load Windcave session", { description: message });
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (state.status === "loading") {
    return (
      <div className="flex h-48 items-center justify-center text-light-grey">
        Loading Windcave session…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex h-48 items-center justify-center text-red-600">
        {state.message}
      </div>
    );
  }

  const data = state.data;
  const txns = data.transactions ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleTriggerWebhook}
          disabled={!canTrigger || triggering}
        >
          {triggering ? "Triggering…" : "Trigger Webhook"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <InfoCard
        title="Session"
        rows={[
          { label: "Session ID", value: data.id ?? "—", mono: true },
          { label: "State", value: data.state ?? "—" },
        ]}
      />

      {txns.map((t, i) => (
        <InfoCard
          key={t.id ?? i}
          title={`Transaction${txns.length > 1 ? ` ${i + 1}` : ""}`}
          rows={[
            { label: "Transaction ID", value: t.id ?? "—", mono: true },
            { label: "Authorised", value: t.authorised == null ? "—" : t.authorised ? "Yes" : "No" },
            { label: "Response", value: [t.responseText, t.reCo ? `(${t.reCo})` : null].filter(Boolean).join(" ") || "—" },
            { label: "Auth Code", value: t.authCode ?? "—", mono: true },
            { label: "Type", value: t.type ?? "—" },
            { label: "Method", value: t.method ?? "—" },
            { label: "Amount", value: t.amount != null ? `${t.amount} ${t.currency ?? ""}`.trim() : "—" },
            { label: "Merchant Reference", value: t.merchantReference ?? "—", mono: true },
            { label: "Card Type", value: t.card?.type ?? "—" },
            { label: "Card Number", value: t.card?.cardNumber ?? "—", mono: true },
            { label: "Card Holder", value: t.card?.cardHolderName ?? "—" },
            { label: "Expiry", value: t.card?.dateExpiryMonth && t.card?.dateExpiryYear ? `${t.card.dateExpiryMonth}/${t.card.dateExpiryYear}` : "—" },
            { label: "Acquirer", value: t.acquirer?.responseText ?? "—" },
            { label: "Date (UTC)", value: formatDateTime(t.dateTimeUtc) },
            { label: "Customer Email", value: t.customer?.email ?? "—" },
          ]}
        />
      ))}

      {/* <details className="lg:col-span-2 overflow-hidden rounded-xl border border-border bg-white shadow-(--shadow)">
        <summary className="cursor-pointer border-b border-border px-4 py-3 font-semibold text-black">
          Raw Response
        </summary>
        <pre className="overflow-x-auto p-4 text-xs text-black">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details> */}
      </div>
    </div>
  );
}
