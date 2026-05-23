export type StatusChipColor = "green" | "red" | "yellow" | "grey" | "black";

interface StatusChipProps {
  label: string;
  color: StatusChipColor;
  dot?: boolean;
}

const colorMap: Record<StatusChipColor, { chip: string; dot: string }> = {
  green:  { chip: "bg-green-50 text-success",    dot: "bg-success" },
  red:    { chip: "bg-red-50 text-error",         dot: "bg-error" },
  yellow: { chip: "bg-yellow-50 text-yellow-700", dot: "bg-yellow-500" },
  grey:   { chip: "bg-gray-100 text-gray-500",    dot: "bg-gray-400" },
  black:  { chip: "bg-primary text-white",        dot: "bg-white" },
};

export function StatusChip({ label, color, dot = true }: StatusChipProps) {
  const { chip, dot: dotColor } = colorMap[color];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${chip}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />}
      {label}
    </span>
  );
}
