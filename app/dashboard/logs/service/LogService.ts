import { db } from "@/app/lib/firebase";
import {
  collection,
  doc,
  DocumentData,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Unsubscribe,
} from "firebase/firestore";
import { GLOBAL_COLLECTION_LOG_ID } from "@/app/utils/constant";
import { Log } from "../interface/log";
import { LogSettings } from "../interface/logSettings";

const logSettingsRef = () => doc(db, "global", GLOBAL_COLLECTION_LOG_ID);

export const LogService = {
  listenToLogs: (onUpdate: (items: Log[]) => void): Unsubscribe =>
    onSnapshot(
      query(collection(db, "logs"), orderBy("time", "desc")),
      (snap) => onUpdate(snap.docs.map((d) => ({ ...d.data(), docId: d.id }) as Log))
    ),

  listenToLogSettings: (
    onUpdate: (settings: LogSettings | null) => void
  ): Unsubscribe =>
    onSnapshot(logSettingsRef(), (snap) => {
      if (snap.exists()) {
        onUpdate({ ...snap.data(), docId: snap.id } as LogSettings);
      } else {
        onUpdate(null);
      }
    }),

  updateLogSettings: (data: Partial<LogSettings>) =>
    setDoc(
      logSettingsRef(),
      { ...data, updatedAt: new Date() } as DocumentData,
      { merge: true }
    ),
};
