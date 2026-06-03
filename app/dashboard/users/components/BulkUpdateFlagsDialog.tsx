"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AppUser } from "../interface/user";

export type FlagKey =
  | "getPurchaseInfoByMail"
  | "getPromotions"
  | "allowWinACoffee"
  | "disabled"
  | "scheduleOrder"
  | "shareCredit"
  | "withdrawBalance"
  | "coffixCreditAvailable"
  | "allowCoffeeForHome";

const FLAGS: { key: FlagKey; label: string }[] = [
  { key: "getPurchaseInfoByMail", label: "Purchase Info by Mail" },
  { key: "getPromotions", label: "Get Promotions" },
  { key: "allowWinACoffee", label: "Allow Win a Coffee" },
  { key: "disabled", label: "Disabled" },
  { key: "scheduleOrder", label: "Schedule Order" },
  { key: "shareCredit", label: "Share Credit" },
  { key: "withdrawBalance", label: "Withdraw Balance" },
  { key: "coffixCreditAvailable", label: "Coffix Credit Available" },
  { key: "allowCoffeeForHome", label: "Allow Coffee for Home" },
];

type FlagState = Record<FlagKey, boolean | undefined>;

const DEFAULT_STATE: FlagState = {
  getPurchaseInfoByMail: undefined,
  getPromotions: undefined,
  allowWinACoffee: undefined,
  disabled: undefined,
  scheduleOrder: undefined,
  shareCredit: undefined,
  withdrawBalance: undefined,
  coffixCreditAvailable: undefined,
  allowCoffeeForHome: undefined,
};

interface Props {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  initialFlags: Partial<Record<FlagKey, boolean>>;
  onSave: (flags: Partial<AppUser>) => Promise<void>;
}

export default function BulkUpdateFlagsDialog({ open, onClose, selectedCount, initialFlags, onSave }: Props) {
  const [flags, setFlags] = useState<FlagState>(() => ({ ...DEFAULT_STATE, ...initialFlags }));
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  function setFlag(key: FlagKey, value: boolean | undefined) {
    setFlags((f) => ({ ...f, [key]: value }));
  }

  function handleClose() {
    if (loading) return;
    setFlags({ ...DEFAULT_STATE, ...initialFlags });
    onClose();
  }

  async function handleSave() {
    const payload: Partial<AppUser> = {};
    for (const { key } of FLAGS) {
      if (flags[key] !== undefined) {
        (payload as Record<string, boolean>)[key] = flags[key] as boolean;
      }
    }

    if (Object.keys(payload).length === 0) {
      toast.error("No flags selected. Choose at least one flag to update.");
      return;
    }

    setLoading(true);
    try {
      await onSave(payload);
      toast.success(`Updated flags for ${selectedCount} user${selectedCount !== 1 ? "s" : ""}.`);
      setFlags({ ...DEFAULT_STATE, ...initialFlags });
      onClose();
    } catch {
      toast.error("Failed to update flags. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-black">Update Flags</h3>
          <p className="mt-0.5 text-sm text-light-grey">
            Applying to <span className="font-medium text-black">{selectedCount}</span> user{selectedCount !== 1 ? "s" : ""}. Only flags explicitly toggled will be saved.
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {FLAGS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm text-black">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-light-grey">{flags[key] === undefined ? "—" : ""}</span>
                  <Switch
                    checked={flags[key] === true}
                    onCheckedChange={(checked) => setFlag(key, checked)}
                    disabled={loading}
                    className={flags[key] === undefined ? "opacity-30" : undefined}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
