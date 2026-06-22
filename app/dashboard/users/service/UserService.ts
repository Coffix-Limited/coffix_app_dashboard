import { db } from "@/app/lib/firebase";
import {
  collection,
  doc,
  DocumentData,
  onSnapshot,
  Unsubscribe,
  updateDoc,
} from "firebase/firestore";
import { AppUser } from "../interface/user";
import { toDateSafe } from "@/app/utils/formatting";

export const UserService = {
  listenToUsers: (onUpdate: (users: AppUser[]) => void): Unsubscribe =>
    onSnapshot(collection(db, "customers"), (snap) => {
      const users = snap.docs.map((d) => {
        const data = d.data();
        return {
          ...data,
          docId: d.id,
          createdAt: toDateSafe(data.createdAt),
          lastLogin: toDateSafe(data.lastLogin),
          birthday: toDateSafe(data.birthday),
          creditExpiry: toDateSafe(data.creditExpiry),
        };
      }) as AppUser[];
      onUpdate(users);
    }),

  updateUser: (docId: string, data: Partial<Omit<AppUser, "docId">>) => {
    const clean = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    );
    return updateDoc(doc(db, "customers", docId), clean as DocumentData);
  },
};
