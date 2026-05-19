import Papa from "papaparse";

export type CollectionKey =
  | "products"
  | "productCategories"
  | "modifiers"
  | "modifierGroups"
  | "coupons";

export interface RowError {
  row: number;
  message: string;
}

export interface ParseResult<T> {
  creates: T[];
  updates: T[];
  errors: RowError[];
  fileError?: string;
}

const FORBIDDEN_FIELDS = [
  "createdAt",
  "updatedAt",
  "usageCount",
  "isUsed",
  "userIds",
  "fcmToken",
  "appVersion",
];

const FIELD_CONFIG: Record<
  CollectionKey,
  {
    required: string[];
    numbers: string[];
    booleans: string[];
    dates: string[];
    pipes: string[];
  }
> = {
  products: {
    required: ["name", "price"],
    numbers: ["price", "cost", "order"],
    booleans: [],
    dates: [],
    pipes: ["modifierGroupIds", "availableToStores", "disabledStores"],
  },
  productCategories: {
    required: ["name"],
    numbers: [],
    booleans: [],
    dates: [],
    pipes: [],
  },
  modifiers: {
    required: ["label"],
    numbers: ["priceDelta", "cost"],
    booleans: ["isDefault"],
    dates: [],
    pipes: [],
  },
  modifierGroups: {
    required: ["name"],
    numbers: [],
    booleans: ["required"],
    dates: [],
    pipes: ["modifierIds"],
  },
  coupons: {
    required: ["code"],
    numbers: ["amount", "usageLimit"],
    booleans: [],
    dates: ["expiryDate"],
    pipes: [],
  },
};

function parseBool(val: string): boolean | null {
  const v = val.trim().toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

function parseDate(val: string): Date | null {
  const d = new Date(val.trim());
  return isNaN(d.getTime()) ? null : d;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseCSV<T extends Record<string, any>>(
  csvText: string,
  collection: CollectionKey,
): ParseResult<T> {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (!result.data.length) {
    return { creates: [], updates: [], errors: [], fileError: "CSV file is empty or has no data rows." };
  }

  const headers = Object.keys(result.data[0]);
  const forbidden = headers.filter((h) => FORBIDDEN_FIELDS.includes(h));
  if (forbidden.length) {
    return {
      creates: [],
      updates: [],
      errors: [],
      fileError: `CSV contains forbidden system field(s): ${forbidden.join(", ")}. Remove these columns and re-upload.`,
    };
  }

  const config = FIELD_CONFIG[collection];
  const creates: T[] = [];
  const updates: T[] = [];
  const errors: RowError[] = [];

  result.data.forEach((rawRow, idx) => {
    const rowNum = idx + 2; // 1-based, +1 for header
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row: Record<string, any> = {};
    const rowErrors: string[] = [];

    for (const [key, raw] of Object.entries(rawRow)) {
      if (key === "docId") continue;
      const val = raw?.trim() ?? "";

      if (config.required.includes(key) && !val) {
        rowErrors.push(`"${key}" is required`);
        continue;
      }

      if (!val) continue;

      if (config.numbers.includes(key)) {
        const n = parseFloat(val);
        if (isNaN(n)) {
          rowErrors.push(`"${key}" must be a number (got "${val}")`);
          continue;
        }
        row[key] = n;
      } else if (config.booleans.includes(key)) {
        const b = parseBool(val);
        if (b === null) {
          rowErrors.push(`"${key}" must be true or false (got "${val}")`);
          continue;
        }
        row[key] = b;
      } else if (config.dates.includes(key)) {
        const d = parseDate(val);
        if (!d) {
          rowErrors.push(`"${key}" must be ISO 8601 date (got "${val}")`);
          continue;
        }
        row[key] = d;
      } else if (config.pipes.includes(key)) {
        row[key] = val.split("|").map((s) => s.trim()).filter(Boolean);
      } else {
        row[key] = val;
      }
    }

    if (rowErrors.length) {
      errors.push({ row: rowNum, message: rowErrors.join("; ") });
      return;
    }

    const docId = rawRow["docId"]?.trim() ?? "";
    if (docId) {
      updates.push({ ...row, docId } as unknown as T);
    } else {
      creates.push(row as unknown as T);
    }
  });

  return { creates, updates, errors };
}
