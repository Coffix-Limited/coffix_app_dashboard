import { CollectionKey } from "./csvParser";

const TEMPLATES: Record<CollectionKey, string[]> = {
  products: ["docId", "name", "price", "cost", "categoryId", "modifierGroupIds", "availableToStores", "disabledStores", "order", "imageUrl"],
  productCategories: ["docId", "name", "order"],
  modifiers: ["docId", "label", "groupId", "isDefault", "priceDelta", "cost"],
  modifierGroups: ["docId", "name", "required", "modifierIds"],
  coupons: ["docId", "code", "type", "amount", "expiryDate", "storeId", "usageLimit", "notes", "source"],
};

export const COLLECTION_LABELS: Record<CollectionKey, string> = {
  products: "Products",
  productCategories: "Categories",
  modifiers: "Modifiers",
  modifierGroups: "Modifier Groups",
  coupons: "Coupons",
};

export function generateTemplate(collection: CollectionKey): void {
  const headers = TEMPLATES[collection];
  const csv = headers.join(",") + "\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${collection}-template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
