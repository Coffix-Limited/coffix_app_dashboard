import { db } from "@/app/lib/firebase";
import { collection, onSnapshot, orderBy, query, Unsubscribe } from "firebase/firestore";
import { Transaction } from "../interface/transaction";
import { Order } from "../interface/order";

export const TransactionService = {
  sendInvoice: async (transactionId: string, token: string): Promise<void> => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/transaction/invoice`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transactionId }),
      }
    );
    if (!res.ok) throw new Error(`Failed for ${transactionId}`);
  },


  listenToTransactions: (onUpdate: (items: Transaction[]) => void): Unsubscribe =>
    onSnapshot(
      query(collection(db, "transactions"), orderBy("createdAt", "desc")),
      (snap) => onUpdate(snap.docs.map((d) => ({ ...d.data(), docId: d.id }) as Transaction))
    ),

  listenToOrders: (onUpdate: (items: Order[]) => void): Unsubscribe =>
    onSnapshot(
      query(collection(db, "orders"), orderBy("createdAt", "desc")),
      (snap) => onUpdate(snap.docs.map((d) => ({ ...d.data(), docId: d.id }) as Order))
    ),
};
