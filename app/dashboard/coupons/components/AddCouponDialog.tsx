"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CouponService } from "../service/CouponService";
import { Coupon } from "../interface/coupon";

interface Store {
  docId?: string;
  name?: string;
}

interface AddCouponDialogProps {
  open: boolean;
  onClose: () => void;
  stores: Store[];
  defaultEmail?: string;
}

const EMPTY_FORM = { type: "", amount: "", expiryDate: "", storeId: "", customerEmail: "", notes: "" };

export function AddCouponDialog({ open, onClose, stores, defaultEmail }: AddCouponDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, customerEmail: defaultEmail ?? "" });
    }
  }, [open, defaultEmail]);

  function setField<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreate() {
    setLoading(true);
    try {
      const data: Omit<Coupon, "docId"> = { createdAt: new Date() };
      if (form.type.trim()) data.type = form.type.trim();
      const amt = parseFloat(form.amount);
      if (!isNaN(amt) && amt >= 0) data.amount = amt;
      if (form.expiryDate) {
        const d = new Date(form.expiryDate + "T00:00:00");
        if (!isNaN(d.getTime())) data.expiryDate = d;
      }
      if (form.storeId) data.storeId = form.storeId;
      if (form.customerEmail.trim()) data.customerEmail = form.customerEmail.trim();
      if (form.notes.trim()) data.notes = form.notes.trim();
      await CouponService.createCoupon(data);
      toast.success("Coupon created.");
      onClose();
    } catch {
      toast.error("Failed to create coupon.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold text-black">New Coupon</h3>
        </div>

        <div className="max-h-[72vh] space-y-4 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-light-grey">Type</label>
              <select
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary"
                value={form.type}
                onChange={(e) => setField("type", e.target.value)}
              >
                <option value="">— None —</option>
                <option value="referral">Referral</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-light-grey">Amount ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-black outline-none placeholder:text-light-grey focus:border-primary"
                value={form.amount}
                onChange={(e) => setField("amount", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-light-grey">Expiry Date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-black outline-none focus:border-primary"
                value={form.expiryDate}
                onChange={(e) => setField("expiryDate", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-light-grey">Store</label>
              <select
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-black outline-none focus:border-primary"
                value={form.storeId}
                onChange={(e) => setField("storeId", e.target.value)}
              >
                <option value="">— None —</option>
                {stores.map((s) => (
                  <option key={s.docId} value={s.docId ?? ""}>{s.name ?? s.docId}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs text-light-grey">Customer Email</label>
              <input
                type="email"
                placeholder="customer@example.com"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-black outline-none placeholder:text-light-grey focus:border-primary"
                value={form.customerEmail}
                onChange={(e) => setField("customerEmail", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs text-light-grey">Notes</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-black outline-none focus:border-primary"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-border px-4 py-2 text-sm text-black hover:bg-[#f0f0f0] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-80 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create Coupon"}
          </button>
        </div>
      </div>
    </div>
  );
}
