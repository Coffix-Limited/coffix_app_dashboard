export function escapeCSV(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

export function tsToISO(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && value !== null && "seconds" in value) {
    return new Date((value as { seconds: number }).seconds * 1000).toISOString().slice(0, 10);
  }
  return "";
}

export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | undefined | null)[][],
): void {
  const csv = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
