export function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs text-light-grey">{label}</span>
      <span
        className={`max-w-xs truncate text-right text-sm text-black ${mono ? "font-mono" : ""}`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

export function InfoCard({ title, rows }: { title: string; rows: { label: string; value: string; mono?: boolean }[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-(--shadow)">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold text-black">{title}</h2>
      </div>
      <div className="divide-y divide-border">
        {rows.map(({ label, value, mono }) => (
          <InfoRow key={label} label={label} value={value} mono={mono} />
        ))}
      </div>
    </div>
  );
}
