import { schemas, CollectionKey, COLLECTION_KEYS } from "./importSchemas";

/** Human-friendly labels; falls back to a title-cased key for anything not listed. */
const LABEL_OVERRIDES: Partial<Record<CollectionKey, string>> = {
  productCategories: "Categories",
  modifierGroups: "Modifier Groups",
};

function titleCase(key: string): string {
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export const COLLECTION_LABELS = Object.fromEntries(
  COLLECTION_KEYS.map((key) => [key, LABEL_OVERRIDES[key] ?? titleCase(key)]),
) as Record<CollectionKey, string>;

/** Column headers for a collection: docId first, then every non-system field. */
export function templateHeaders(collection: CollectionKey): string[] {
  const fields = schemas[collection].fields;
  const keys = Object.keys(fields).filter((k) => !fields[k].system);
  return ["docId", ...keys];
}

export function generateTemplate(collection: CollectionKey): void {
  const headers = templateHeaders(collection);
  const csv = headers.join(",") + "\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${collection}-template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
