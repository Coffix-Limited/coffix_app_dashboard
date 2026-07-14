export type StatusChipColor = "green" | "red" | "yellow" | "grey" | "black" | "blue";

const colorMap: Record<StatusChipColor, { chip: string; dot: string }> = {
  green:  { chip: "bg-green-50 text-success",    dot: "bg-success" },
  red:    { chip: "bg-red-50 text-error",         dot: "bg-error" },
  yellow: { chip: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-500" },
  grey:   { chip: "bg-gray-100 text-gray-500",    dot: "bg-gray-400" },
  black:  { chip: "bg-primary text-white",        dot: "bg-white" },
  blue:   { chip: "bg-blue-50 text-blue-700",     dot: "bg-blue-500" },
};

interface StatusChipProps {
  label: string;
  color: StatusChipColor;
  dot?: boolean;
}

export function StatusChip({ label, color, dot = true }: StatusChipProps) {
  const { chip, dot: dotColor } = colorMap[color];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${chip}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />}
      {label}
    </span>
  );
}

// ─── EnumChip ────────────────────────────────────────────────────────────────

type EnumDomain = "transactionStatus" | "paymentMethod" | "transactionType" | "storeStatus";

type EnumEntry = { label: string; color: StatusChipColor };

const enumMaps: Record<EnumDomain, Record<string, EnumEntry>> = {
  transactionStatus: {
    created:   { label: "Created",   color: "yellow" },
    paid:      { label: "Paid",      color: "green"  },
    approved:  { label: "Approved",  color: "green"  },
    completed: { label: "Completed", color: "green"  },
    failed:    { label: "Failed",    color: "red"    },
    declined:  { label: "Declined",  color: "red"    },
    claimed:   { label: "Claimed",   color: "green"  },
    pending:   { label: "Pending",   color: "yellow" },
    sent:      { label: "Sent",      color: "blue"   },
    expired:   { label: "Expired",   color: "grey"   },
  },
  paymentMethod: {
    coffixCredit: { label: "Coffix Credit", color: "black" },
    card:         { label: "Credit Card",   color: "blue"  },
    wallet:       { label: "Wallet",        color: "blue"  },
    cash:         { label: "Cash",          color: "green" },
  },
  transactionType: {
    order:  { label: "Order",  color: "blue"   },
    refund: { label: "Refund", color: "yellow" },
    gift:   { label: "Gift",   color: "green"  },
  },
  storeStatus: {
    Open:     { label: "Open",     color: "green" },
    Closed:   { label: "Closed",   color: "red"   },
    Disabled: { label: "Disabled", color: "grey"  },
  },
};

interface EnumChipProps {
  domain: EnumDomain;
  value: string | null | undefined;
  dot?: boolean;
}

export function EnumChip({ domain, value, dot = true }: EnumChipProps) {
  if (!value) return <span className="text-gray-400">—</span>;
  const entry = enumMaps[domain][value];
  const label = entry?.label ?? value.charAt(0).toUpperCase() + value.slice(1);
  const color = entry?.color ?? "grey";
  return <StatusChip label={label} color={color} dot={dot} />;
}
