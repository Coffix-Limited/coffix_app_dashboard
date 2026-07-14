import { db } from "@/app/lib/firebase";
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  onSnapshot,
  QuerySnapshot,
  setDoc,
  Unsubscribe,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { Product } from "../interface/product";
import { Modifier } from "../interface/modifier";
import { ModifierGroup } from "../interface/modifierGroup";
import { Category } from "../interface/category";

function snapToArray<T>(
  snapshot: QuerySnapshot<DocumentData, DocumentData>,
): T[] {
  return snapshot.docs.map((d) => ({ ...d.data(), docId: d.id })) as T[];
}

export const ProductService = {
  listenToProducts: (onUpdate: (products: Product[]) => void): Unsubscribe =>
    onSnapshot(collection(db, "products"), (snap) =>
      onUpdate(snapToArray<Product>(snap)),
    ),

  listenToModifiers: (onUpdate: (modifiers: Modifier[]) => void): Unsubscribe =>
    onSnapshot(collection(db, "modifiers"), (snap) =>
      onUpdate(snapToArray<Modifier>(snap)),
    ),

  listenToModifierGroups: (
    onUpdate: (groups: ModifierGroup[]) => void,
  ): Unsubscribe =>
    onSnapshot(collection(db, "modifierGroups"), (snap) =>
      onUpdate(snapToArray<ModifierGroup>(snap)),
    ),

  listenToCategories: (
    onUpdate: (categories: Category[]) => void,
  ): Unsubscribe =>
    onSnapshot(collection(db, "productCategories"), (snap) =>
      onUpdate(snapToArray<Category>(snap)),
    ),

  createProduct: async (data: Omit<Product, "docId">) => {
    const ref = doc(collection(db, "products")); // ✅ auto გენ ID

    await setDoc(ref, {
      ...data,
      docId: ref.id, // optional: store the ID inside the document
    });

    return ref;
  },

  updateProduct: (docId: string, data: Partial<Omit<Product, "docId">>) =>
    updateDoc(doc(db, "products", docId), data as DocumentData),

  deleteProduct: (docId: string) => deleteDoc(doc(db, "products", docId)),

  createModifier: async (data: Omit<Modifier, "docId">) => {
    const ref = doc(collection(db, "modifiers"));
    await setDoc(ref, {
      ...data,
      docId: ref.id,
    });
    return ref;
  },

  updateModifier: (docId: string, data: Partial<Omit<Modifier, "docId">>) =>
    updateDoc(doc(db, "modifiers", docId), data as DocumentData),

  deleteModifier: (docId: string) => deleteDoc(doc(db, "modifiers", docId)),

  createModifierGroup: async (data: Omit<ModifierGroup, "docId">) => {
    const ref = doc(collection(db, "modifierGroups"));
    await setDoc(ref, {
      ...data,
      docId: ref.id,
    });
    return ref;
  },

  updateModifierGroup: (
    docId: string,
    data: Partial<Omit<ModifierGroup, "docId">>,
  ) => updateDoc(doc(db, "modifierGroups", docId), data as DocumentData),

  // Deletes a modifier group along with its modifier documents and removes the
  // group ID from every product that references it — all in one atomic batch.
  deleteModifierGroupCascade: async (
    groupDocId: string,
    modifierIds: string[],
    affectedProductIds: string[],
  ) => {
    const batch = writeBatch(db);
    affectedProductIds.forEach((pid) =>
      batch.update(doc(db, "products", pid), {
        modifierGroupIds: arrayRemove(groupDocId),
      }),
    );
    modifierIds.forEach((mid) => batch.delete(doc(db, "modifiers", mid)));
    batch.delete(doc(db, "modifierGroups", groupDocId));
    await batch.commit();
  },

  createCategory: async (data: Omit<Category, "docId">) => {
    const ref = doc(collection(db, "productCategories"));
    await setDoc(ref, { ...data, docId: ref.id });
    return ref;
  },

  updateCategory: (docId: string, data: Partial<Omit<Category, "docId">>) =>
    updateDoc(doc(db, "productCategories", docId), data as DocumentData),

  deleteCategory: (docId: string) =>
    deleteDoc(doc(db, "productCategories", docId)),

  addModifierToGroup: (groupDocId: string, modifierDocId: string) =>
    updateDoc(doc(db, "modifierGroups", groupDocId), {
      modifierIds: arrayUnion(modifierDocId),
    }),

  removeModifierFromGroup: (groupDocId: string, modifierDocId: string) =>
    updateDoc(doc(db, "modifierGroups", groupDocId), {
      modifierIds: arrayRemove(modifierDocId),
    }),
};
