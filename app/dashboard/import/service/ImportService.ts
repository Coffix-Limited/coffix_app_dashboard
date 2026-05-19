import { db } from "@/app/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { CollectionKey } from "../utils/csvParser";

export interface ImportError {
  docId: string;
  message: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  errors: ImportError[];
}

const CHUNK_SIZE = 499; // leave 1 op of headroom per batch

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function importRecords(
  col: CollectionKey,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  creates: Record<string, any>[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updates: Record<string, any>[],
): Promise<ImportResult> {
  const errors: ImportError[] = [];
  let created = 0;
  let updated = 0;

  // Verify all update docIds exist before batching
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const validUpdates: Record<string, any>[] = [];
  await Promise.all(
    updates.map(async (row) => {
      const snap = await getDoc(doc(db, col, row.docId));
      if (!snap.exists()) {
        errors.push({ docId: row.docId, message: "document not found" });
      } else {
        validUpdates.push(row);
      }
    }),
  );

  // Build all ops
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Op = { type: "set" | "update"; ref: any; data: Record<string, any> };
  const ops: Op[] = [];

  for (const row of creates) {
    const ref = doc(collection(db, col));
    ops.push({
      type: "set",
      ref,
      data: { ...row, docId: ref.id, createdAt: Timestamp.now() },
    });
  }

  for (const row of validUpdates) {
    const { docId, ...rest } = row;
    const ref = doc(db, col, docId);
    ops.push({ type: "update", ref, data: { ...rest, updatedAt: Timestamp.now() } });
  }

  // Commit in chunks of CHUNK_SIZE
  for (const chunkOps of chunk(ops, CHUNK_SIZE)) {
    const batch = writeBatch(db);
    for (const op of chunkOps) {
      if (op.type === "set") {
        batch.set(op.ref, op.data);
        created++;
      } else {
        batch.update(op.ref, op.data);
        updated++;
      }
    }
    await batch.commit();
  }

  return { created, updated, errors };
}
