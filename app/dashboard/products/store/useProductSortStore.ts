import { create } from "zustand";

export type ProductSortKey = "name" | "price" | "cost" | "category";
export type SortDir = "asc" | "desc";

interface ProductSortStore {
  sortKey: ProductSortKey;
  sortDir: SortDir;
  toggleSort: (key: ProductSortKey) => void;
}

export const useProductSortStore = create<ProductSortStore>((set) => ({
  sortKey: "name",
  sortDir: "asc",
  toggleSort: (key) =>
    set((s) =>
      s.sortKey === key
        ? { sortDir: s.sortDir === "asc" ? "desc" : "asc" }
        : { sortKey: key, sortDir: "asc" },
    ),
}));
